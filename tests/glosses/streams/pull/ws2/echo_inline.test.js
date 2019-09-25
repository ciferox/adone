const {
    stream: { pull: { ws2: WS, pipe } }
} = adone;

const ndjson = require("iterable-ndjson");
const { map, collect } = require("streaming-iterables");

it("simple echo server", async () => {
    const server = await WS.createServer((stream) => {
        pipe(stream, stream);
    }).listen(5678);

    const ary = await pipe(
        [1, 2, 3],
        // need a delay, because otherwise ws hangs up wrong.
        // otherwise use pull-goodbye.
        map((val) => new Promise((resolve) => setTimeout(() => resolve(val), 10))),
        ndjson.stringify,
        WS.connect("ws://localhost:5678"),
        ndjson.parse,
        collect
    );

    assert.deepEqual(ary, [1, 2, 3]);
    await server.close();
});
