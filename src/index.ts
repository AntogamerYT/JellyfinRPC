import 'dotenv/config';
import fastify, { FastifyRequest } from "fastify";
import { Client, RPCActivity, RPCActivityOptions } from 'minigatewaylib';
import sqlite3 from 'sqlite3';
import { Database } from './utils/Database.js';
import { Jellyfin } from './utils/Jellyfin.js';
import { warning, error, success, debug, info, verbosityLevels } from './utils/Logger.js';
import { JellyfinWebhookNotification } from './Types.js';
import { RPCActivityType } from 'minigatewaylib';
import { removeHost } from './utils/Misc.js';

info('Starting Jellyfin-RPC.', 'default');

const app = fastify();

const db = new sqlite3.Database('images.db');
db.run("CREATE TABLE IF NOT EXISTS images ('jfContentId' TEXT PRIMARY KEY, 'mediaId' TEXT, 'mediaProxyLink' TEXT, 'mediaProxyExpiry' INTEGER)")
const jellyfin = new Jellyfin(db);

if (!process.env.BOT_TOKEN) {
    error('BOT_TOKEN is missing from the environment variables.', 'none');
    process.exit(1);
}

if (!process.env.BOT_ID) {
    error('BOT_ID is missing from the environment variables.', 'none');
    process.exit(1);
}

if (!process.env.CHANNEL_ID) {
    error('CHANNEL_ID is missing from the environment variables.', 'none');
    process.exit(1);
}

if (!process.env.ACCOUNT_TOKEN) {
    error('ACCOUNT_TOKEN is missing from the environment variables.', 'none');
    process.exit(1);
}

if (!process.env.VERBOSITY) {
    warning('VERBOSITY is missing from the environment variables. Defaulting to default', 'errors');
    process.env.VERBOSITY = "default";
} else if (!verbosityLevels.includes(process.env.VERBOSITY)) {
    error('VERBOSITY is not a valid verbosity level.', 'none');
    process.exit(1);
}

if (!process.env.PORT) {
    warning('PORT is missing from the environment variables, defaulting to 3000.', 'errors');
}

if (!process.env.HOST) {
    warning('HOST is missing from the environment variables, defaulting to 127.0.0.1.', 'errors');
}


if (!process.env.ENABLE_AUTH) {
    error('ENABLE_AUTH is missing from the environment variables.', 'none');
    process.exit(1);
} else if (process.env.ENABLE_AUTH === "true" && process.env.AUTH_KEY) {
    info('Authentication is enabled.', 'default');
    app.addHook("preHandler", async (req, res) => {
        info(`${req.method} ${req.url} from ${req.ip}.`, 'detailed');
        if (req.headers["authorization"] !== `${process.env.AUTH_KEY}`) {
            info(`Authentication failed from ${req.ip}.`, 'default');
            return res.status(401).send({ message: "Unauthorized" });
        }
    })
}

const client = new Client(process.env.ACCOUNT_TOKEN);

client.on('ready', () => {
    info(`Discord client is ready as ${client.user.username}.`, 'default');
});

client.on("resumed", () => {
    info("Discord client has reconnected to the gateway.", 'default');
})

// Used to keep track of the last pause state, so that we don't spam the Discord Gateway with RPC updates on PlaybackProgress
let lastPauseState: boolean | null = null;

