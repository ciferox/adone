const streamPair = require("stream-pair");

const {
    net: { spdy: transport }
} = adone;

describe("SPDY Transport", () => {
    let server = null;
    let client = null;

    beforeEach(() => {
        const pair = streamPair.create();

        server = transport.Connection.create(pair, {
            protocol: "spdy",
            windowSize: 256,
            isServer: true,
            autoSpdy31: true
        });

        client = transport.Connection.create(pair.other, {
            protocol: "spdy",
            windowSize: 256,
            isServer: false,
            autoSpdy31: true
        });
    });

    describe("autoSpdy31", () => {
        it("should automatically switch on server", (done) => {
            server.start(3);
            assert.equal(server.getVersion(), 3);

            client.start(3.1);

            server.on("version", () => {
                assert.equal(server.getVersion(), 3.1);
                done();
            });
        });
    });

    describe("version detection", () => {
        it("should detect v2 on server", (done) => {
            client.start(2);

            server.on("version", () => {
                assert.equal(server.getVersion(), 2);
                done();
            });
        });

        it("should detect v3 on server", (done) => {
            client.start(3);

            server.on("version", () => {
                assert.equal(server.getVersion(), 3);
                done();
            });
        });
    });

    it("it should not wait for id=0 WINDOW_UPDATE on v3", (done) => {
        client.start(3);

        const buf = Buffer.alloc(64 * 1024);
        buf.fill("x");

        client.request({
            method: "POST",
            path: "/",
            headers: {}
        }, (err, stream) => {
            assert(!err);

            stream.write(buf);
            stream.write(buf);
            stream.write(buf);
            stream.end(buf);
        });

        server.on("stream", (stream) => {
            stream.respond(200, {});

            let received = 0;
            stream.on("data", (chunk) => {
                received += chunk.length;
            });

            stream.on("end", () => {
                assert.equal(received, buf.length * 4);
                done();
            });
        });
    });
});
