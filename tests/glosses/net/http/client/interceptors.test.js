const { request, create } = adone.net.http.client;

describe("net", "http", "client", "interceptors", () => {
    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    afterEach(() => {
        request.interceptors.request.handlers = [];
        request.interceptors.response.handlers = [];
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

        request.interceptors.request.use((config) => {
            config.headers.test = "added by interceptor";
            return config;
        });

        request("http://example.org/foo");
    });

    it("should add a request interceptor that returns a new config object", (done) => {
        nock("http://example.org")
            .post("/bar")
            .reply(200, () => {
                done();
            });

        request.interceptors.request.use(() => {
            return {
                url: "http://example.org/bar",
                method: "post",
                responseType: "json"
            };
        });

        request("http://example.org/foo");
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

        request.interceptors.request.use((config) => {
            return new Promise((resolve) => {
                // do something async
                setTimeout(() => {
                    config.headers.async = "promise";
                    resolve(config);
                }, 100);
            });
        });

        request("http://example.org/foo");
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

        request.interceptors.request.use((config) => {
            config.headers.test1 = "1";
            return config;
        });
        request.interceptors.request.use((config) => {
            config.headers.test2 = "2";
            return config;
        });
        request.interceptors.request.use((config) => {
            config.headers.test3 = "3";
            return config;
        });

        request("http://example.org/foo");
    });

    it("should add a response interceptor", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        request.interceptors.response.use((data) => {
            data.data = `${data.data} - modified by interceptor`;
            return data;
        });

        request("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("OK - modified by interceptor");
            done();
        });
    });

    it("should add a response interceptor that returns a new data object", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        request.interceptors.response.use(() => {
            return {
                data: "stuff"
            };
        });

        request("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("stuff");
            done();
        });
    });

    it("should add a response interceptor that returns a promise", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");
        request.interceptors.response.use((data) => {
            return new Promise((resolve) => {
                // do something async
                setTimeout(() => {
                    data.data = "you have been promised!";
                    resolve(data);
                }, 10);
            });
        });

        request("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("you have been promised!");
            done();
        });
    });

    it("should add multiple response interceptors", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        request.interceptors.response.use((data) => {
            data.data = `${data.data}1`;
            return data;
        });
        request.interceptors.response.use((data) => {
            data.data = `${data.data}2`;
            return data;
        });
        request.interceptors.response.use((data) => {
            data.data = `${data.data}3`;
            return data;
        });

        request("http://example.org/foo").then((data) => {
            expect(data.data).to.be.equal("OK123");
            done();
        });
    });

    it("should allow removing interceptors", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        request.interceptors.response.use((data) => {
            data.data = `${data.data}1`;
            return data;
        });
        const intercept = request.interceptors.response.use((data) => {
            data.data = `${data.data}2`;
            return data;
        });
        request.interceptors.response.use((data) => {
            data.data = `${data.data}3`;
            return data;
        });

        request.interceptors.response.eject(intercept);

        request("http://example.org/foo").then((data) => {
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

        request.interceptors.request.use((config) => {
            config.data.baz = "qux";
            return config;
        });

        request.post("http://example.org/foo", {
            foo: "bar"
        });
    });

    it("should modify base URL in request interceptor", (done) => {
        nock("http://rebase.com")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = create({
            baseURL: "http://test.com/"
        });

        instance.interceptors.request.use((config) => {
            config.baseURL = "http://rebase.com/";
            return config;
        });

        instance.get("/foo");
    });
});
