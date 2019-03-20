const {
    stream: { pull }
} = adone;
const { write: pullWrite, pushable: pullPushable } = pull;

module.exports = function createBuildStream(createStrategy, _ipld, options) {
    const source = pullPushable()

    const sink = pullWrite(
        createStrategy(source),
        null,
        options.highWaterMark,
        (err) => source.end(err)
    )

    return {
        source: source,
        sink: sink
    }
}
