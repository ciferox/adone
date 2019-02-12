const {
    assert,
    net,
    std,
    is,
    error,
    compressor,
    event,
    text,
    data
} = adone;

class Request extends event.Emitter {
    constructor(server) {
        super();
        this.server = server;

        this.isAdoneServer = server instanceof net.http.server.Server;

        this.method = null;
        this.path = null;
        this.expects = [];
        this.headers = {};
        this.attachments = [];
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

    attach(name, buffer, { type = "", filename = "" } = {}) {
        this.attachments.push([name, buffer, type, filename]);
        return this;
    }

    field(name, value) {
        this.attachments.push([name, value, null, null]);
        return this;
    }

    send(value) {
        this.body = value;
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
        this.headers[key] = value;
        return this;
    }

    auth(user, pass) {
        const creds = data.base64.encode(`${user}:${pass}`).toString();
        this.headers.Authorization = `Basic ${creds}`;
        return this;
    }

    expect(fn) {
        if (!is.function(fn)) {
            throw new error.InvalidArgumentException("must be a function");
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
                        responseBody = await compressor.gz.decompress(responseBody);
                        break;
                    }
                    case "br": {
                        responseBody = await compressor.brotli.decompress(responseBody);
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
                assert(is.deepEqual(body, JSON.parse(responseBody)));
            }
        });
    }

    expectEmptyBody() {
        return this.expect((response) => {
            assert.equal(response.body.length, 0);
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
        const server = this.server;

        let mustBeClosed = false;
        let address = server.address();
        if (is.null(address)) {
            mustBeClosed = true;
            if (this.isAdoneServer) {
                await server.bind({ port: 0, host: "127.0.0.1" });
            } else {
                // assume it is net.http(s) server
                await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
            }
            address = server.address();
        }

        const protocol = server instanceof std.https.Server || server.secure ? "https:" : "http:";

        let response;
        try {
            let { body } = this;
            const { headers } = this;

            if (body) {
                if (is.object(body)) {
                    headers["Content-Type"] = "application/json";
                    body = JSON.stringify(body);
                }
            } else if (this.attachments.length) {
                let boundary = text.random(16);
                headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
                boundary = `--${boundary}`;
                body = ["\r\n"];
                for (const [name, buffer, type, filename] of this.attachments) {
                    body.push(boundary, "\r\n");
                    body.push(`Content-Disposition: form-data; name="${name}"`);

                    if (type) {
                        if (filename) {
                            body.push(`; filename="${filename}"`);
                        }
                        body.push("\r\n");
                        body.push(`Content-Type: ${type}\r\n`);
                    } else {
                        body.push("\r\n");
                    }
                    body.push("\r\n");
                    body.push(buffer, "\r\n");
                }
                body.push(boundary, "\r\n");
                body = Buffer.concat(body.map(Buffer.from));
                headers["Content-Length"] = body.length;
            }

            response = await new Promise((resolve, reject) => {
                const req = std.http.request({
                    protocol, // https?
                    hostname: address.address,
                    port: address.port,
                    method: this.method,
                    path: this.path,
                    headers
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
                    reject(new error.Exception("The request was aborted by the server"));
                });

                if (body) {
                    req.end(body);
                } else {
                    req.end();
                }
            });

            for (const expect of this.expects) {
                await expect(response);
            }
        } finally {
            if (mustBeClosed) {
                if (this.isAdoneServer) {
                    await server.unbind();
                } else {
                    await new Promise((resolve) => server.close(resolve));
                }
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
