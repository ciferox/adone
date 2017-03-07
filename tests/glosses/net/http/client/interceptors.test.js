import nock from "shani/helpers/nock";

const { client } = adone.net.http;

describe("glosses", "net", "http", "client", "interceptors", () => {
    afterEach(() => {
        client.interceptors.request.handlers = [];
        client.interceptors.response.handlers = [];
    });

    it("should add a request interceptor", (done) => {
        nock("http://example.org", {
            reqheaders: {
                test: "added by interceptor"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client.interceptors.request.use((config) => {
            config.headers.test = "added by interceptor";
            return config;
        });

        client("http://example.org/foo");
    });

    it("should add a request interceptor that returns a new config object", (done) => {
        nock("http://example.org")
            .post("/bar")
            .reply(200, () => {
                done();
            });

        client.interceptors.request.use(() => {
            return {
                url: "http://example.org/bar",
                method: "post"
            };
        });

        client("http://example.org/foo");
    });

    it("should add a request interceptor that returns a promise", (done) => {
        nock("http://example.org", {
            reqheaders: {
                async: "promise"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client.interceptors.request.use((config) => {
            return new Promise((resolve) => {
                // do something async
                setTimeout(() => {
                    config.headers.async = "promise";
                    resolve(config);
                }, 100);
            });
        });

        client("http://example.org/foo");
    });

    it("should add multiple request interceptors", (done) => {
        nock("http://example.org", {
            reqheaders: {
                test1: "1",
                test2: "2",
                test3: "3"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client.interceptors.request.use((config) => {
            config.headers.test1 = "1";
            return config;
        });
        client.interceptors.request.use((config) => {
            config.headers.test2 = "2";
            return config;
        });
        client.interceptors.request.use((config) => {
            config.headers.test3 = "3";
            return config;
        });

        client("http://example.org/foo");
    });

    it("should add a response interceptor", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        client.interceptors.response.use((data) => {
            data.data = `${data.data} - modified by interceptor`;
            return data;
        });

        client("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("OK - modified by interceptor");
            done();
        });
    });

    it("should add a response interceptor that returns a new data object", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        client.interceptors.response.use(() => {
            return {
                data: "stuff"
            };
        });

        client("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("stuff");
            done();
        });
    });

    it("should add a response interceptor that returns a promise", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");
        client.interceptors.response.use((data) => {
            return new Promise((resolve) => {
                // do something async
                setTimeout(() => {
                    data.data = "you have been promised!";
                    resolve(data);
                }, 10);
            });
        });

        client("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("you have been promised!");
            done();
        });
    });

    it("should add multiple response interceptors", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        client.interceptors.response.use((data) => {
            data.data = `${data.data}1`;
            return data;
        });
        client.interceptors.response.use((data) => {
            data.data = `${data.data}2`;
            return data;
        });
        client.interceptors.response.use((data) => {
            data.data = `${data.data}3`;
            return data;
        });

        client("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("OK123");
            done();
        });
    });

    it("should allow removing interceptors", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        client.interceptors.response.use((data) => {
            data.data = `${data.data}1`;
            return data;
        });
        const intercept = client.interceptors.response.use((data) => {
            data.data = `${data.data}2`;
            return data;
        });
        client.interceptors.response.use((data) => {
            data.data = `${data.data}3`;
            return data;
        });

        client.interceptors.response.eject(intercept);

        client("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("OK13");
            done();
        });
    });

    it("should execute interceptors before transformers", (done) => {
        nock("http://example.org")
            .post("/foo", { foo: "bar", baz: "qux" })
            .reply(200, () => {
                done();
            });

        client.interceptors.request.use((config) => {
            config.data.baz = "qux";
            return config;
        });

        client.post("http://example.org/foo", {
            foo: "bar"
        });
    });
});
