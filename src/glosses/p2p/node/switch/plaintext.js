

const setImmediate = require("async/setImmediate");

/**
 * An encryption stub in the instance that the default crypto
 * has not been overriden for the Switch
 */
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
