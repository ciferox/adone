const {
    app: { fastLogger: { stdSerializers: { req: serialazersReq, wrapRequestSerializer } } },
    is,
    std: { http }
} = adone;

describe("app", "fastLogger", "serializers", "req", () => {
    let server;

    afterEach(() => {
        server.close();
    });

    it("maps request", () => {
        const handler = (req, res) => {
            const serialized = serialazersReq.mapHttpRequest(req);
            assert.ok(serialized.req);
            assert.ok(serialized.req.method);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("does not return excessively long object", () => {
        const handler = (req, res) => {
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(Object.keys(serialized).length, 6);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.raw is available", () => {
        const handler = (req, res) => {
            req.foo = "foo";
            const serialized = serialazersReq.reqSerializer(req);
            assert.ok(serialized.raw);
            assert.equal(serialized.raw.foo, "foo");
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.raw will be obtained in from input request raw property if input request raw property is truthy", () => {
        const handler = (req, res) => {
            req.raw = { req: { foo: "foo" }, res: {} };
            const serialized = serialazersReq.reqSerializer(req);
            assert.ok(serialized.raw);
            assert.equal(serialized.raw.req.foo, "foo");
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.id defaults to undefined", () => {
        const handler = (req, res) => {
            const serialized = serialazersReq.reqSerializer(req);
            assert.udnefined(serialized.id);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.id has a non-function value", () => {
        const handler = (req, res) => {
            const serialized = serialazersReq.reqSerializer(req);
            assert.false(is.function(serialized.id));
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.id will be obtained from input request info.id when input request id does not exist", () => {
        const handler = (req, res) => {
            req.info = { id: "test" };
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(serialized.id, "test");
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.id has a non-function value with custom id function", () => {
        const handler = (req, res) => {
            req.id = function () {
                return 42;
            };
            const serialized = serialazersReq.reqSerializer(req);
            assert.false(is.function(serialized.id));
            assert.equal(serialized.id, 42);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.url will be obtained from input request url.path when input request url is an object", () => {
        const handler = (req, res) => {
            req.url = { path: "/test" };
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(serialized.url, "/test");
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("can wrap request serializers", () => {
        const serailizer = wrapRequestSerializer((req) => {
            assert.ok(req.method);
            assert.equal(req.method, "GET");
            delete req.method;
            return req;
        });

        const handler = (req, res) => {
            const serialized = serailizer(req);
            assert.notOk(serialized.method);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.remoteAddress will be obtained from request connect.remoteAddress as fallback", () => {
        const handler = (req, res) => {
            req.connection = { remoteAddress: "http://localhost" };
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(serialized.remoteAddress, "http://localhost");
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.remoteAddress will be obtained from request info.remoteAddress if available", () => {
        const handler = (req, res) => {
            req.info = { remoteAddress: "http://localhost" };
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(serialized.remoteAddress, "http://localhost");
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.remotePort will be obtained from request connect.remotePort as fallback", () => {
        const handler = (req, res) => {
            req.connection = { remotePort: 3000 };
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(serialized.remotePort, 3000);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("req.remotePort will be obtained from request info.remotePort if available", () => {
        const handler = (req, res) => {
            req.info = { remotePort: 3000 };
            const serialized = serialazersReq.reqSerializer(req);
            assert.equal(serialized.remotePort, 3000);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });
});
