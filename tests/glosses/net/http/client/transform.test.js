import nock from "shani/helpers/nock";

const { request } = adone.net.http.client;

describe("glosses", "net", "http", "client", "transform", () => {
    it("should transform JSON to string", (done) => {
        nock("http://example.org")
            .post("/foo", { foo: "bar" })
            .reply(200, () => done());

        const data = {
            foo: "bar"
        };

        request.post("http://example.org/foo", data);
    });

    it("should transform string to JSON", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, { foo: "bar" });

        request("http://example.org/foo").then((response) => {
            expect(typeof response.data).to.be.equal("object");
            expect(response.data.foo).to.be.equal("bar");
            done();
        });
    });

    it("should override default transform", (done) => {
        nock("http://example.org")
            .post("/foo", { foo: "bar" })
            .reply(200, () => done());

        const data = {
            foo: "bar"
        };

        request.post("http://example.org/foo", data, {
            transformRequest(data) {
                return JSON.stringify(data);
            }
        });
    });

    it("should allow an Array of transformers", (done) => {
        nock("http://example.org")
            .post("/foo", { foo: "baz" })
            .reply(200, () => done());

        const data = {
            foo: "bar"
        };

        request.post("http://example.org/foo", data, {
            transformRequest: request.defaults.transformRequest.concat(
                (data) => {
                    return data.replace("bar", "baz");
                }
            )
        });
    });

    it("should allowing mutating headers", (done) => {
        const token = Math.floor(Math.random() * Math.pow(2, 64)).toString(36);

        nock("http://example.org", { reqheaders: { "X-Authorization": token } })
            .get("/foo")
            .reply(200, () => done());

        request("http://example.org/foo", {
            transformRequest(data, headers) {
                headers["X-Authorization"] = token;
            }
        });
    });
});
