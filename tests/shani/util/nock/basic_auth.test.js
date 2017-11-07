describe("shani", "util", "nock", "basic auth", () => {
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

    describe("basic auth with username and password", () => {
        beforeEach(() => {
            nock("http://super-secure.com")
                .get("/test")
                .basicAuth({
                    user: "foo",
                    pass: "bar"
                })
                .reply(200, "Here is the content");
        });

        it("succeeds when it matches", async () => {
            const resp = await request.get("http://super-secure.com/test", {
                auth: {
                    username: "foo",
                    password: "bar"
                }
            });
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Here is the content");
        });

        it("fails when it doesnt match", async () => {
            await assert.throws(async () => {
                await request({
                    url: "http://super-secure.com/test"
                });
            });
        });
    });

    describe("basic auth with username only", () => {
        beforeEach(() => {
            nock("http://super-secure.com")
                .get("/test")
                .basicAuth({
                    user: "foo"
                })
                .reply(200, "Here is the content");
        });

        it("succeeds when it matches", async () => {
            const resp = await request({
                url: "http://super-secure.com/test",
                auth: {
                    username: "foo"
                }
            });
            expect(resp.status).to.be.equal(200);
            expect(resp.data).to.be.equal("Here is the content");
        });

        it("fails when it doesnt match", async () => {
            await assert.throws(async () => {
                await request({
                    url: "http://super-secure.com/test"
                });
            });
        });
    });
});
