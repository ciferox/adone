const {
    stream: { pull: { pipe, ws2: ws } }
} = adone;
const WebSocket = require("ws");
const { consume } = require("streaming-iterables");

const server = require("./server")();

// connect to a server that does not exist, and check that it errors.
// should pass the error to both sides of the stream.
it("test error", async (done) => {
    let _err;
    try {
        await pipe(
            ["x", "y", "z"],
            (source) => {
                const stream = ws(new WebSocket(`ws://localhost:34897/${Math.random()}`));
                stream.sink(source).catch((err) => {
                    if (_err) {
                        assert.strictEqual(err.message, _err.message);
                        done();
                    }
                    _err = err;
                });
                return stream.source;
            },
            (source) => {
                return (async function* () {
                    try {
                        for await (const val of source) {
                            yield val;
                        }
                    } catch (err) {
                        if (_err) {
                            assert.strictEqual(err.message, _err.message);
                            done();
                        }
                        _err = err;
                    }
                })();
            },
            consume
        );
    } catch (err) {
        assert.ok(err);
        done();
    }
});

it("test connection error awaiting connected", async (done) => {
    try {
        await ws(new WebSocket(`ws://localhost:34897/${Math.random()}`)).connected();
    } catch (err) {
        assert.ok(err.message.includes("ECONNREFUSED"));
        done();
    }
});

it("test connection error in stream", async (done) => {
    try {
        await pipe(
            ws(new WebSocket(`ws://localhost:34897/${Math.random()}`)).source,
            consume
        );
    } catch (err) {
        assert.ok(err.message.includes("ECONNREFUSED"));
        done();
    }
});

it("close", () => {
    server.close();
});
