const {
    p2p: { stream: { pull, ws } }
} = adone;

const start = Date.now();

const server = ws.createServer((stream) => {
    let N = 0;
    pull(stream, pull.drain((n) => {
        if (!(N % 1000)) {
            // console.log(N);
        }
        N++;
    }, () => {
        // console.log(N, N / ((Date.now() - start) / 1000));
        server.close();
    }));
}).listen(2134);

pull(
    pull.count(10000),
    pull.map((n) => {
        return "?";
    }),
    ws.connect("ws://localhost:2134")
);
