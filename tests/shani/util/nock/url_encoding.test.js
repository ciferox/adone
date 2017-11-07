describe("shani", "util", "nock", "url encoding", () => {
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

    it("url encoding", async () => {
        nock("http://encodingsareus.com").get("/key?a=[1]").reply(200);

        const resp = await request.get("http://encodingsareus.com/key?a=[1]");
        expect(resp.status).to.be.equal(200);
    });
});
