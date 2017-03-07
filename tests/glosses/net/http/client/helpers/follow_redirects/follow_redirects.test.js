import followRedirects from "adone/glosses/net/http/client/helpers/follow_redirects";

describe("follow-redirects ", () => {
    const express = require("express");
    const assert = require("assert");
    const net = require("net");
    const server = require("./lib/test-server")({
        https: 3601,
        http: 3600
    });
    const url = require("url");
    const http = followRedirects.http;
    const https = followRedirects.https;
    const BPromise = require("bluebird");

    const util = require("./lib/util");
    const concat = require("concat-stream");
    const concatJson = util.concatJson;
    const redirectsTo = util.redirectsTo;
    const sendsJson = util.sendsJson;
    const asPromise = util.asPromise;

    const fs = require("fs");
    const path = require("path");

    function httpsOptions(app) {
        return {
            app,
            protocol: "https",
            cert: fs.readFileSync(path.join(__dirname, "lib/TestServer.crt")),
            key: fs.readFileSync(path.join(__dirname, "lib/TestServer.pem"))
        };
    }
    const ca = fs.readFileSync(path.join(__dirname, "lib/TestCA.crt"));

    let app;
    let app2;
    let originalMaxRedirects;

    beforeEach(() => {
        originalMaxRedirects = followRedirects.maxRedirects;
        app = express();
        app2 = express();
    });

    afterEach((done) => {
        followRedirects.maxRedirects = originalMaxRedirects;
        return server.stop().nodeify(done);
    });

    it("http.get with callback", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", redirectsTo("/d"));
        app.get("/d", redirectsTo("/e"));
        app.get("/e", redirectsTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            })
            .nodeify(done);
    });

    it("http.get with response event", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", redirectsTo("/d"));
        app.get("/d", redirectsTo("/e"));
        app.get("/e", redirectsTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a")
                    .on("response", concatJson(resolve, reject))
                    .on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            })
            .nodeify(done);
    });

    it("should return with the original status code if the response does not contain a location header", (done) => {
        app.get("/a", (req, res) => {
            res.status(307).end();
        });

        server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", resolve).on("error", reject);
            }))
            .then((res) => {
                assert.equal(res.statusCode, 307);
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                res.on("data", () => {
                    // noop to consume the stream (server won't shut down otherwise).
                });
            })
            .nodeify(done);
    });

    it("should emit connection errors on the returned stream", (done) => {
        app.get("/a", redirectsTo("http://localhost:36002/b"));

        server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", reject).on("error", resolve);
            }))
            .then((error) => {
                assert.equal(error.code, "ECONNREFUSED");
            })
            .nodeify(done);
    });

    it("should emit socket events on the returned stream", (done) => {
        app.get("/a", sendsJson({ a: "b" }));

        server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a")
                    .on("socket", resolve)
                    .on("error", reject);
            }))
            .then((socket) => {
                assert(socket instanceof net.Socket, "socket event should emit with socket");
            })
            .nodeify(done);
    });

    it("should follow redirects over https", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", sendsJson({ baz: "quz" }));

        server.start(httpsOptions(app))
            .then(asPromise((resolve, reject) => {
                const opts = url.parse("https://localhost:3601/a");
                opts.ca = ca;
                https.get(opts, concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { baz: "quz" });
                assert.deepEqual(res.responseUrl, "https://localhost:3601/c");
            })
            .nodeify(done);
    });

    it("should honor query params in redirects", (done) => {
        app.get("/a", redirectsTo("/b?greeting=hello"));
        app.get("/b", (req, res) => {
            res.json({ greeting: req.query.greeting });
        });

        server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { greeting: "hello" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/b?greeting=hello");
            })
            .nodeify(done);
    });

    it.skip("should allow aborting", (done) => {
        let request;

        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", callAbort);

        server.start(app)
            .then(asPromise((resolve, reject) => {
                request = http.get("http://localhost:3600/a", resolve);
                request.on("response", reject);
                request.on("error", reject);
                request.on("abort", onAbort);
                function onAbort() {
                    request.removeListener("error", reject);
                    request.on("error", noop);
                    resolve();
                }
            }))
            .nodeify(done);

        function callAbort() {
            request.abort();
        }
    });

    it("should provide flushHeaders", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.flushHeaders();
                request.on("response", resolve);
                request.on("error", reject);
            }))
            .nodeify(done);
    });

    it("should provide setNoDelay", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.setNoDelay(true);
                request.on("response", resolve);
                request.on("error", reject);
            }))
            .nodeify(done);
    });

    it("should provide setSocketKeepAlive", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        server.start(app)
            .then(asPromise((resolve) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.setSocketKeepAlive(true);
            }))
            .nodeify(done);
    });

    it("should provide setTimeout", (done) => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        server.start(app)
            .then(asPromise((resolve) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.setTimeout(1000);
            }))
            .nodeify(done);
    });

    describe("should obey a `maxRedirects` property", () => {
        beforeEach(() => {
            let i = 22;
            while (i > 0) {
                app.get(`/r${i}`, redirectsTo(`/r${--i}`));
            }
            app.get("/r0", sendsJson({ foo: "bar" }));
        });

        it("which defaults to 21", (done) => {
            server.start(app)
                // 21 redirects should work fine
                .then(asPromise((resolve, reject) => {
                    http.get("http://localhost:3600/r21", concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { foo: "bar" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/r0");
                })
                // 22 redirects should fail
                .then(asPromise((resolve, reject) => {
                    http.get("http://localhost:3600/r22", reject).on("error", resolve);
                }))
                .then((err) => {
                    assert.ok(err.toString().match(/Max redirects exceeded/));
                })
                .nodeify(done);
        });

        it("which can be set globally", (done) => {
            followRedirects.maxRedirects = 22;
            server.start(app)
                .then(asPromise((resolve, reject) => {
                    http.get("http://localhost:3600/r22", concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { foo: "bar" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/r0");
                })
                .nodeify(done);
        });

        it("set as an option on an individual request", (done) => {
            const u = url.parse("http://localhost:3600/r2");
            u.maxRedirects = 1;

            server.start(app)
                .then(asPromise((resolve, reject) => {
                    http.get(u, reject).on("error", resolve);
                }))
                .then((err) => {
                    assert.ok(err.toString().match(/Max redirects exceeded/));
                })
                .nodeify(done);
        });
    });

    describe("should switch to safe methods when appropriate", () => {
        function mustUseSameMethod(statusCode, useSameMethod) {
            describe(`when redirecting with status code ${statusCode}`, () => {
                itRedirectsWith(statusCode, "GET", "GET");
                itRedirectsWith(statusCode, "HEAD", "HEAD");
                itRedirectsWith(statusCode, "OPTIONS", "OPTIONS");
                itRedirectsWith(statusCode, "TRACE", "TRACE");
                itRedirectsWith(statusCode, "POST", useSameMethod ? "POST" : "GET");
                itRedirectsWith(statusCode, "PUT", useSameMethod ? "PUT" : "GET");
            });
        }

        function itRedirectsWith(statusCode, originalMethod, redirectedMethod) {
            const description = `should ${
                originalMethod === redirectedMethod ? `reuse ${originalMethod}` :
                    `switch from ${originalMethod} to ${redirectedMethod}`}`;
            it(description, (done) => {
                app[originalMethod.toLowerCase()]("/a", redirectsTo(statusCode, "/b"));
                app[redirectedMethod.toLowerCase()]("/b", sendsJson({ a: "b" }));

                server.start(app)
                    .then(asPromise((resolve, reject) => {
                        const opts = url.parse("http://localhost:3600/a");
                        opts.method = originalMethod;
                        http.request(opts, resolve).on("error", reject).end();
                    }))
                    .then((res) => {
                        assert.deepEqual(res.responseUrl, "http://localhost:3600/b");
                        if (res.statusCode !== 200) {
                            throw new Error(`Did not use ${redirectedMethod}`);
                        }
                    })
                    .nodeify(done);
            });
        }

        mustUseSameMethod(300, false);
        mustUseSameMethod(301, false);
        mustUseSameMethod(302, false);
        mustUseSameMethod(303, false);
        mustUseSameMethod(307, true);
    });

    describe("should handle cross protocol redirects ", () => {
        it("(https -> http -> https)", (done) => {
            app.get("/a", redirectsTo("http://localhost:3600/b"));
            app2.get("/b", redirectsTo("https://localhost:3601/c"));
            app.get("/c", sendsJson({ yes: "no" }));

            BPromise.all([server.start(httpsOptions(app)), server.start(app2)])
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("https://localhost:3601/a");
                    opts.ca = ca;
                    https.get(opts, concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { yes: "no" });
                    assert.deepEqual(res.responseUrl, "https://localhost:3601/c");
                })
                .nodeify(done);
        });

        it("(http -> https -> http)", (done) => {
            app.get("/a", redirectsTo("https://localhost:3601/b"));
            app2.get("/b", redirectsTo("http://localhost:3600/c"));
            app.get("/c", sendsJson({ hello: "goodbye" }));

            BPromise.all([server.start(app), server.start(httpsOptions(app2))])
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("http://localhost:3600/a");
                    opts.ca = ca;
                    http.get(opts, concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { hello: "goodbye" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/c");
                })
                .nodeify(done);
        });
    });

    it("should support writing into request stream without redirects", (done) => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                req.end(fs.readFileSync(__filename), "buffer");
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, fs.readFileSync(__filename, "utf8"));
            })
            .nodeify(done);
    });

    it("should support writing into request stream with redirects", (done) => {
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                req.end(fs.readFileSync(__filename), "buffer");
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, fs.readFileSync(__filename, "utf8"));
            })
            .nodeify(done);
    });

    it("should support piping into request stream without redirects", (done) => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                fs.createReadStream(__filename).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, fs.readFileSync(__filename, "utf8"));
            })
            .nodeify(done);
    });

    it("should support piping into request stream with redirects", (done) => {
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                fs.createReadStream(__filename).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, fs.readFileSync(__filename, "utf8"));
            })
            .nodeify(done);
    });

    it("should support piping into request stream with explicit Content-Length without redirects", (done) => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";
        opts.headers = {
            "Content-Length": fs.readFileSync(__filename).byteLength
        };

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                fs.createReadStream(__filename).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, fs.readFileSync(__filename, "utf8"));
            })
            .nodeify(done);
    });

    it("should support piping into request stream with explicit Content-Length with redirects", (done) => {
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";
        opts.headers = {
            "Content-Length": fs.readFileSync(__filename).byteLength
        };

        server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                fs.createReadStream(__filename).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, fs.readFileSync(__filename, "utf8"));
            })
            .nodeify(done);
    });

    describe("should drop the entity and associated headers", () => {
        function itDropsBodyAndHeaders(originalMethod) {
            it(`when switching from ${originalMethod} to GET`, (done) => {
                app[originalMethod.toLowerCase()]("/a", redirectsTo(302, "http://localhost:3600/b"));
                app.get("/b", (req, res) => {
                    res.write(JSON.stringify(req.headers));
                    req.pipe(res); // will invalidate JSON if non-empty
                });

                const opts = url.parse("http://localhost:3600/a");
                opts.method = originalMethod;
                opts.headers = {
                    other: "value",
                    "content-type": "application/javascript",
                    "Content-Length": fs.readFileSync(__filename).byteLength
                };

                server.start(app)
                    .then(asPromise((resolve, reject) => {
                        const req = http.request(opts, resolve);
                        fs.createReadStream(__filename).pipe(req);
                        req.on("error", reject);
                    }))
                    .then(asPromise((resolve, reject, res) => {
                        res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
                    }))
                    .then((str) => {
                        const body = JSON.parse(str);
                        assert.equal(body.host, "localhost:3600");
                        assert.equal(body.other, "value");
                        assert.equal(body["content-type"], undefined);
                        assert.equal(body["content-length"], undefined);
                    })
                    .nodeify(done);
            });
        }
        itDropsBodyAndHeaders("POST");
        itDropsBodyAndHeaders("PUT");
    });

    describe("when the followRedirects option is set to false", () => {
        it("does not redirect", (done) => {
            app.get("/a", redirectsTo(302, "/b"));
            app.get("/b", sendsJson({ a: "b" }));

            server.start(app)
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("http://localhost:3600/a");
                    opts.followRedirects = false;
                    http.get(opts, resolve).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.statusCode, 302);
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                })
                .nodeify(done);
        });
    });

    describe.skip("should choose the right agent per protocol", () => {
        it("(https -> http -> https)", (done) => {
            app.get("/a", redirectsTo("http://localhost:3600/b"));
            app2.get("/b", redirectsTo("https://localhost:3601/c"));
            app.get("/c", sendsJson({ yes: "no" }));

            const httpAgent = addRequestLogging(new http.Agent());
            const httpsAgent = addRequestLogging(new https.Agent());
            function addRequestLogging(agent) {
                agent._requests = [];
                agent._addRequest = agent.addRequest;
                agent.addRequest = function (request, options) {
                    this._requests.push(options.path);
                    this._addRequest(request, options);
                };
                return agent;
            }

            BPromise.all([server.start(httpsOptions(app)), server.start(app2)])
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("https://localhost:3601/a");
                    opts.ca = ca;
                    opts.agents = { http: httpAgent, https: httpsAgent };
                    https.get(opts, concatJson(resolve, reject)).on("error", reject);
                }))
                .then(() => Badone.promise.delay(1000))
                .then((res) => {
                    assert.deepEqual(httpAgent._requests, ["/b"]);
                    assert.deepEqual(httpsAgent._requests, ["/a", "/c"]);
                    assert.deepEqual(res.parsedJson, { yes: "no" });
                    assert.deepEqual(res.responseUrl, "https://localhost:3601/c");
                })
                .nodeify(done);
        });
    });
});

