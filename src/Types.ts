export interface JellyfinWebhookNotification {
    type: string; // Corresponds to "{{NotificationType}}"
    itemType: string; // Corresponds to "{{ItemType}}"
    serverUrl: string; // Jellyfin server URL
    itemId: string; // Corresponds to "{{ItemId}}"
    image: string; // URL for item image
    title: string; // Item name
    imdb: string; // Corresponds to "{{Provider_imdb}}" aka IMDb ID 
    bSeries: boolean; // Indicates if the notification is related to a series
    series?: {
        id: string; // Series ID
        image: string; // URL for series image
        title: string; // Series name
        season: string; // Season number
        episode: string; // Episode number
    };
    playbackPosition: string; // Playback position
    runTime: string; // Runtime as a string
    runTimeTicks: string; // Runtime in ticks
    bPaused: boolean; // Indicates if playback is paused
    bPlayedToCompletion?: boolean; // Indicates if playback was completed (only for 'PlaybackStop' notifications)
    timestamp: string; // Notification timestamp
    user: string; // Username
    userId: string; // User ID
}

export interface DatabaseDocument {
    jfContentId: string; // Jellyfin's Content ID
    mediaId: string; // Discord's Media ID
    mediaProxyLink: string; // Discord's Media Proxy Link
    mediaProxyExpiry: number; // Discord's Media Proxy Expiry, saved to refresh the image instead of sending it again
}