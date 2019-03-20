export default function () {
    const a = adone.stream.pull.pair();
    const b = adone.stream.pull.pair();
    return [
        {
            source: a.source,
            sink: b.sink
        },
        {
            source: b.source,
            sink: a.sink
        }
    ];
}
