const lsReadableStream = require("./ls-readable-stream");

const {
    p2p: { stream: { streamToPullStream } }
} = adone;


module.exports = (send) => {
    return (args, opts) => {
        opts = opts || {};

        return streamToPullStream.source(lsReadableStream(send)(args, opts));
    };
};