app.post("/jellyfin/webhook", async (req: FastifyRequest<{ Body: string }>, res) => {
    
    if (process.env.ENABLE_AUTH === "true" && (!req.headers["authorization"] || req.headers["authorization"] !== `${process.env.AUTH_KEY}`)) {
        info(`Unauthorized access attempt from ${req.ip}.`, 'default');
        return res.status(401).send({ message: "Unauthorized" });
    }

    let body: JellyfinWebhookNotification;
    try {
        body = JSON.parse(req.body);
    } catch (e) {
        error(`Failed to parse the request body: ${e}`, 'errors');
        return res.status(400).send({ message: "Invalid JSON" });
    }

    if (!jellyfin.apiBaseUrl) {
        jellyfin.setApiBaseUrl(body.serverUrl);
    }

    switch (body.type) {
        case "PlaybackProgress":
        case "PlaybackStart": {
            const contentId = body.itemId;
            
            let seriesImage = ""; 
            const contentImage = await jellyfin.getImage(contentId);

            // We do this so that if it'sa series we swap the small and large images (it just looks better trust the process)
            const RpcImages: { large: string, small: string } = { large: removeHost(contentImage), small: "" };

            if (body.type === "PlaybackProgress") {
                if (lastPauseState === body.bPaused) {
                    return;
                }
                lastPauseState = body.bPaused;
            }

            info(`Client has started watching ${body.title}.`, 'detailed');

            if (body.bSeries && body.series) {
                const series = body.series;
                seriesImage = await jellyfin.getImage(series.id);
                RpcImages.small = RpcImages.large;
                RpcImages.large = removeHost(seriesImage);
            }

            const now = Date.now();
            const contentEndTime = body.runTime.split(":").map(Number);
            const currentTime = body.playbackPosition.split(":").map(Number);
            const totalSeconds = contentEndTime[0] * 3600 + contentEndTime[1] * 60 + contentEndTime[2];
            const currentSeconds = currentTime[0] * 3600 + currentTime[1] * 60 + currentTime[2];


            const activity: RPCActivityOptions["activities"][0] = {
                applicationId: process.env.BOT_ID,
                name: body.bSeries ? `${body.series?.title}` : body.title,
                type: RPCActivityType.Watching,
                details: body.bSeries ? `S${body.series?.season}E${body.series?.episode} - ${body.title}` : "",
                state: body.bPaused ? "Paused" : "",
                assets: {
                    largeImage: `mp:${RpcImages.large}`,
                    largeText: body.bSeries ? body.series?.title! : body.title,
                    smallImage: RpcImages.small ? `mp:${RpcImages.small}` : "",
                    smallText: body.bSeries ? body.title : "",
                },
                timestamps: {
                    start: now - currentSeconds * 1000,
                    end: now + (totalSeconds - currentSeconds) * 1000
                }
            }

            // Needed to remove empty properties from the object
            function cleanObject(obj: any): void {
                Object.keys(obj).forEach(key => {
                    if (obj[key] && typeof obj[key] === 'object') {
                        cleanObject(obj[key]);
                    } else if (obj[key] === null || obj[key] === "") {
                        delete obj[key];
                    }
                });
            }

            cleanObject(activity);

            const rpc = new RPCActivity({
                status: "idle",
                afk: false,
                activities: [activity]
            });

            debug(`Sending RPC: ${JSON.stringify(rpc.getPayload())}`, 'detailed');
            await client.rpc.setActivity(rpc);

            break;
        }
        case "PlaybackStop": {
            info("Playback has stopped, clearing the RPC.", 'default');
            const rpc = new RPCActivity({
                status: "invisible",
                afk: false,
                activities: []
            });

            client.rpc.setActivity(rpc);
            break;
        }
    }
})

await client.login()

app.listen({ port: parseInt(process.env.PORT || "3000"), host: process.env.HOST || "127.0.0.1" }, (err, address) => {
    if (err) {
        error(`Failed to start the server: ${err}`, 'errors');
        process.exit(1);
    }
    success(`Server is now listening on ${address}.`, 'default');
});

process.on("SIGINT", () => {
    info("Received SIGINT, shutting down gracefully.", 'default');

    if (client.gateway.ready) {
        client.logout();
    }

    process.exit(0)
})



declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string;
            BOT_ID: string;
            CHANNEL_ID: string;
            ACCOUNT_TOKEN: string;
            VERBOSITY: string;
            ENABLE_AUTH: string;
            AUTH_KEY: string;
            HOST: string;
            PORT: string;   
        }
    }
}