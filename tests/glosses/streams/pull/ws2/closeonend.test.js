const {
    assertion,
    stream: { pull: { pipe, ws2: ws } }
} = adone;
assertion.use(assertion.extension.checkmark);

const WebSocket = require("ws");
const { tap, consume } = require("streaming-iterables");
const endpoint = `${require("./helpers/wsurl")}/echo`;

const server = require("./server")();

it("websocket closed when pull source input ends", (done) => {
    const socket = new WebSocket(endpoint);

    pipe(ws.source(socket), consume).then(() => {
        done();
    });

    pipe(
        ["x", "y", "z"],
        ws(socket, { closeOnEnd: true })
    );
});

it("closeOnEnd=false, stream doesn't close", (done) => {
    const socket = new WebSocket(endpoint);

    expect(3).checks(done);
    pipe(
        ws.source(socket),
        tap((item) => {
            expect(item).to.be.ok.mark();
        }),
        consume
    );

    pipe(
        ["x", "y", "z"],
        ws(socket, { closeOnEnd: false })
    );
});

it("close", () => {
    server.close();
});
