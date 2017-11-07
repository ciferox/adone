describe("shani", "util", "nock", "ipv6", () => {
    const {
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

    it("IPV6 URL in http.get get gets mocked", (done) => {
        let dataCalled = false;

        const scope = nock("http://[2607:f0d0:1002:51::4]:8080")
            .get("/")
            .reply(200, "Hello World!");

        http.get("http://[2607:f0d0:1002:51::4]:8080/", (res) => {
            assert.equal(res.statusCode, 200, "Status code is 200");
            res.on("end", () => {
                assert.ok(dataCalled, "data handler was called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });

        });
    });

    it("IPV6 hostname in http.request get gets mocked", (done) => {
        let dataCalled = false;

        const scope = nock("http://[2607:f0d0:1002:51::5]:8080")
            .get("/")
            .reply(200, "Hello World!");

        http.request({
            hostname: "2607:f0d0:1002:51::5",
            path: "/",
            method: "GET",
            port: 8080
        }, (res) => {
            assert.equal(res.statusCode, 200, "Status code is 200");
            res.on("end", () => {
                assert.ok(dataCalled, "data handler was called");
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });
        }).end();
    });
});
