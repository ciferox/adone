const writeEncoded = require("../util.js").writeEncoded;
const some = require("async/some");

const {
    netron2: { Connection },
    stream: { pull }
} = adone;

const matcher = function (protocol, handlers, callback) {
    const supportedProtocols = Object.keys(handlers);
    let supportedProtocol = false;

    some(supportedProtocols, (sp, cb) => {
        handlers[sp].matchFunc(sp, protocol, (err, result) => {
            if (err) {
                return cb(err);
            }
            if (result) {
                supportedProtocol = sp;
            }
            cb();
        });
    }, (err) => {
        if (err) {
            return callback(err);
        }
        callback(null, supportedProtocol);
    });
};

const selectHandler = function (rawConn, handlersMap, log) {
    const cb = (err) => {
        // incoming errors are irrelevant for the app
        log.error(err);
    };

    const stream = pull.handshake({ timeout: 60 * 1000 }, cb);
    const shake = stream.handshake;

    const next = function () {
        pull.lengthPrefixed.decodeFromReader(shake, (err, data) => {
            if (err) {
                return cb(err);
            }
            log("received:", data.toString());
            const protocol = data.toString().slice(0, -1);

            matcher(protocol, handlersMap, (err, result) => {
                if (err) {
                    return cb(err);
                }
                const key = result;

                if (key) {
                    log(`send ack back of: ${protocol}`);
                    writeEncoded(shake, data, cb);

                    const conn = new Connection(shake.rest(), rawConn);
                    handlersMap[key].handlerFunc(protocol, conn);
                } else {
                    log(`not supported protocol: ${protocol}`);
                    writeEncoded(shake, Buffer.from("na\n"));
                    next();
                }
            });
        });
    };

    next();
    return stream;
};

module.exports = selectHandler;
