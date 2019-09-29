const {
    is
} = adone;

const crypto = require("crypto");

function sha1(bytes) {
    if (is.function(Buffer.from)) {
    // Modern Buffer API
        if (is.array(bytes)) {
            bytes = Buffer.from(bytes);
        } else if (is.string(bytes)) {
            bytes = Buffer.from(bytes, "utf8");
        }
    } else {
    // Pre-v4 Buffer API
        if (is.array(bytes)) {
            bytes = new Buffer(bytes);
        } else if (is.string(bytes)) {
            bytes = new Buffer(bytes, "utf8");
        }
    }

    return crypto.createHash("sha1").update(bytes).digest();
}

module.exports = sha1;
