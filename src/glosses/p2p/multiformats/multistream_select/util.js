const pull = require("pull-stream/pull");
const values = require("pull-stream/sources/values");
const collect = require("pull-stream/sinks/collect");
const pullLP = require("pull-length-prefixed");
const debug = require("debug");

const {
    is
} = adone;

exports = module.exports;

const randomId = () => ((~~(Math.random() * 1e9)).toString(36));

// prefixes a message with a varint
// TODO this is a pull-stream 'creep' (pull stream to add a byte?')
const encode = function (msg, callback) {
    pull(
        values(is.buffer(msg) ? [msg] : [Buffer.from(msg)]),
        pullLP.encode(),
        collect((err, encoded) => {
            if (err) {
                return callback(err);
            }
            callback(null, encoded[0]);
        })
    );
};

exports.writeEncoded = (writer, msg, callback) => {
    encode(msg, (err, msg) => {
        if (err) {
            return callback(err);
        }
        writer.write(msg);
    });
};

const createLogger = function (type) {
    const rId = randomId();

    const printer = function (logger) {
        return (msg) => {
            if (is.array(msg)) {
                msg = msg.join(" ");
            }
            logger("(%s) %s", rId, msg);
        };
    };

    const log = printer(debug(`mss:${type}`));
    log.error = printer(debug(`mss:${type}:error`));

    return log;
};

exports.log = {};

exports.log.dialer = () => {
    return createLogger("dialer\t");
};
exports.log.listener = () => {
    return createLogger("listener\t");
};
