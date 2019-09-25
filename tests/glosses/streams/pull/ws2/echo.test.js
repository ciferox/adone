const {
    assertion,
    stream: { pull: { ws2: ws, pipe, goodbye } }
} = adone;
assertion.use(assertion.extension.checkmark);

const WebSocket = require("ws");
const url = `${require("./helpers/wsurl")}/echo`;
const { tap, consume } = require("streaming-iterables");

const server = require("./server")();

it("setup echo reading and writing", (done) => {
    const socket = new WebSocket(url);
    const expected = ["x", "y", "z"];

    expect(expected.length).checks(done);

    pipe(
        ws.source(socket),
        tap((value) => {
            console.log(value);
            expect(value).to.be.equal(expected.shift()).mark();
        }),
        consume
    );

    pipe(
        [].concat(expected),
        ws.sink(socket, { closeOnEnd: false })
    );
});

it("duplex style", (done) => {
    const expected = ["x", "y", "z"];
    const socket = new WebSocket(url);

    expect(expected.length).checks(done);

    pipe(
        [].concat(expected),
        ws(socket, { closeOnEnd: false }),
        tap((value) => {
            console.log("echo:", value);
            expect(value).to.be.equal(expected.shift()).mark();
        }),
        consume
    );
});

it("duplex with goodbye handshake", async () => {
    const expected = ["x", "y", "z"];
    const socket = new WebSocket(url);

    const pws = ws(socket);

    await pipe(
        pws,
        goodbye({
            source: [].concat(expected),
            sink: (source) => pipe(
                source,
                tap((value) => assert.equal(value.toString(), expected.shift())),
                consume
            )
        }),
        pws
    );
});

it("close", () => {
    server.close();
});
