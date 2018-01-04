const { lazify } = adone;

lazify({
    server: "./server",
    client: "./client",
    x: "./x",
    Downloader: "./downloader"
}, exports, require);
