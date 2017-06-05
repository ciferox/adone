const { lazify } = adone;

lazify({
    server: "./server",
    client: "./client",
    x: "./x"
}, exports, require);
