const { request } = adone.net.http.client;

describe("net", "http", "client", "requests", () => {
    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("should treat single string arg as url", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo");
    });

    it("should allow string arg as url, and config arg", (done) => {
        nock("http://example.org")
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo");
    });

    it("should reject on network errors", function (done) {
        nock.restore();

        this.timeout(30000);
        const resolveSpy = spy();
        const rejectSpy = spy();

        const finish = function () {
            expect(resolveSpy).not.to.have.been.called;
            expect(rejectSpy).to.have.been.calledOnce;
            const reason = rejectSpy.getCall(0).args[0];
            expect(reason.code).to.be.equal("ENOTFOUND");
            expect(reason.config.method).to.be.equal("get");
            expect(reason.config.url).to.be.equal("http://thisisnotaserver");
            done();
        };

        request("http://thisisnotaserver")
            .then(resolveSpy, rejectSpy)
            .then(finish, finish);
    });

    it("should reject when validateStatus returns false", async () => {
        nock("http://example.org")
            .get("/foo")
            .reply(500);

        const resolveSpy = spy();
        const rejectSpy = spy();

        await request("http://example.org/foo", {
            validateStatus(status) {
                return status !== 500;
            }
        }).then(resolveSpy, rejectSpy);
        expect(resolveSpy).not.to.have.been.called;
        expect(rejectSpy).to.have.been.calledOnce;
        const reason = rejectSpy.getCall(0).args[0];
        expect(reason instanceof Error).to.be.true;
        expect(reason.message).to.be.equal("Request failed with status code 500");
        expect(reason.config.method).to.be.equal("get");
        expect(reason.config.url).to.be.equal("http://example.org/foo");
        expect(reason.response.status).to.be.equal(500);
    });

    it("should resolve when validateStatus returns true", async () => {
        nock("http://example.org")
            .get("/foo")
            .reply(500);

        const resolveSpy = spy();
        const rejectSpy = spy();

        await request("http://example.org/foo", {
            validateStatus(status) {
                return status === 500;
            }
        }).then(resolveSpy, rejectSpy);
        expect(resolveSpy).to.have.been.calledOnce;
        expect(rejectSpy).not.to.have.been.called;
    });

    // https://github.com/mzabriskie/axios/issues/378
    it("should return JSON when rejecting", (done) => {
        nock("http://example.org")
            .post("/api/account/signup", /.*/)
            .reply(400, "{\"error\": \"BAD USERNAME\", \"code\": 1}");

        request.post("http://example.org/api/account/signup", {
            username: null,
            password: null
        }, {
            headers: {
                Accept: "application/json"
            }
        })
            .catch(({ response }) => {
                expect(typeof response.data).to.be.equal("object");
                expect(response.data.error).to.be.equal("BAD USERNAME");
                expect(response.data.code).to.be.equal(1);
                done();
            });
    });

    it("should make cross domian http request", (done) => {
        nock("http://someurl.com")
            .post("/foo", /.*/)
            .reply(200, "{\"foo\": \"bar\"}", {
                "Content-Type": "application/json"
            });

        request.post("http://someurl.com/foo").then((response) => {
            expect(response.data.foo).to.be.equal("bar");
            expect(response.status).to.be.equal(200);
            expect(response.headers["content-type"]).to.be.equal("application/json");
            done();
        });
    });

    it("should allow overriding Content-Type header case-insensitive", (done) => {
        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/vnd.myapp.type+json"
            }
        })
            .post("/foo", { prop: "value" })
            .reply(200, "{\"foo\": \"bar\"}", {
                "Content-Type": "application/json"
            });


        const contentType = "application/vnd.myapp.type+json";

        request.post("http://example.org/foo", { prop: "value" }, {
            headers: {
                "content-type": contentType
            }
        }).then(() => {
            done();
        });
    });

    it("should support binary data as array buffer", (done) => {
        const input = new Int8Array(2);
        input[0] = 1;
        input[1] = 2;

        nock("http://example.org")
            .post("/foo", (x) => "\x01\x02" in x)
            .reply(200, () => {
                done();
            });


        request.post("http://example.org/foo", input.buffer);
    });

    it("should support binary data as array buffer view", (done) => {
        const input = new Int8Array(2);
        input[0] = 1;
        input[1] = 2;

        nock("http://example.org")
            .post("/foo", (x) => "\x01\x02" in x)
            .reply(200, () => {
                done();
            });


        request.post("http://example.org/foo", input);
    });

    it("should support array buffer response", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, Buffer.from("Hello, World!"));

        request("http://example.org/foo", {
            responseType: "arraybuffer"
        }).then((response) => {
            expect(response.data.byteLength).to.be.equal(13);
            done();
        });
    });

    it("should support URLSearchParams", (done) => {
        const qs = adone.std.querystring.stringify({ param1: "value1", param2: "value2" });

        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
            .post("/foo", qs)
            .reply(200, () => done());


        request.post("http://example.org/foo", qs);
    });
});
