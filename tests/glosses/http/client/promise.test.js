const { request } = adone.http.client;

describe("promise", () => {
    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("should provide succinct object to then", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "{\"hello\":\"world\"}", {
                "Content-Type": "application/json"
            });

        request("http://example.org/foo").then((response) => {
            expect(typeof response).to.be.equal("object");
            expect(response.data.hello).to.be.equal("world");
            expect(response.status).to.be.equal(200);
            expect(response.headers["content-type"]).to.be.equal("application/json");
            expect(response.config.url).to.be.equal("http://example.org/foo");
            done();
        });
    });
});
