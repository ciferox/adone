const {
    web: { server }
} = adone;

const http2 = require("http2");
const semver = require("semver");

describe("closing", () => {
    let fastify;

    before((done) => {
        try {
            fastify = server({
                http2: true
            });
            // t.pass("http2 successfully loaded");
        } catch (e) {
            assert.fail("http2 loading failed", e);
        }

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();
            done();
        });
    });

    // Skipped because there is likely a bug on Node 8.
    it("http/2 request while fastify closing", { skip: semver.lt(process.versions.node, "10.15.0") }, (done) => {
        const url = `http://127.0.0.1:${fastify.server.address().port}`;
        const session = http2.connect(url, function () {
            this.request({
                ":method": "GET",
                ":path": "/"
            }).on("response", (headers) => {
                assert.strictEqual(headers[":status"], 503);
                done();
                this.destroy();
            }).on("error", () => {
                // Nothing to do here,
                // we are not interested in this error that might
                // happen or not
            });
            fastify.close();
        });
        session.on("error", () => {
            // Nothing to do here,
            // we are not interested in this error that might
            // happen or not
            done();
        });
    });
});    
