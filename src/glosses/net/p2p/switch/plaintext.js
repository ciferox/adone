const {
    is
} = adone;

module.exports = {
    tag: "/plaintext/1.0.0",
    encrypt(myId, conn, remoteId, callback) {
        if (is.function(remoteId)) {
            callback = remoteId;
            remoteId = undefined;
        }

        setImmediate(() => callback());
        return conn;
    }
};
