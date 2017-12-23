const {
    stream: {
        pull: { defer }
    }
} = adone;

export default function () {
    const source = defer.source();
    const sink = defer.sink();

    return {
        source,
        sink,
        resolve(duplex) {
            source.resolve(duplex.source);
            sink.resolve(duplex.sink);

        }
    };
};
