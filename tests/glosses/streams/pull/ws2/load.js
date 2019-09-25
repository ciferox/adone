const {
    stream: { pull: { pipe, ws2: WS } }
} = adone;

const { map, tap, consume } = require("streaming-iterables");

async function main() {
    const start = Date.now();

    var server = await WS.createServer(async (stream) => {
        let N = 0;
        await pipe(
            stream.source,
            tap((val) => {
                if (!(N % 1000)) {
                    console.log(N);
                }
                N++;
            }),
            consume
        );
        console.log(N, N / ((Date.now() - start) / 1000));
        server.close();
    }).listen(2134);

    pipe(
        Array.from(Array(10000), (_, i) => i),
        map((n) => "?"),
        WS.connect("ws://localhost:2134").sink
    );
}

main();
