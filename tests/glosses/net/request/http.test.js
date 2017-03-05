/* global describe it afterEach context */


const {
    net: { request },
    std: { http, url, zlib, fs }
} = adone;
let server;
let proxy;

describe("unit", () => {
    context("http", () => {
        afterEach(() => {
            server.close();
            server = null;
            if (proxy) {
                proxy.close();
                proxy = null;
            }
            if (process.env.http_proxy) {
                delete process.env.http_proxy;
            }
        });

        it("should use timeout", function (done) {
            server = http.createServer(function (req, res) {
                setTimeout(function () {
                    res.end();
                }, 1000);
            }).listen(4444, function () {
                let success = false;
                let failure = false;
                let error;

                request.get("http://localhost:4444/", {
                    timeout: 250
                }).then(function () {
                    success = true;
                }).catch(function (err) {
                    error = err;
                    failure = true;
                }).then(() => {
                    expect(success).to.be.false;
                    expect(failure).to.be.true;
                    expect(error.code).to.be.equal("ECONNABORTED");
                    expect(error.message).to.be.equal("timeout of 250ms exceeded");
                    done();
                });
            });
        });

        it("should unwrap json", function (done) {
            const data = {
                firstName: "Fred",
                lastName: "Flintstone",
                emailAddr: "fred@example.com"
            };

            server = http.createServer(function (req, res) {
                res.setHeader("Content-Type", "application/json;charset=utf-8");
                res.end(JSON.stringify(data));
            }).listen(4444, function () {
                request.get("http://localhost:4444/").then(function (res) {
                    expect(res.data).to.be.deep.equal(data);
                }).then(done, done);
            });
        });

        it("should handle redirects", function (done) {
            const str = "test response";

            server = http.createServer(function (req, res) {
                const parsed = url.parse(req.url);

                if (parsed.pathname === "/one") {
                    res.setHeader("Location", "/two");
                    res.statusCode = 302;
                    res.end();
                } else {
                    res.end(str);
                }
            }).listen(4444, function () {
                request.get("http://localhost:4444/one").then(function (res) {
                    expect(res.data).to.be.equal(str);
                    done();
                });
            });
        });

        it("should prevent redirecting", function (done) {
            server = http.createServer(function (req, res) {
                res.setHeader("Location", "/foo");
                res.statusCode = 302;
                res.end();
            }).listen(4444, function () {
                request.get("http://localhost:4444/", {
                    maxRedirects: 0,
                    validateStatus: () => true
                }).then(function (res) {
                    expect(res.status).to.be.equal(302);
                    expect(res.headers["location"]).to.be.equal("/foo");
                    done();
                });
            });
        });

        it("should limit the number of redirects", function (done) {
            let i = 1;
            server = http.createServer(function (req, res) {
                res.setHeader("Location", "/" + i);
                res.statusCode = 302;
                res.end();
                i++;
            }).listen(4444, function () {
                request.get("http://localhost:4444/", {
                    maxRedirects: 3
                }).catch(function () {
                    done();
                });
            });
        });

        it("should use gunzip", function (done) {
            const data = {
                firstName: "Fred",
                lastName: "Flintstone",
                emailAddr: "fred@example.com"
            };

            zlib.gzip(JSON.stringify(data), function (err, zipped) {
                server = http.createServer(function (req, res) {
                    res.setHeader("Content-Type", "application/json;charset=utf-8");
                    res.setHeader("Content-Encoding", "gzip");
                    res.end(zipped);
                }).listen(4444, function () {
                    request.get("http://localhost:4444/").then(function (res) {
                        expect(res.data).to.be.deep.equal(data);
                        done();
                    });
                });

            });
        });

        it("should handle unzip errors", function (done) {
            server = http.createServer(function (req, res) {
                res.setHeader("Content-Type", "application/json;charset=utf-8");
                res.setHeader("Content-Encoding", "gzip");
                res.end("invalid response");
            }).listen(4444, function () {
                request.get("http://localhost:4444/").catch(function () {
                    done();
                });
            });
        });

        it("should support UTF8", function (done) {
            const str = Array(100000).join("ж");

            server = http.createServer(function (req, res) {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end(str);
            }).listen(4444, function () {
                request.get("http://localhost:4444/").then(function (res) {
                    expect(res.data).to.be.equal(str);
                    done();
                });
            });
        });

        it("should handle basic auth", function (done) {
            server = http.createServer(function (req, res) {
                res.end(req.headers.authorization);
            }).listen(4444, function () {
                const user = "foo";
                const headers = { Authorization: "Bearer 1234" };
                request.get(`http://${user}@localhost:4444/`, { headers }).then(function (res) {
                    const base64 = new Buffer(user + ":", "utf8").toString("base64");
                    expect(res.data).to.be.equal(`Basic ${base64}`);
                    done();
                });
            });
        });

        it("should handle basic auth with the header", function (done) {
            server = http.createServer(function (req, res) {
                res.end(req.headers.authorization);
            }).listen(4444, function () {
                const auth = { username: "foo", password: "bar" };
                const headers = { Authorization: "Bearer 1234" };
                request.get("http://localhost:4444/", { auth, headers }).then(function (res) {
                    const base64 = new Buffer("foo:bar", "utf8").toString("base64");
                    expect(res.data).to.be.equal(`Basic ${base64}`);
                    done();
                });
            });
        });

        it("should handle max content length", function (done) {
            const str = Array(100000).join("ж");

            server = http.createServer(function (req, res) {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end(str);
            }).listen(4444, function () {
                let success = false;
                let failure = false;
                let error;

                request.get("http://localhost:4444/", {
                    maxContentLength: 2000
                }).then(function () {
                    success = true;
                }).catch(function (err) {
                    error = err;
                    failure = true;
                }).then(() => {
                    expect(success).to.be.false;
                    expect(failure).to.be.true;
                    expect(error.message).to.be.equal("maxContentLength size of 2000 exceeded");
                    done();
                });
            });
        });

        it("should support streaming", function (done) {
            server = http.createServer(function (req, res) {
                req.pipe(res);
            }).listen(4444, function () {
                request.post("http://localhost:4444/",
                    fs.createReadStream(__filename), {
                        responseType: "stream"
                    }).then(function (res) {
                        const stream = res.data;
                        let string = "";
                        stream.on("data", function (chunk) {
                            string += chunk.toString("utf8");
                        });
                        stream.on("end", function () {
                            expect(string).to.be.equal(fs.readFileSync(__filename, "utf8"));
                            done();
                        });
                    });
            });
        });

        it("should support http proxying", function (done) {
            server = http.createServer(function (req, res) {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end("12345");
            }).listen(4444, function () {
                proxy = http.createServer(function (request, response) {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };

                    http.get(opts, function (res) {
                        let body = "";
                        res.on("data", function (data) {
                            body += data;
                        });
                        res.on("end", function () {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(body + "6789");
                        });
                    });

                }).listen(4000, function () {
                    request.get("http://localhost:4444/", {
                        proxy: {
                            host: "localhost",
                            port: 4000
                        }
                    }).then(function (res) {
                        expect(res.data).to.be.equal(123456789);
                        done();
                    });
                });
            });
        });

        it("should support http proxying using the env", function (done) {
            server = http.createServer(function (req, res) {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end("4567");
            }).listen(4444, function () {
                proxy = http.createServer(function (request, response) {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };

                    http.get(opts, function (res) {
                        let body = "";
                        res.on("data", function (data) {
                            body += data;
                        });
                        res.on("end", function () {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(body + "1234");
                        });
                    });

                }).listen(4000, function () {
                    // set the env variable
                    process.env.http_proxy = "http://localhost:4000/";

                    request.get("http://localhost:4444/").then(function (res) {
                        expect(res.data).to.be.equal(45671234);
                        done();
                    });
                });
            });
        });

        it("should support http proxying with auth", function (done) {
            server = http.createServer(function (req, res) {
                res.end();
            }).listen(4444, function () {
                proxy = http.createServer(function (request, response) {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: "/hello"
                    };
                    const proxyAuth = request.headers["proxy-authorization"];
                    http.get(opts, function (res) {
                        res.on("data", () => {});
                        res.on("end", function () {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(proxyAuth);
                        });
                    });

                }).listen(4000, function () {
                    request.get("http://localhost:4444/", {
                        proxy: {
                            host: "localhost",
                            port: 4000,
                            auth: {
                                username: "user",
                                password: "pass"
                            }
                        }
                    }).then(function (res) {
                        const base64 = new Buffer("user:pass", "utf8").toString("base64");
                        expect(res.data).to.be.equal(`Basic ${base64}`);
                        done();
                    }, done);
                });
            });
        });

        it("should support http proxying with auth using the env", function (done) {
            server = http.createServer(function (req, res) {
                res.end();
            }).listen(4444, function () {
                proxy = http.createServer(function (request, response) {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };
                    const proxyAuth = request.headers["proxy-authorization"];

                    http.get(opts, function (res) {
                        res.on("data", () => {});
                        res.on("end", function () {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(proxyAuth);
                        });
                    });

                }).listen(4000, function () {
                    process.env.http_proxy = "http://user:pass@localhost:4000/";

                    request.get("http://localhost:4444/").then(function (res) {
                        const base64 = new Buffer("user:pass", "utf8").toString("base64");
                        expect(res.data).to.be.equal(`Basic ${base64}`);
                        done();
                    });
                });
            });
        });

        it("should support http proxying auth with header", function (done) {
            server = http.createServer(function (req, res) {
                res.end();
            }).listen(4444, function () {
                proxy = http.createServer(function (request, response) {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };
                    const proxyAuth = request.headers["proxy-authorization"];

                    http.get(opts, function (res) {
                        res.on("data", () => {});
                        res.on("end", function () {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(proxyAuth);
                        });
                    });

                }).listen(4000, function () {
                    request.get("http://localhost:4444/", {
                        proxy: {
                            host: "localhost",
                            port: 4000,
                            auth: {
                                username: "user",
                                password: "pass"
                            }
                        },
                        headers: {
                            "Proxy-Authorization": "Basic abc123"
                        }
                    }).then(function (res) {
                        const base64 = new Buffer("user:pass", "utf8").toString("base64");
                        expect(res.data).to.be.equal(`Basic ${base64}`);
                        done();
                    });
                });
            });
        });

        it("should support canceling", function (done) {
            const source = request.CancelToken.source();
            server = http.createServer(function () {
                // call cancel() when the request has been sent, but a response has not been received
                source.cancel("Operation has been canceled.");
            }).listen(4444, function () {
                request.get("http://localhost:4444/", {
                    cancelToken: source.token
                }).catch(function (thrown) {
                    expect(thrown).to.be.instanceOf(request.Cancel);
                    expect(thrown.message).to.be.equal("Operation has been canceled.");
                    done();
                });
            });
        });
    });
});