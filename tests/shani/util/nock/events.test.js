describe("shani", "util", "nock", "events", () => {
    const {
        shani: {
            util: { nock }
        },
        std: { http },
        noop
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

    it("emits request and replied events", (done) => {
        const scope = nock("http://eventland")
            .get("/please")
            .reply(200);

        scope.on("request", (req, interceptor) => {
            assert.equal(req.path, "/please");
            assert.equal(interceptor.interceptionCounter, 0);
            scope.on("replied", (req, interceptor) => {
                assert.equal(req.path, "/please");
                assert.equal(interceptor.interceptionCounter, 1);
                done();
            });
        });

        http.get("http://eventland/please");
    });

    it("emits no match when no match and no mock", (done) => {
        nock.emitter.once("no match", (req) => {
            done();
        });

        const req = http.get("http://doesnotexistandneverexistedbefore/abc");
        req.once("error", noop);
    });

    it("emits no match when no match and mocked", (done) => {

        nock("http://itmayormaynotexistidontknowreally")
            .get("/")
            .reply("howdy");


        const assertion = function (req) {
            assert.equal(req.path, "/definitelymaybe");
            nock.emitter.removeAllListeners("no match");
            done();
        };
        nock.emitter.on("no match", assertion);

        http.get("http://itmayormaynotexistidontknowreally/definitelymaybe")
            .once("error", noop);
    });

    it("emits no match when netConnect is disabled", (done) => {
        nock.disableNetConnect();
        nock.emitter.on("no match", (req) => {
            assert.equal(req.hostname, "jsonip.com");
            nock.emitter.removeAllListeners("no match");
            nock.enableNetConnect();
            done();
        });
        http.get("http://jsonip.com").once("error", noop);
    });
});
