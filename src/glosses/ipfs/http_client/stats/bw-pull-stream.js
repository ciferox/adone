const transformChunk = require("./bw-util");

const {
    stream: { pull2: pull }
} = adone;
const { defer, streamToPullStream, map } = pull;

module.exports = (send) => {
    return (opts) => {
        opts = opts || {};

        const p = defer.source();

        send({
            path: "stats/bw",
            qs: opts
        }, (err, stream) => {
            if (err) {
                return p.end(err);
            }

            p.resolve(pull(
                streamToPullStream.source(stream),
                map(transformChunk)
            ));
        });

        return p;
    };
};
