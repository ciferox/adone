import nock from "shani/helpers/nock";

const { request, create } = adone.net.http.client;

describe("glosses", "net", "http", "client", "instance", () => {
    it("should have the same methods as default instance", () => {
        const instance = create();

        for (const prop in request) {
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
            expect(typeof instance[prop]).to.be.equal(typeof request[prop]);
        }
    });

    it("should make an http request without verb helper", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = create();

        instance("http://example.org/foo");
    });

    it("should make an http request", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = create();

        instance.get("http://example.org/foo");
    });

    it("should have options.headers", () => {
        const instance = create({
            baseURL: "https://api.example.com"
        });

        expect(typeof instance.options.headers, "object");
        expect(typeof instance.options.headers.common, "object");
    });

    it("should have interceptors on the instance", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200);

        request.interceptors.request.use((config) => {
            config.foo = true;
            return config;
        });

        const instance = create();
        instance.interceptors.request.use((config) => {
            config.bar = true;
            return config;
        });

        let response;
        instance.get("http://example.org/foo").then((res) => {
            response = res;
            expect(response.options.foo).to.be.undefined;
            expect(response.options.bar).to.be.true;
            done();
        });
    });
});
