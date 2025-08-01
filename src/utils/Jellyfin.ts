import { DatabaseDocument } from "../Types";
import { Database } from "./Database.js";
import { Discord } from "./Discord.js";
import { warning, error, success, debug, info } from './Logger.js';

import sqlite3 from "sqlite3";

export class Jellyfin {

    readonly db: sqlite3.Database;
    apiBaseUrl: string = "";


    constructor(db: sqlite3.Database) {
        this.db = db;
    }

    public setApiBaseUrl(url: string): void {
        this.apiBaseUrl = url;
    }

    public async getImage(contentId: string): Promise<string> {
        const row: DatabaseDocument = await Database.fetchFirst(this.db, "SELECT * FROM images WHERE jfContentId = ?", [contentId]);
        // Use a Set to track uploads in progress for better performance and atomicity
        const inProgressSet: Set<string> = Discord.uploadInProgressSet;

        if (!row && !inProgressSet.has(contentId)) {
            debug(`No image found for ${contentId}, uploading to Discord`, "detailed");
            inProgressSet.add(contentId);
            try {
                const discordImage = await Discord.uploadImage(`${this.apiBaseUrl}/Items/${contentId}/Images/Primary`, `${contentId}.png`);

                if (!discordImage.id) {
                    warning(`Failed to upload image for ${contentId}`, "errors");
                    return "";
                }

                const expiry = Number("0x" + new URL(discordImage.url).searchParams.get("ex")) * 1000;
                this.db.run("INSERT OR IGNORE INTO images ('jfContentId', 'mediaId', 'mediaProxyLink', 'mediaProxyExpiry') VALUES (?, ?, ?, ?)", [contentId, discordImage.id, discordImage.url, expiry]);
                return discordImage.url;
            } finally {
                inProgressSet.delete(contentId);
            }
        } else if (row && !inProgressSet.has(contentId)) {
            debug(`Image found for ${contentId}, checking expiry`, "detailed");

            let expiry = row.mediaProxyExpiry;
            debug(`${contentId} image expiry: ${expiry}`, "detailed");

            if (expiry < Date.now()) {
                debug(`Image for ${contentId} has expired, refreshing`, "detailed");
                inProgressSet.add(contentId);
                try {
                    const refreshed = await Discord.refreshImage(row.mediaProxyLink);

                    if (!refreshed) {
                        warning(`Failed to refresh image for ${contentId}`, "errors");
                        return "";
                    }
                    
                    const newExpiry = Number("0x" + new URL(refreshed).searchParams.get("ex")) * 1000 + Date.now();
                    this.db.run("UPDATE images SET mediaProxyLink = ?, mediaProxyExpiry = ? WHERE jfContentId = ?", [refreshed, newExpiry, contentId]);
                    return refreshed;
                } finally {
                    inProgressSet.delete(contentId);
                }
            }

            return row.mediaProxyLink;
        } else {
            warning(`Image for ${contentId} is already being uploaded or refreshed`, "errors");
            return "";
        }

    }




}