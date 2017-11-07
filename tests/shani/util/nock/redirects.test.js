describe("shani", "util", "nock", "redirects", () => {
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

    it("follows redirects", async () => {
        nock("http://redirecter.com")
            .get("/YourAccount")
            .reply(302, undefined, {
                Location: "http://redirecter.com/Login"
            })
            .get("/Login")
            .reply(200, "Here is the login page");

        const resp = await request.get("http://redirecter.com/YourAccount");
        expect(resp.status).to.be.equal(200);
        expect(resp.data).to.be.equal("Here is the login page");
    });
});

