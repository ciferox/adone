describe("shani", "util", "nock", "data", () => {
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

    it("data emits", (done) => {
        const reqBody = { data: { message: "hello" } };

        nock("http://api.songkick.com")
            .get("/api/3.0/search/venues.json?query=brudenell&apikey=XXXkeyXXX")
            .reply(200, reqBody);

        http.get("http://api.songkick.com/api/3.0/search/venues.json?query=brudenell&apikey=XXXkeyXXX", (res) => {
            let body = "";

            res.on("data", (d) => {
                body += d;
            });

            res.on("end", () => {
                assert.deepEqual(JSON.parse(body), reqBody);
                done();
            });
        });
    });
});
