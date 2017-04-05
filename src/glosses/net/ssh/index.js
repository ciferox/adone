adone.lazify({
    Channel: "./channel",
    Client: "./client",
    Session: "./session",
    Server: "./server",
    stream: () => adone.lazify({
        util: "./streams/utils",
        SFTPStream: "./streams/sftp",
        SSH2Stream: "./streams/ssh",
        const: "./streams/constants",
        keyParser: "./streams/keyParser"
    }, null, require)
}, exports, require);
