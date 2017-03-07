import nock from "shani/helpers/nock";

const { client } = adone.net.http;

describe("instance", () => {

    it("should have the same methods as default instance", () => {
        const instance = client.create();

        for (const prop in client) {
            if ([
                "Axios",
                "create",
                "Cancel",
                "CancelToken",
                "isCancel",
                "all",
                "spread",
                "default"].indexOf(prop) > -1) {
                continue;
            }
            expect(typeof instance[prop]).to.be.equal(typeof client[prop]);
        }
    });

    it("should make an http request without verb helper", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = client.create();

        instance("http://example.org/foo");
    });

    it("should make an http request", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = client.create();

        instance.get("http://example.org/foo");
    });

    it("should have defaults.headers", () => {
        const instance = client.create({
            baseURL: "https://api.example.com"
        });

        expect(typeof instance.defaults.headers, "object");
        expect(typeof instance.defaults.headers.common, "object");
    });

    it("should have interceptors on the instance", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200);

        client.interceptors.request.use((config) => {
            config.foo = true;
            return config;
        });

        const instance = client.create();
        instance.interceptors.request.use((config) => {
            config.bar = true;
            return config;
        });

        let response;
        instance.get("http://example.org/foo").then((res) => {
            response = res;
            expect(response.config.foo).to.be.undefined;
            expect(response.config.bar).to.be.true;
            done();
        });
    });
});
