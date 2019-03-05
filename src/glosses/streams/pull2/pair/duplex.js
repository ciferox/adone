export default function () {
    const a = adone.stream.pull2.pair();
    const b = adone.stream.pull2.pair();
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
