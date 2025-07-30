# Jellyfin RPC
A Userbot-powered RPC program for Jellyfin! No Discord client required!

[!CAUTION]
While I never had any issues with this program after using it for a few months, I cannot guarantee that your account will be 100% safe as userbots are against the [Discord TOS](https://discord.com/terms), therefore **I don't take any responsibility for blocked Discord accounts in case a block might happen!**

## Setting up
You will need:
- [Jellyfin Webhook](https://github.com/jellyfin/jellyfin-plugin-webhook)
- NodeJS 18+
- Your Discord account's token
- A Discord bot's token
- A Discord server

Steps:
1. Clone (or download) this repo
2. In the JellyfinRPC folder, install all the Node modules via the `npm install` command.
3. Make a copy of the `.env.example` file and rename it into `.env`, then fill all the needed details:
    - If you need help getting your Account token, check [Getting your account token](#getting-your-account-token) 
    - If you need help getting your Bot token, check [Getting a Discord Bot token](#getting-a-discord-bot-token)
    - Finally, if you need help getting your channel ID, check [Getting a channel ID](#getting-a-channel-id)
4. Run `npm start`

JellyfinRPC should now be listening on the port you specified in the .env file!

Now that the JellyfinRPC setup is done, you will need to move over to Jellyfin:
1. On Jellyfin, press your profile icon and go in the Dashboard
2. Go to **My Plugins** and click on **Webhook**
    - If you don't have Webhook installed, click on the **Catalog** and search for it, then install it and restart your Jellyfin server as specified.
3. Set your server url to something that you know the device that's running JellyfinRPC can access. If both programs are running on the same machine, then the URL (if you haven't changed your port) will be `http://127.0.0.1:8096`
    - If the programs are running on separate networks, then the URL needs to be something accessible over the Internet.
4. Add a Generic Destination
5. Insert the Webhook Url
    - As above, the same rules apply (make sure you use JellyfinRPC's port and not Jellyfin's)
    - Example URL: `http://127.0.0.1:3000/jellyfin/webhook`
    - NOTE: **`/jellyfin/webhook` IS REQUIRED!** Changing this part will cause JellyfinRPC to not receive any events.
6. Add the following Notification Types:
    - Playback Progress
    - Playback Start
    - Playback Stop
7. Add an User Filter based on the profile you use to watch your content, if you have multiple profiles.
    - Adding multiple profiles will most likely cause your users fighting when JellyfinRPC receives an event, meaning that your presence may change if there's another user watching a content while you're watching something.
8. Add the following Item Types:
    - Movies
    - Episodes
    - Series
    - Other media types are currently not supported and will cause JellyfinRPC to crash. Support for them will be added in the future.
9. Get the Template from [templates/movies_and_series.handlebars](templates/movie_and_series.handlebars) and paste it in the text box.
10. If you set up an auth key, set add the following Request Header:
    - Key: Authorization
    - Value: {your AUTH_KEY}
11. Press Save

Done! If done correctly, your JellyfinRPC should start receiving events from Jellyfin and update your Discord presence accordingly.

### Getting your account token

To get your account token, you will need to use your browser (or your Discord client)'s DevTools:
- Open DevTools (`F12`/`CTRL+SHIFT+I`)
- Go into the Network tab
- On Discord, open any kind of channel
- In all of the requests, you will see a `messages?limit={limit}` request, click on it and look at the Request Headers:
    - In the `Authorization` header, you should see a token: that's your account token!
    - Example: ![](readme/YourToken.png)

### Getting a Discord Bot token
JellyfinRPC requires a Bot token to upload and refresh an image's link (like a movie's image), this is required as Discord forces you to use a Discord CDN link when setting an image in your RPC.

Fortunately, this is way easier than getting an account token:
- Go to your [Discord Developers Dashboard](https://discord.com/developers/applications)
- Create a New Application (or use an existing one if you'd like)
- In your application, go to the `Bot` tab and press `Reset Token`
    - A 2FA code may be required if you have it set up in your account
    - Example: ![](readme/YourBotToken.png)
- You now have your Bot token!

### Getting a channel ID
TODO


