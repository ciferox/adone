const {
    p2p: { stream: { defer, streamToPullStream } }
} = adone;

module.exports = (send) => {
    return (args, opts) => {
        opts = opts || {};

        const p = defer.source();

        send({
            path: "files/read",
            args,
            qs: opts
        }, (err, stream) => {
            if (err) {
                return p.abort(err);
            }

            p.resolve(streamToPullStream(stream));
        });

        return p;
    };
};
