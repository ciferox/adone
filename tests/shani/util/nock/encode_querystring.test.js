describe("shani", "util", "nock", "encode querystring", () => {
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

    it("encode query string", async () => {
        const query1 = { q: "(nodejs)" };

        nock("https://encodeland.com")
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://encodeland.com/test", {
            params: query1
        });

        expect(resp.data).to.be.equal("success");
    });
});
