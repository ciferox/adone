const {
    net: { http: { client: { request, Cancel, CancelToken } } },
    std: { http, url, zlib, fs }
} = adone;
let server;
let proxy;

describe("net", "http", "client", "unit", () => {
    context("http", () => {
        let PORT = null;

        beforeEach(async () => {
            PORT = await adone.net.util.getFreePort();
        });

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

        it("should use timeout", (done) => {
            server = http.createServer((req, res) => {
                setTimeout(() => {
                    res.end();
                }, 1000);
            }).listen(PORT, () => {
                let success = false;
                let failure = false;
                let error;

                request.get(`http://localhost:${PORT}/`, {
                    timeout: 250
                }).then(() => {
                    success = true;
                }).catch((err) => {
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

        it("should unwrap json", (done) => {
            const data = {
                firstName: "Fred",
                lastName: "Flintstone",
                emailAddr: "fred@example.com"
            };

            server = http.createServer((req, res) => {
                res.setHeader("Content-Type", "application/json;charset=utf-8");
                res.end(JSON.stringify(data));
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/`).then((res) => {
                    expect(res.data).to.be.deep.equal(data);
                }).then(done, done);
            });
        });

        it("should handle redirects", (done) => {
            const str = "test response";

            server = http.createServer((req, res) => {
                const parsed = url.parse(req.url);

                if (parsed.pathname === "/one") {
                    res.setHeader("Location", "/two");
                    res.statusCode = 302;
                    res.end();
                } else {
                    res.end(str);
                }
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/one`).then((res) => {
                    expect(res.data).to.be.equal(str);
                    done();
                });
            });
        });

        it("should prevent redirecting", (done) => {
            server = http.createServer((req, res) => {
                res.setHeader("Location", "/foo");
                res.statusCode = 302;
                res.end();
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/`, {
                    maxRedirects: 0,
                    validateStatus: () => true
                }).then((res) => {
                    expect(res.status).to.be.equal(302);
                    expect(res.headers.location).to.be.equal("/foo");
                    done();
                });
            });
        });

        it("should limit the number of redirects", (done) => {
            let i = 1;
            server = http.createServer((req, res) => {
                res.setHeader("Location", `/${i}`);
                res.statusCode = 302;
                res.end();
                i++;
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/`, {
                    maxRedirects: 3
                }).catch(() => {
                    done();
                });
            });
        });

        it("should use gunzip", (done) => {
            const data = {
                firstName: "Fred",
                lastName: "Flintstone",
                emailAddr: "fred@example.com"
            };

            zlib.gzip(JSON.stringify(data), (err, zipped) => {
                server = http.createServer((req, res) => {
                    res.setHeader("Content-Type", "application/json;charset=utf-8");
                    res.setHeader("Content-Encoding", "gzip");
                    res.end(zipped);
                }).listen(PORT, () => {
                    request.get(`http://localhost:${PORT}/`).then((res) => {
                        expect(res.data).to.be.deep.equal(data);
                        done();
                    });
                });

            });
        });

        it("should handle unzip errors", (done) => {
            server = http.createServer((req, res) => {
                res.setHeader("Content-Type", "application/json;charset=utf-8");
                res.setHeader("Content-Encoding", "gzip");
                res.end("invalid response");
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/`).catch(() => {
                    done();
                });
            });
        });

        it("should support UTF8", (done) => {
            const str = Array(100000).join("ж");

            server = http.createServer((req, res) => {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end(str);
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/`).then((res) => {
                    expect(res.data).to.be.equal(str);
                    done();
                });
            });
        });

        it("should handle basic auth", (done) => {
            server = http.createServer((req, res) => {
                res.end(req.headers.authorization);
            }).listen(PORT, () => {
                const user = "foo";
                const headers = { Authorization: "Bearer 1234" };
                request.get(`http://${user}@localhost:${PORT}/`, { headers }).then((res) => {
                    const base64 = Buffer.from(`${user}:`, "utf8").toString("base64");
                    expect(res.data).to.be.equal(`Basic ${base64}`);
                    done();
                });
            });
        });

        it("should handle basic auth with the header", (done) => {
            server = http.createServer((req, res) => {
                res.end(req.headers.authorization);
            }).listen(PORT, () => {
                const auth = { username: "foo", password: "bar" };
                const headers = { Authorization: "Bearer 1234" };
                request.get(`http://localhost:${PORT}/`, { auth, headers }).then((res) => {
                    const base64 = Buffer.from("foo:bar", "utf8").toString("base64");
                    expect(res.data).to.be.equal(`Basic ${base64}`);
                    done();
                });
            });
        });

        it("should handle max content length", (done) => {
            const str = Array(100000).join("ж");

            server = http.createServer((req, res) => {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end(str);
            }).listen(PORT, () => {
                let success = false;
                let failure = false;
                let error;

                request.get(`http://localhost:${PORT}/`, {
                    maxContentLength: 2000
                }).then(() => {
                    success = true;
                }).catch((err) => {
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

        it("should support streaming", (done) => {
            server = http.createServer((req, res) => {
                req.pipe(res);
            }).listen(PORT, () => {
                request.post(`http://localhost:${PORT}/`, fs.createReadStream(__filename), {
                    responseType: "stream"
                }).then((res) => {
                    const stream = res.data;
                    let string = "";
                    stream.on("data", (chunk) => {
                        string += chunk.toString("utf8");
                    });
                    stream.on("end", () => {
                        expect(string).to.be.equal(fs.readFileSync(__filename, "utf8"));
                        done();
                    });
                });
            });
        });

        it("should support http proxying", (done) => {
            server = http.createServer((req, res) => {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end("12345");
            }).listen(PORT, async () => {
                const anotherPort = await adone.net.util.getFreePort();

                proxy = http.createServer((request, response) => {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };

                    http.get(opts, (res) => {
                        let body = "";
                        res.on("data", (data) => {
                            body += data;
                        });
                        res.on("end", () => {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(`${body}6789`);
                        });
                    });

                }).listen(anotherPort, () => {
                    request.get(`http://localhost:${PORT}/`, {
                        proxy: {
                            host: "localhost",
                            port: anotherPort
                        }
                    }).then((res) => {
                        expect(res.data).to.be.equal(123456789);
                        done();
                    });
                });
            });
        });

        it("should support http proxying using the env", (done) => {
            server = http.createServer((req, res) => {
                res.setHeader("Content-Type", "text/html; charset=UTF-8");
                res.end("4567");
            }).listen(PORT, async () => {
                const anotherPort = await adone.net.util.getFreePort();

                proxy = http.createServer((request, response) => {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };

                    http.get(opts, (res) => {
                        let body = "";
                        res.on("data", (data) => {
                            body += data;
                        });
                        res.on("end", () => {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(`${body}1234`);
                        });
                    });

                }).listen(anotherPort, () => {
                    // set the env variable
                    process.env.http_proxy = `http://localhost:${anotherPort}/`;

                    request.get(`http://localhost:${PORT}/`).then((res) => {
                        expect(res.data).to.be.equal(45671234);
                        done();
                    });
                });
            });
        });

        it("should support http proxying with auth", (done) => {
            server = http.createServer((req, res) => {
                res.end();
            }).listen(PORT, async () => {
                const anotherPort = await adone.net.util.getFreePort();

                proxy = http.createServer((request, response) => {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: "/hello"
                    };
                    const proxyAuth = request.headers["proxy-authorization"];
                    http.get(opts, (res) => {
                        res.on("data", adone.noop);
                        res.on("end", () => {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(proxyAuth);
                        });
                    });

                }).listen(anotherPort, () => {
                    request.get(`http://localhost:${PORT}/`, {
                        proxy: {
                            host: "localhost",
                            port: anotherPort,
                            auth: {
                                username: "user",
                                password: "pass"
                            }
                        }
                    }).then((res) => {
                        const base64 = Buffer.from("user:pass", "utf8").toString("base64");
                        expect(res.data).to.be.equal(`Basic ${base64}`);
                        done();
                    }, done);
                });
            });
        });

        it("should support http proxying with auth using the env", (done) => {
            server = http.createServer((req, res) => {
                res.end();
            }).listen(PORT, async () => {
                const anotherPort = await adone.net.util.getFreePort();
                proxy = http.createServer((request, response) => {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };
                    const proxyAuth = request.headers["proxy-authorization"];

                    http.get(opts, (res) => {
                        res.on("data", adone.noop);
                        res.on("end", () => {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(proxyAuth);
                        });
                    });
                }).listen(anotherPort, () => {
                    process.env.http_proxy = `http://user:pass@localhost:${anotherPort}/`;

                    request.get(`http://localhost:${PORT}/`).then((res) => {
                        const base64 = Buffer.from("user:pass", "utf8").toString("base64");
                        expect(res.data).to.be.equal(`Basic ${base64}`);
                        done();
                    });
                });
            });
        });

        it("should support http proxying auth with header", (done) => {
            server = http.createServer((req, res) => {
                res.end();
            }).listen(PORT, async () => {
                const anotherPort = await adone.net.util.getFreePort();
                proxy = http.createServer((request, response) => {
                    const parsed = url.parse(request.url);
                    const opts = {
                        host: parsed.hostname,
                        port: parsed.port,
                        path: parsed.path
                    };
                    const proxyAuth = request.headers["proxy-authorization"];

                    http.get(opts, (res) => {
                        res.on("data", adone.noop);
                        res.on("end", () => {
                            response.setHeader("Content-Type", "text/html; charset=UTF-8");
                            response.end(proxyAuth);
                        });
                    });

                }).listen(anotherPort, () => {
                    request.get(`http://localhost:${PORT}/`, {
                        proxy: {
                            host: "localhost",
                            port: anotherPort,
                            auth: {
                                username: "user",
                                password: "pass"
                            }
                        },
                        headers: {
                            "Proxy-Authorization": "Basic abc123"
                        }
                    }).then((res) => {
                        const base64 = Buffer.from("user:pass", "utf8").toString("base64");
                        expect(res.data).to.be.equal(`Basic ${base64}`);
                        done();
                    });
                });
            });
        });

        it("should support canceling", (done) => {
            const source = CancelToken.source();
            server = http.createServer(() => {
                // call cancel() when the request has been sent, but a response has not been received
                source.cancel("Operation has been canceled.");
            }).listen(PORT, () => {
                request.get(`http://localhost:${PORT}/`, {
                    cancelToken: source.token
                }).catch((thrown) => {
                    expect(thrown).to.be.instanceOf(Cancel);
                    expect(thrown.message).to.be.equal("Operation has been canceled.");
                    done();
                });
            });
        });
    });
});
