import { warning } from "./Logger.js";


export class Discord {
    public static uploadInProgress: string[] = [];
    public static refreshInProgress: string[] = [];
    public static uploadInProgressSet = new Set<string>();

    public static async uploadImage(url: string, fileName: string): Promise<{ id: string, url: string }> {
        this.uploadInProgress.push(fileName);
        const imageBytes = await fetch(url).then(res => res.arrayBuffer());
        
        const attachment = await fetch(`https://discord.com/api/v9/channels/${process.env.CHANNEL_ID}/attachments`, {
            method: "POST",
            body: JSON.stringify({
                files: [
                    {
                        filename: fileName,
                        file_size: imageBytes.byteLength,
                        id: 0
                    }
                ]
            }),
            headers: {
                "Authorization": `Bot ${process.env.BOT_TOKEN}`,
                "Content-Type": "application/json"
            }
        })



        if (!attachment.ok) {
            
            warning(`Failed to upload image ${fileName}, got ${attachment.status} ${attachment.statusText}`, "errors");
            return { id: "", url: "" };
        }

        const attachmentJson = await attachment.json();

        await fetch(attachmentJson.attachments[0].upload_url, { method: "PUT", body: imageBytes });

        const message = await fetch(`https://discord.com/api/v9/channels/${process.env.CHANNEL_ID}/messages`, {
            method: "POST",
            body: JSON.stringify({
                attachments: [
                    {
                        id: 0,
                        filename: fileName,
                        "uploaded_filename": attachmentJson.attachments[0].upload_filename
                    }
                ]
            }),
            headers: {
                Authorization: `Bot ${process.env.BOT_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        if (!message.ok) {
            warning(`Failed to send message with image ${attachmentJson.attachments[0].id} for ${fileName.replace(".png", "")}, got ${message.status} ${message.statusText}`, "errors");
            return { id: "", url: "" };
        }

        const messageJson = await message.json();

        this.uploadInProgress = this.uploadInProgress.filter(file => file !== fileName);

        return { id: messageJson.attachments[0].id, url: messageJson.attachments[0].url };
    }

    public static async refreshImage(url: string): Promise<string> {
        this.refreshInProgress.push(url);
        
        const req = await fetch("https://discord.com/api/v9/attachments/refresh-urls", {
            method: "POST",
            body: JSON.stringify({
                attachment_urls: [url]
            }),
            headers: {
                "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json"
            }
        })

        if (!req.ok) {
            warning(`Failed to refresh image ${url}`, "errors");
            return "";
        }

        const json = await req.json();
        this.refreshInProgress = this.refreshInProgress.filter(u => u !== url);

        return json.refreshed_urls[0].refreshed;
    }

}