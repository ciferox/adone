/* eslint-disable func-style */

const {
    is,
    http: { followRedirects },
    noop,
    std: { net, url, fs, path }
} = adone;

const express = require("express");
const server = require("./lib/test-server")({ https: 3601, http: 3600 });
const { URL } = url;
const { http, https } = followRedirects;
const lolex = require("lolex");

const util = require("./lib/util");
const concat = require("concat-stream");
const concatJson = util.concatJson;
const delay = util.delay;
const redirectsTo = util.redirectsTo;
const sendsJson = util.sendsJson;
const asPromise = util.asPromise;

const testFile = path.resolve(__dirname, "input.txt");
const testFileBuffer = fs.readFileSync(testFile);
const testFileString = testFileBuffer.toString();

describe("follow-redirects", () => {
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
    let originalMaxBodyLength;

    beforeEach(() => {
        originalMaxRedirects = followRedirects.maxRedirects;
        originalMaxBodyLength = followRedirects.maxBodyLength;
        app = express();
        app2 = express();
    });

    afterEach(() => {
        followRedirects.maxRedirects = originalMaxRedirects;
        followRedirects.maxBodyLength = originalMaxBodyLength;
        return server.stop();
    });

    it("http.get with string and callback - redirect", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", redirectsTo("/d"));
        app.get("/d", redirectsTo("/e"));
        app.get("/e", redirectsTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            });
    });

    if (URL) {
        it("http.get with URL object and callback - redirect", () => {
            app.get("/a", redirectsTo("/b"));
            app.get("/b", redirectsTo("/c"));
            app.get("/c", redirectsTo("/d"));
            app.get("/d", redirectsTo("/e"));
            app.get("/e", redirectsTo("/f"));
            app.get("/f", sendsJson({ a: "b" }));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    http.get(
                        new URL("http://localhost:3600/a"),
                        concatJson(resolve, reject)
                    ).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { a: "b" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
                });
        });
    }

    it("http.get with options object and callback - redirect", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", redirectsTo("/d"));
        app.get("/d", redirectsTo("/e"));
        app.get("/e", redirectsTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const options = {
                    hostname: "localhost",
                    port: 3600,
                    path: "/a",
                    method: "GET",
                };
                http.get(options, concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            });
    });

    it("http.get with string and callback - no redirect", () => {
        app.get("/a", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
            });
    });

    it("http.get with options object and callback - no redirect", () => {
        app.get("/a", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const options = {
                    hostname: "localhost",
                    port: 3600,
                    path: "/a?xyz",
                    method: "GET",
                };
                http.get(options, concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a?xyz");
            });
    });

    it("http.get with host option and callback - redirect", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", redirectsTo("/d"));
        app.get("/d", redirectsTo("/e"));
        app.get("/e", redirectsTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const options = {
                    host: "localhost",
                    port: 3600,
                    path: "/a",
                    method: "GET",
                };
                http.get(options, concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            });
    });

    it("http.get with response event", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", redirectsTo("/d"));
        app.get("/d", redirectsTo("/e"));
        app.get("/e", redirectsTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a")
                    .on("response", concatJson(resolve, reject))
                    .on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            });
    });

    it("should return with the original status code if the response does not contain a location header", () => {
        app.get("/a", (req, res) => {
            res.status(307).end();
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", resolve).on("error", reject);
            }))
            .then((res) => {
                assert.equal(res.statusCode, 307);
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                res.on("data", () => {
                    // noop to consume the stream (server won't shut down otherwise).
                });
            });
    });

    it("should emit connection errors on the returned stream", () => {
        app.get("/a", redirectsTo("http://localhost:36002/b"));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", reject).on("error", resolve);
            }))
            .then((error) => {
                assert.equal(error.code, "ECONNREFUSED");
            });
    });

    it("should emit socket events on the returned stream", () => {
        app.get("/a", sendsJson({ a: "b" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a")
                    .on("socket", resolve)
                    .on("error", reject);
            }))
            .then((socket) => {
                assert(socket instanceof net.Socket, "socket event should emit with socket");
            });
    });

    describe("setTimeout", () => {
        let clock;
        beforeEach(() => {
            clock = lolex.install();
        });
        afterEach(() => {
            clock.uninstall();
        });

        it("clears timeouts after a successful response", () => {
            app.get("/redirect", redirectsTo("/timeout"));
            app.get("/timeout", delay(clock, 2000, sendsJson({ didnot: "timeout" })));

            let req;
            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    req = http.get("http://localhost:3600/redirect", concatJson(resolve, reject));
                    req.on("error", reject);
                    req.setTimeout(3000, () => {
                        throw new Error("should not have timed out");
                    });
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { didnot: "timeout" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/timeout");
                    clock.tick(5000);
                });
        });

        it("clears timeouts after an error response", () => {
            app.get("/redirect", redirectsTo("http://localhost:3602/b"));

            let req;
            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    req = http.get("http://localhost:3600/redirect", reject);
                    req.setTimeout(3000, () => {
                        throw new Error("should not have timed out");
                    });
                    req.on("error", resolve);
                }))
                .then((err) => {
                    assert.equal(err.code, "ECONNREFUSED");
                    clock.tick(5000);
                });
        });

        it("sets a timeout when the socket already exists", () => {
            app.get("/timeout", delay(clock, 5000, sendsJson({ timed: "out" })));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.get("http://localhost:3600/timeout", () => {
                        throw new Error("should have timed out");
                    });
                    req.on("error", reject);
                    req.on("socket", () => {
                        assert(req.socket instanceof net.Socket);
                        req.setTimeout(3000, () => {
                            req.abort();
                            resolve();
                        });
                    });
                }));
        });

        it("should timeout on the final request", () => {
            app.get("/redirect1", redirectsTo("/redirect2"));
            app.get("/redirect2", redirectsTo("/timeout"));
            app.get("/timeout", delay(clock, 5000, sendsJson({ timed: "out" })));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.get("http://localhost:3600/redirect1", () => {
                        throw new Error("should have timed out");
                    });
                    req.on("error", reject);
                    req.setTimeout(1000, () => {
                        req.abort();
                        resolve();
                    });
                }));
        });

        it("should include redirect delays in the timeout", () => {
            app.get("/redirect1", delay(clock, 1000, redirectsTo("/redirect2")));
            app.get("/redirect2", delay(clock, 1000, redirectsTo("/redirect3")));
            app.get("/redirect3", delay(clock, 1000, "/timeout"));
            app.get("/timeout", delay(clock, 1000, sendsJson({ timed: "out" })));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.get("http://localhost:3600/redirect1", () => {
                        throw new Error("should have timed out");
                    });
                    req.on("error", reject);
                    req.setTimeout(2000, () => {
                        req.abort();
                        resolve();
                    });
                }));
        });

        it("overrides existing timeouts", () => {
            app.get("/redirect", redirectsTo("/timeout"));
            app.get("/timeout", delay(clock, 5000, sendsJson({ timed: "out" })));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.get("http://localhost:3600/redirect", () => {
                        throw new Error("should have timed out");
                    });
                    req.on("error", reject);

                    let callbacks = 0;
                    function timeoutCallback() {
                        if (++callbacks === 3) {
                            req.abort();
                            resolve(callbacks);
                        }
                    }
                    req.setTimeout(10000, timeoutCallback);
                    req.setTimeout(10000, timeoutCallback);
                    req.setTimeout(1000, timeoutCallback);
                }));
        });
    });

    it("should follow redirects over https", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", sendsJson({ baz: "quz" }));

        return server.start(httpsOptions(app))
            .then(asPromise((resolve, reject) => {
                const opts = url.parse("https://localhost:3601/a");
                opts.ca = ca;
                https.get(opts, concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { baz: "quz" });
                assert.deepEqual(res.responseUrl, "https://localhost:3601/c");
            });
    });

    it("should destroy responses", () => {
        app.get("/a", hangingRedirectTo("/b"));
        app.get("/b", hangingRedirectTo("/c"));
        app.get("/c", hangingRedirectTo("/d"));
        app.get("/d", hangingRedirectTo("/e"));
        app.get("/e", hangingRedirectTo("/f"));
        app.get("/f", sendsJson({ a: "b" }));

        function hangingRedirectTo(destination) {
            return function (req, res) {
                res.writeHead(301, { location: destination });
                res.write(new Array(128).join(" "));
            };
        }

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { a: "b" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/f");
            });
    });

    it("should honor query params in redirects", () => {
        app.get("/a", redirectsTo("/b?greeting=hello"));
        app.get("/b", (req, res) => {
            res.json({ greeting: req.query.greeting });
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                http.get("http://localhost:3600/a", concatJson(resolve, reject)).on("error", reject);
            }))
            .then((res) => {
                assert.deepEqual(res.parsedJson, { greeting: "hello" });
                assert.deepEqual(res.responseUrl, "http://localhost:3600/b?greeting=hello");
            });
    });

    it("should allow aborting", () => {
        let request;

        app.get("/a", redirectsTo("/b"));
        app.get("/b", redirectsTo("/c"));
        app.get("/c", () => {
            request.abort();
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const currentTime = Date.now();
                request = http.get("http://localhost:3600/a", resolve);
                assert(request.aborted === false || // Node >= v11.0.0
                    is.undefined(request.aborted)); // Node < v11.0.0
                request.on("response", reject);
                request.on("error", reject);
                request.on("abort", onAbort);
                function onAbort() {
                    assert(request.aborted === true || // Node >= v11.0.0
                        is.number(request.aborted) &&
                        request.aborted > currentTime); // Node < v11.0.0
                    request.removeListener("error", reject);
                    request.on("error", noop);
                    resolve();
                }
            }));
    });

    it("should provide connection", () => {
        let request;

        app.get("/a", sendsJson({}));

        return server.start(app)
            .then(asPromise((resolve) => {
                request = http.get("http://localhost:3600/a", resolve);
            }))
            .then(() => {
                assert(request.connection instanceof net.Socket);
            });
    });

    it("should provide flushHeaders", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.flushHeaders();
                request.on("error", reject);
            }));
    });

    it("should provide getHeader", () => {
        const req = http.request("http://localhost:3600/a");
        req.setHeader("my-header", "my value");
        assert.equal(req.getHeader("my-header"), "my value");
        req.abort();
    });

    it("should provide removeHeader", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", (req, res) => {
            res.end(JSON.stringify(req.headers));
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request("http://localhost:3600/a", concatJson(resolve, reject));
                req.setHeader("my-header", "my value");
                assert.equal(req.getHeader("my-header"), "my value");
                req.removeHeader("my-header");
                assert.equal(req.getHeader("my-header"), undefined);
                req.end();
            }))
            .then((res) => {
                const headers = res.parsedJson;
                assert.equal(headers["my-header"], undefined);
            });
    });

    it("should provide setHeader", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", (req, res) => {
            res.end(JSON.stringify(req.headers));
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request("http://localhost:3600/a", concatJson(resolve, reject));
                req.setHeader("my-header", "my value");
                assert.equal(req.getHeader("my-header"), "my value");
                req.end();
            }))
            .then((res) => {
                const headers = res.parsedJson;
                assert.equal(headers["my-header"], "my value");
            });
    });

    it("should provide setNoDelay", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.setNoDelay(true);
                request.on("error", reject);
            }));
    });

    it("should provide setSocketKeepAlive", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        return server.start(app)
            .then(asPromise((resolve) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.setSocketKeepAlive(true);
            }));
    });

    it("should provide setTimeout", () => {
        app.get("/a", redirectsTo("/b"));
        app.get("/b", sendsJson({ foo: "bar" }));

        return server.start(app)
            .then(asPromise((resolve) => {
                const request = http.get("http://localhost:3600/a", resolve);
                request.setTimeout(1000);
            }));
    });

    it("should provide socket", () => {
        let request;

        app.get("/a", sendsJson({}));

        return server.start(app)
            .then(asPromise((resolve) => {
                request = http.get("http://localhost:3600/a", resolve);
            }))
            .then(() => {
                assert(request.socket instanceof net.Socket);
            });
    });

    describe("should obey a `maxRedirects` property", () => {
        beforeEach(() => {
            let i = 22;
            while (i > 0) {
                app.get("/r" + i, redirectsTo("/r" + --i));
            }
            app.get("/r0", sendsJson({ foo: "bar" }));
        });

        it("which defaults to 21", () => {
            return server.start(app)
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
                });
        });

        it("which can be set globally", () => {
            followRedirects.maxRedirects = 22;
            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    http.get("http://localhost:3600/r22", concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { foo: "bar" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/r0");
                });
        });

        it("set as an option on an individual request", () => {
            const u = url.parse("http://localhost:3600/r2");
            u.maxRedirects = 1;

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    http.get(u, reject).on("error", resolve);
                }))
                .then((err) => {
                    assert.ok(err.toString().match(/Max redirects exceeded/));
                });
        });
    });

    describe("the trackRedirects option", () => {
        beforeEach(() => {
            app.get("/a", redirectsTo("/b"));
            app.get("/b", redirectsTo("/c"));
            app.get("/c", sendsJson({}));
        });

        describe("when not set", () => {
            it("should not track redirects", () => {
                return server.start(app)
                    .then(asPromise((resolve, reject) => {
                        const opts = url.parse("http://localhost:3600/a");
                        http.get(opts, concatJson(resolve, reject)).on("error", reject);
                    }))
                    .then((res) => {
                        const redirects = res.redirects;
                        assert.equal(redirects.length, 0);
                    });
            });
        });

        describe("when set to true", () => {
            it("should track redirects", () => {
                return server.start(app)
                    .then(asPromise((resolve, reject) => {
                        const opts = url.parse("http://localhost:3600/a");
                        opts.trackRedirects = true;
                        http.get(opts, concatJson(resolve, reject)).on("error", reject);
                    }))
                    .then((res) => {
                        const redirects = res.redirects;
                        assert.equal(redirects.length, 3);

                        assert.equal(redirects[0].url, "http://localhost:3600/a");
                        assert.equal(redirects[0].statusCode, 302);
                        assert.equal(redirects[0].headers["content-type"], "text/plain; charset=utf-8");

                        assert.equal(redirects[1].url, "http://localhost:3600/b");
                        assert.equal(redirects[1].statusCode, 302);
                        assert.equal(redirects[1].headers["content-type"], "text/plain; charset=utf-8");

                        assert.equal(redirects[2].url, "http://localhost:3600/c");
                        assert.equal(redirects[2].statusCode, 200);
                        assert.equal(redirects[2].headers["content-type"], "application/json; charset=utf-8");
                    });
            });
        });
    });

    describe("should switch to safe methods when appropriate", () => {
        function mustUseSameMethod(statusCode, useSameMethod) {
            describe("when redirecting with status code " + statusCode, () => {
                itRedirectsWith(statusCode, "GET", "GET");
                itRedirectsWith(statusCode, "HEAD", "HEAD");
                itRedirectsWith(statusCode, "OPTIONS", "OPTIONS");
                itRedirectsWith(statusCode, "TRACE", "TRACE");
                itRedirectsWith(statusCode, "POST", useSameMethod ? "POST" : "GET");
                itRedirectsWith(statusCode, "PUT", useSameMethod ? "PUT" : "GET");
            });
        }

        function itRedirectsWith(statusCode, originalMethod, redirectedMethod) {
            const description = "should " +
                (originalMethod === redirectedMethod ? "reuse " + originalMethod :
                    "switch from " + originalMethod + " to " + redirectedMethod);
            it(description, () => {
                app[originalMethod.toLowerCase()]("/a", redirectsTo(statusCode, "/b"));
                app[redirectedMethod.toLowerCase()]("/b", sendsJson({ a: "b" }));

                return server.start(app)
                    .then(asPromise((resolve, reject) => {
                        const opts = url.parse("http://localhost:3600/a");
                        opts.method = originalMethod;
                        http.request(opts, resolve).on("error", reject).end();
                    }))
                    .then((res) => {
                        assert.deepEqual(res.responseUrl, "http://localhost:3600/b");
                        if (res.statusCode !== 200) {
                            throw new Error("Did not use " + redirectedMethod);
                        }
                    });
            });
        }

        mustUseSameMethod(300, false);
        mustUseSameMethod(301, false);
        mustUseSameMethod(302, false);
        mustUseSameMethod(303, false);
        mustUseSameMethod(307, true);
    });

    describe("should handle cross protocol redirects ", () => {
        it("(https -> http -> https)", () => {
            app.get("/a", redirectsTo("http://localhost:3600/b"));
            app2.get("/b", redirectsTo("https://localhost:3601/c"));
            app.get("/c", sendsJson({ yes: "no" }));

            return Promise.all([server.start(httpsOptions(app)), server.start(app2)])
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("https://localhost:3601/a");
                    opts.ca = ca;
                    https.get(opts, concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { yes: "no" });
                    assert.deepEqual(res.responseUrl, "https://localhost:3601/c");
                });
        });

        it("(http -> https -> http)", () => {
            app.get("/a", redirectsTo("https://localhost:3601/b"));
            app2.get("/b", redirectsTo("http://localhost:3600/c"));
            app.get("/c", sendsJson({ hello: "goodbye" }));

            return Promise.all([server.start(app), server.start(httpsOptions(app2))])
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("http://localhost:3600/a");
                    opts.ca = ca;
                    http.get(opts, concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.parsedJson, { hello: "goodbye" });
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/c");
                });
        });
    });

    describe("should error on an unsupported protocol redirect", () => {
        it("(http -> about)", () => {
            app.get("/a", redirectsTo("about:blank"));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    http.get("http://localhost:3600/a")
                        .on("response", () => { return reject(new Error("unexpected response")); })
                        .on("error", reject);
                }))
                .catch((err) => {
                    assert(err instanceof Error);
                    assert.equal(err.message, "Unsupported protocol about:");
                });
        });
    });

    it("should wait for an explicit call to end", () => {
        let redirected = false;
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", redirectsTo(307, "http://localhost:3600/c"));
        app.post("/c", redirectsTo(307, "http://localhost:3600/d"));
        app.post("/d", (req, res) => {
            redirected = true;
            req.pipe(res);
        });

        let req;

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                req.write(testFileString);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                assert(redirected);
                // If we can still write to the request, it wasn't closed yet
                req.write(testFileString);
                req.end();
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString + testFileString);
            });
    });

    it("errors on write after end", () => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        return server.start(app)
            .then(() => {
                const req = http.request("http://localhost:3600/a", { method: "POST" });
                req.write(testFileString);
                req.end();
                try {
                    req.write(testFileString);
                }
                catch (error) {
                    assert.equal(error.message, "write after end");
                    return;
                }
                finally {
                    req.abort();
                }
                throw new Error("no error");
            });
    });

    it("should support writing into request stream without redirects", () => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                req.end(testFileBuffer, "buffer");
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString);
            });
    });

    it("should support writing into request stream with redirects", () => {
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", redirectsTo(307, "http://localhost:3600/c"));
        app.post("/c", redirectsTo(307, "http://localhost:3600/d"));
        app.post("/d", (req, res) => {
            req.pipe(res);
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                req.end(testFileBuffer, "buffer");
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString);
            });
    });

    it("should support piping into request stream without redirects", () => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                fs.createReadStream(testFile).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString);
            });
    });

    it("should support piping into request stream with redirects", () => {
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", redirectsTo(307, "http://localhost:3600/c"));
        app.post("/c", redirectsTo(307, "http://localhost:3600/d"));
        app.post("/d", (req, res) => {
            req.pipe(res);
        });

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                fs.createReadStream(testFile).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString);
            });
    });

    it("should support piping into request stream with explicit Content-Length without redirects", () => {
        app.post("/a", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";
        opts.headers = {
            "Content-Length": testFileBuffer.byteLength,
        };

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                fs.createReadStream(testFile).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString);
            });
    });

    it("should support piping into request stream with explicit Content-Length with redirects", () => {
        app.post("/a", redirectsTo(307, "http://localhost:3600/b"));
        app.post("/b", redirectsTo(307, "http://localhost:3600/c"));
        app.post("/c", redirectsTo(307, "http://localhost:3600/d"));
        app.post("/d", (req, res) => {
            req.pipe(res);
        });

        const opts = url.parse("http://localhost:3600/a");
        opts.method = "POST";
        opts.headers = {
            "Content-Length": testFileBuffer.byteLength,
        };

        return server.start(app)
            .then(asPromise((resolve, reject) => {
                const req = http.request(opts, resolve);
                fs.createReadStream(testFile).pipe(req);
                req.on("error", reject);
            }))
            .then(asPromise((resolve, reject, res) => {
                res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
            }))
            .then((str) => {
                assert.equal(str, testFileString);
            });
    });

    describe("should obey a `maxBodyLength` property", () => {
        it("which defaults to 10MB", () => {
            assert.equal(followRedirects.maxBodyLength, 10 * 1024 * 1024);
        });

        it("set globally, on write", () => {
            app.post("/a", (req, res) => {
                req.pipe(res);
            });

            followRedirects.maxBodyLength = 8;
            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, reject);
                    req.write("12345678");
                    req.on("error", resolve);
                    req.write("9");
                }))
                .then((error) => {
                    assert.equal(error.message, "Request body larger than maxBodyLength limit");
                });
        });

        it("set per request, on write", () => {
            app.post("/a", (req, res) => {
                req.pipe(res);
            });
            const opts = url.parse("http://localhost:3600/a");
            opts.method = "POST";
            opts.maxBodyLength = 8;

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request(opts, reject);
                    req.write("12345678");
                    req.on("error", resolve);
                    req.write("9");
                }))
                .then((error) => {
                    assert.equal(error.message, "Request body larger than maxBodyLength limit");
                });
        });

        it("set globally, on end", () => {
            app.post("/a", (req, res) => {
                req.pipe(res);
            });

            followRedirects.maxBodyLength = 8;
            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, reject);
                    req.write("12345678");
                    req.on("error", resolve);
                    req.end("9");
                }))
                .then((error) => {
                    assert.equal(error.message, "Request body larger than maxBodyLength limit");
                });
        });

        it("set per request, on end", () => {
            app.post("/a", (req, res) => {
                req.pipe(res);
            });
            const opts = url.parse("http://localhost:3600/a");
            opts.method = "POST";
            opts.maxBodyLength = 8;

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request(opts, reject);
                    req.write("12345678");
                    req.on("error", resolve);
                    req.end("9");
                }))
                .then((error) => {
                    assert.equal(error.message, "Request body larger than maxBodyLength limit");
                });
        });
    });

    describe("writing invalid data", () => {
        it("throws an error", () => {
            const req = http.request("http://example.org/");
            let error = null;
            try {
                req.write(12345678);
            }
            catch (e) {
                error = e;
            }
            req.abort();
            assert.equal(error.message, "data should be a string, Buffer or Uint8Array");
        });
    });

    describe("should drop the entity and associated headers", () => {
        function itDropsBodyAndHeaders(originalMethod) {
            it("when switching from " + originalMethod + " to GET", () => {
                app[originalMethod.toLowerCase()]("/a", redirectsTo(302, "http://localhost:3600/b"));
                app.get("/b", (req, res) => {
                    res.write(JSON.stringify(req.headers));
                    req.pipe(res); // will invalidate JSON if non-empty
                });

                const opts = url.parse("http://localhost:3600/a");
                opts.method = originalMethod;
                opts.headers = {
                    "other": "value",
                    "content-type": "application/javascript",
                    "Content-Length": testFileBuffer.byteLength,
                };

                return server.start(app)
                    .then(asPromise((resolve, reject) => {
                        const req = http.request(opts, resolve);
                        fs.createReadStream(testFile).pipe(req);
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
                    });
            });
        }
        itDropsBodyAndHeaders("POST");
        itDropsBodyAndHeaders("PUT");
    });

    describe("when redirecting to a different host while the host header is set", () => {
        it("uses the new host header", () => {
            app.get("/a", redirectsTo(302, "http://localhost:3600/b"));
            app.get("/b", (req, res) => {
                res.write(JSON.stringify(req.headers));
                req.pipe(res); // will invalidate JSON if non-empty
            });

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("http://localhost:3600/a");
                    opts.headers = { hOsT: "otherhost.com" };
                    http.get(opts, resolve).on("error", reject);
                }))
                .then(asPromise((resolve, reject, res) => {
                    assert.deepEqual(res.statusCode, 200);
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/b");
                    res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
                }))
                .then((str) => {
                    const body = JSON.parse(str);
                    assert.equal(body.host, "localhost:3600");
                });
        });
    });

    describe("when the followRedirects option is set to false", () => {
        it("does not redirect", () => {
            app.get("/a", redirectsTo(302, "/b"));
            app.get("/b", sendsJson({ a: "b" }));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("http://localhost:3600/a");
                    opts.followRedirects = false;
                    http.get(opts, resolve).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(res.statusCode, 302);
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                });
        });
    });

    describe("should choose the right agent per protocol", () => {
        it("(https -> http -> https)", () => {
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

            return Promise.all([server.start(httpsOptions(app)), server.start(app2)])
                .then(asPromise((resolve, reject) => {
                    const opts = url.parse("https://localhost:3601/a");
                    opts.ca = ca;
                    opts.agents = { http: httpAgent, https: httpsAgent };
                    https.get(opts, concatJson(resolve, reject)).on("error", reject);
                }))
                .then((res) => {
                    assert.deepEqual(httpAgent._requests, ["/b"]);
                    assert.deepEqual(httpsAgent._requests, ["/a", "/c"]);
                    assert.deepEqual(res.parsedJson, { yes: "no" });
                    assert.deepEqual(res.responseUrl, "https://localhost:3601/c");
                });
        });
    });

    describe("should not hang on empty writes", () => {
        it("when data is the empty string without encoding", () => {
            app.post("/a", sendsJson({ foo: "bar" }));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.write("");
                    req.write("", () => {
                        req.end("");
                    });
                    req.on("error", reject);
                }))
                .then(asPromise((resolve, reject, res) => {
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                    res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
                }));
        });

        it("when data is the empty string with encoding", () => {
            app.post("/a", sendsJson({ foo: "bar" }));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.write("");
                    req.write("", "utf8", () => {
                        req.end("", "utf8");
                    });
                    req.on("error", reject);
                }))
                .then(asPromise((resolve, reject, res) => {
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                    res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
                }));
        });

        it("when data is Buffer.from('')", () => {
            app.post("/a", sendsJson({ foo: "bar" }));

            return server.start(app)
                .then(asPromise((resolve, reject) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.write(Buffer.from(""));
                    req.write(Buffer.from(""), () => {
                        req.end(Buffer.from(""));
                    });
                    req.on("error", reject);
                }))
                .then(asPromise((resolve, reject, res) => {
                    assert.deepEqual(res.responseUrl, "http://localhost:3600/a");
                    res.pipe(concat({ encoding: "string" }, resolve)).on("error", reject);
                }));
        });
    });

    describe("end accepts as arguments", () => {
        let called;
        function setCalled() {
            called = true;
        }

        beforeEach(() => {
            app.post("/a", (req, res) => {
                req.pipe(res);
            });
            called = false;
        });


        it("(none)", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end();
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "");
                });
        });

        it("the empty string", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end("");
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "");
                });
        });

        it("a non-empty string", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end("abc");
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "abc");
                });
        });

        it("a non-empty string and an encoding", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end("abc", "utf8");
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "abc");
                });
        });

        it("a non-empty string, an encoding, and a callback", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end("abc", "utf8", setCalled);
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "abc");
                    assert.equal(called, true);
                });
        });

        it("a non-empty string and a callback", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end("abc", setCalled);
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "abc");
                    assert.equal(called, true);
                });
        });

        it("a callback", () => {
            return server.start(app)
                .then(asPromise((resolve) => {
                    const req = http.request("http://localhost:3600/a", { method: "POST" }, resolve);
                    req.end(setCalled);
                }))
                .then(asPromise((resolve, reject, res) => {
                    res.pipe(concat({ encoding: "string" }, resolve));
                }))
                .then((body) => {
                    assert.equal(body, "");
                    assert.equal(called, true);
                });
        });
    });
});
