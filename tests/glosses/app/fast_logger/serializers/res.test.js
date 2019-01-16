const {
    app: { fastLogger: { stdSerializers: { res: resSerializer, wrapResponseSerializer } } },
    std: { http }
} = adone;

describe("app", "fastLogger", "serializers", "res", () => {
    let server;

    afterEach(() => {
        server.close();
    });

    it("res.raw is not enumerable", () => {
        const handler = (req, res) => {
            const serialized = resSerializer(res);
            assert.false(serialized.propertyIsEnumerable("raw"));
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("res.raw is available", () => {
        const handler = (req, res) => {
            res.statusCode = 200;
            const serialized = resSerializer(res);
            assert.ok(serialized.raw);
            assert.equal(serialized.raw.statusCode, 200);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("can wrap response serializers", () => {
        const serializer = wrapResponseSerializer((res) => {
            assert.ok(res.statusCode);
            assert.equal(res.statusCode, 200);
            delete res.statusCode;
            return res;
        });

        const handler = (req, res) => {
            res.statusCode = 200;
            const serialized = serializer(res);
            assert.notOk(serialized.statusCode);
            res.end();
        };

        server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });

    it("res.headers is serialized", () => {
        const handler = (req, res) => {
            res.setHeader("x-custom", "y");
            const serialized = resSerializer(res);
            assert.equal(serialized.headers["x-custom"], "y");
            res.end();
        };

        const server = http.createServer(handler);
        server.unref();
        server.listen(0, () => {
            http.get(server.address(), () => { });
        });
    });
});
