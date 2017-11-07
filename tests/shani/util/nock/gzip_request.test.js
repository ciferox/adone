describe("shani", "util", "nock", "gzip request", () => {
    const {
        shani: {
            util: { nock }
        },
        compressor: {
            gz,
            deflate
        },
        std: {
            http
        }
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

    it("accepts and decodes gzip encoded application/json", (done) => {
        const message = {
            my: "contents"
        };

        nock("http://gzipped.com")
            .post("/")
            .reply((url, actual) => {
                assert.deepEqual(actual, message);
                done();
                return 200;
            });

        const req = http.request({
            hostname: "gzipped.com",
            path: "/",
            method: "POST",
            headers: {
                "content-encoding": "gzip",
                "content-type": "application/json"
            }
        });

        const compressedMessage = gz.compressSync(JSON.stringify(message));

        req.write(compressedMessage);
        req.end();
    });


    it("accepts and decodes deflate encoded application/json", (done) => {
        const message = {
            my: "contents"
        };

        nock("http://gzipped.com")
            .post("/")
            .reply((url, actual) => {
                assert.deepEqual(actual, message);
                done();
                return 200;
            });

        const req = http.request({
            hostname: "gzipped.com",
            path: "/",
            method: "POST",
            headers: {
                "content-encoding": "deflate",
                "content-type": "application/json"
            }
        });

        const compressedMessage = deflate.compressSync(JSON.stringify(message));

        req.write(compressedMessage);
        req.end();
    });
});
