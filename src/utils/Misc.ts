

export function removeHost(url: string) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
    } catch (e) {
        return url;
    }
}