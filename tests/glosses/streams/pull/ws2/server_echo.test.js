const {
    stream: { pull: { pipe, ws2: WS } }
} = adone;

const ndjson = require("iterable-ndjson");
const { map, collect } = require("streaming-iterables");

it("simple echo server", async () => {
    const server = WS.createServer(async (stream) => {
        await pipe(stream, stream);
    });

    await server.listen(5678);

    const stream = WS.connect("ws://localhost:5678");

    const ary = await pipe(
        [1, 2, 3],
        // need a delay, because otherwise ws hangs up wrong.
        // otherwise use pull-goodbye.
        map((val) => new Promise((resolve) => setTimeout(() => resolve(val), 10))),
        ndjson.stringify,
        stream,
        ndjson.parse,
        collect
    );

    await server.close();

    assert.deepEqual(ary, [1, 2, 3]);
});
