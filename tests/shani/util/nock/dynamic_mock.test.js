describe("shani", "util", "nock", "dynamic mock", () => {
    const {
        shani: {
            util: { nock }
        },
        net: {
            http: {
                client: { request }
            }
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

    it("one function returning the body defines a full mock", async () => {
        nock("http://acompleteandfullmock.io")
            .get("/abc")
            .reply(() => {
                return "ABC";
            });

        const resp = await request.get("http://acompleteandfullmock.io/abc");

        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("ABC");
    });

    it("one function returning the status code and body defines a full mock", async () => {
        nock("http://acompleteandfullmock.io")
            .get("/def")
            .reply(() => {
                return [201, "DEF"];
            });

        const resp = await request.get("http://acompleteandfullmock.io/def");
        expect(resp.status).to.be.equal(201);
        expect(resp.data).to.be.equal("DEF");
    });

    it("one asynchronous function returning the status code and body defines a full mock", async () => {
        nock("http://acompleteandfullmock.io")
            .get("/ghi")
            .reply((path, reqBody, cb) => {
                setTimeout(() => {
                    cb(null, [201, "GHI"]);
                }, 1e3);

            });

        const resp = await request.get("http://acompleteandfullmock.io/ghi");
        expect(resp.status).to.be.equal(201);
        expect(resp.data).to.be.equal("GHI");
    });

    it("asynchronous function gets request headers", async () => {
        nock("http://someheadersarein.io")
            .get("/yo")
            .reply(200, function (path, reqBody, cb) {
                assert.equal(this.req.path, "/yo");
                assert.propertyVal(this.req.headers, "x-my-header", "some-value");
                assert.propertyVal(this.req.headers, "x-my-other-header", "some-other-value");
                assert.propertyVal(this.req.headers, "host", "someheadersarein.io");
                setTimeout(() => {
                    cb(null, [201, "GHI"]);
                }, 1e3);
            });

        const resp = await request.get("http://someheadersarein.io/yo", {
            headers: {
                "x-my-header": "some-value",
                "x-my-other-header": "some-other-value"
            }
        });

        expect(resp.status).to.be.equal(201);
        expect(resp.data).to.be.equal("GHI");
    });
});
