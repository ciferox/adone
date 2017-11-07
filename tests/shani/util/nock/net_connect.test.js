describe("shani", "util", "nock", "net connect", () => {
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

    it("disable net connect is default", async () => {
        nock.disableNetConnect();
        nock("http://somethingelsecompletelyunrelated.com").get("/").reply(200);

        await assert.throws(async () => {
            await request.get("https://google.com");
        }, 'Not allow net connect for "google.com:443/"');
    });
});
