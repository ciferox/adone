const lsReadableStream = require("./ls-readable-stream");

const {
    stream: { pull: { streamToPullStream } }
} = adone;


module.exports = (send) => {
    return (args, opts) => {
        opts = opts || {};

        return streamToPullStream.source(lsReadableStream(send)(args, opts));
    };
};
