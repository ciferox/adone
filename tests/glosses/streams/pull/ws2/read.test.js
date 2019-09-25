const {
    stream: { pull: { pipe } }
} = adone;

const WebSocket = require("ws");
const { collect } = require("streaming-iterables");
const endpoint = `${require("./helpers/wsurl")}/read`;

const srcPath = (...args) => adone.getPath("src/glosses/streams/pull/ws2", ...args);
const ws = require(srcPath("source"));
let socket;

const server = require("./server")();

it("create a websocket connection to the server", (done) => {
    socket = new WebSocket(endpoint);
    socket.onopen = () => done();//t.pass.bind(t, "socket ready");
});

it("read values from the socket and end normally", async () => {
    const values = await pipe(ws(socket), collect);
    assert.deepEqual(values, ["a", "b", "c", "d"]);
});

it("read values from a new socket and end normally", async () => {
    const values = await pipe(ws(new WebSocket(endpoint)), collect);
    assert.deepEqual(values, ["a", "b", "c", "d"]);
});

it("close", () => {
    server.close();
});
