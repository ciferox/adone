const { writeEncoded } = require("../util.js");

const {
    async: { some },
    p2p: { Connection },
    stream: { pull: { lengthPrefixed, handshake } }
} = adone;

const selectHandler = function (rawConn, handlersMap/*, log*/) {
    const cb = (err) => {
        // incoming errors are irrelevant for the app
        // log.error(err);
    };

    const stream = handshake({ timeout: 60 * 1000 }, cb);
    const shake = stream.handshake;

    const next = function () {
        lengthPrefixed.decodeFromReader(shake, (err, data) => {
            if (err) {
                return cb(err);
            }
            // log("received:", data.toString());
            const protocol = data.toString().slice(0, -1);

            matcher(protocol, handlersMap, (err, result) => {
                if (err) {
                    return cb(err);
                }
                const key = result;

                if (key) {
                    // log(`send ack back of: ${protocol}`);
                    writeEncoded(shake, data, cb);

                    const conn = new Connection(shake.rest(), rawConn);
                    handlersMap[key].handlerFunc(protocol, conn);
                } else {
                    // log(`not supported protocol: ${protocol}`);
                    writeEncoded(shake, Buffer.from("na\n"));
                    next();
                }
            });
        });
    };

    next();
    return stream;
};

function matcher(protocol, handlers, callback) {
    const supportedProtocols = Object.keys(handlers);
    let supportedProtocol = false;

    some(supportedProtocols,
        (sp, cb) => {
            handlers[sp].matchFunc(sp, protocol, (err, result) => {
                if (err) {
                    return cb(err);
                }
                if (result) {
                    supportedProtocol = sp;
                }
                cb();
            });
        },
        (err) => {
            if (err) {
                return callback(err);
            }
            callback(null, supportedProtocol);
        }
    );
}

module.exports = selectHandler;
