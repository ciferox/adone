describe("shani", "util", "nock", "content encoding", () => {
    const {
        compressor: {
            gz
        },
        shani: {
            util: { nock }
        },
        std: { http }
    } = adone;

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("accepts gzipped content", (done) => {
        const message = "Lorem ipsum dolor sit amet";

        const compressedMessage = gz.compressSync(message);

        nock("http://gziplandpartywoo")
            .get("/foo")
            .reply(200, compressedMessage, {
                "X-Transfer-Length": String(compressedMessage.length),
                "Content-Length": undefined,
                "Content-Encoding": "gzip"
            });

        http.get("http://gziplandpartywoo/foo", (res) => {
            res.once("data", (d) => {
                const dd = gz.decompressSync(d);
                assert.equal(dd.toString(), message);
                res.once("end", done);
            });
        });
    });
});
