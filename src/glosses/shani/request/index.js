
const { shani: { utils: { assert } }, net, std, is, x, util, compressor, EventEmitter } = adone;

class Request extends EventEmitter {
    constructor(server) {
        super();
        this.server = server;
        if (server instanceof std.http.Server || server instanceof std.https.Server) {
            const address = server.address();
            if (address) {
                this.hostname = address.host;
                this.port = address.port;
            } else {
                server.once("listening", () => {
                    const address = server.address();
                    this.hostname = address.address;
                    this.port = address.port;
                });
            }
        }

        this.method = null;
        this.path = null;
        this.expects = [];
        this.header = {};
    }

    get(path) {
        this.method = "GET";
        this.path = path;
        return this;
    }

    head(path) {
        this.method = "HEAD";
        this.path = path;
        return this;
    }

    post(path) {
        this.method = "POST";
        this.path = path;
        return this;
    }

    options(path) {
        this.method = "OPTIONS";
        this.path = path;
        return this;
    }

    put(path) {
        this.method = "PUT";
        this.path = path;
        return this;
    }

    search(path) {
        this.method = "SEARCH";
        this.path = path;
        return this;
    }

    setHeader(key, value) {
        this.header[key] = value;
        return this;
    }

    expect(fn) {
        if (!is.function(fn)) {
            throw new x.InvalidArgument("must be a function");
        }
        this.expects.push(fn);
        return this;
    }

    expectStatus(code, message = null) {
        this.expect((response) => {
            assert.equal(response.statusCode, code, `Expected code ${code} but got ${response.statusCode}`);
        });
        if (!is.null(message)) {
            this.expectStatusMessage(message);
        }
        return this;
    }

    expectStatusMessage(value) {
        return this.expect((response) => {
            assert.equal(response.statusMessage, value);
        });
    }

    expectBody(body, opts = {}) {
        return this.expect(async (response) => {
            let { body: responseBody } = response;
            if (opts.decompress) {
                switch (response.headers["content-encoding"]) {
                    case "gzip": {
                        responseBody = await compressor.gzip.decompress(responseBody);
                        break;
                    }
                }
            }
            if (is.regexp(body)) {
                assert(body.test(responseBody.toString()));
            } else if (is.string(body)) {
                assert.equal(body, responseBody.toString());
            } else if (is.buffer(body)) {
                assert(Buffer.compare(responseBody, body) === 0);
            } else if (is.object(body)) {
                // check if the content type is json?
                assert(util.deepEqual(body, JSON.parse(responseBody)));
            }
        });
    }

    expectEmptyBody() {
        return this.expect((response) => {
            expect(response.body.length === 0);
        });
    }

    expectHeader(key, value) {
        return this.expect((response) => {
            if (is.regexp(value)) {
                assert(value.test(response.headers[key.toLowerCase()]));
            } else {
                assert.equal(response.headers[key.toLowerCase()], value);
            }
        });
    }

    expectHeaderExists(key) {
        return this.expect((response) => {
            assert.property(response.headers, key.toLowerCase());
        });
    }

    expectNoHeader(key) {
        return this.expect((response) => {
            assert.notProperty(response.headers, key.toLowerCase());
        });
    }

    async _process() {
        let server = this.server;
        if (server instanceof net.http.Server) {
            server = std.http.createServer(server.callback());
        }

        let mustBeClosed = false;
        let address = server.address();
        if (!address) {
            mustBeClosed = true;
            await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
            address = server.address();
        }

        const protocol = server instanceof std.http.Server ? "http:" : "https:";

        let response;
        try {
            response = await new Promise((resolve, reject) => {
                const req = std.http.request({
                    protocol,  // https?
                    hostname: address.address,
                    port: address.port,
                    method: this.method,
                    path: this.path,
                    headers: this.header
                }, (res) => {
                    this.emit("response start", res);

                    res.on("error", (err) => {
                        this.emit("response error", err);
                        reject(err);
                    });

                    const chunks = [];
                    res.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    res.once("end", () => {
                        this.emit("response end");
                        res.body = Buffer.concat(chunks);
                        resolve(res);
                    });
                });

                req.once("socket", (socket) => {
                    this.emit("request socket", socket);
                });

                req.once("error", reject);
                req.once("aborted", () => {
                    reject(new x.Exception("The request was aborted by the server"));
                });


                req.end();
            });

            for (const expect of this.expects) {
                await expect(response);
            }
        } finally {
            if (mustBeClosed) {
                await new Promise((resolve) => server.close(resolve));
            }
        }
        return response;
    }

    then(onResolve, onReject) {
        return this._process().then(onResolve, onReject);
    }

    catch(onReject) {
        return this.then(null, onReject);
    }
}

const request = (...args) => new Request(...args);

export default request;
