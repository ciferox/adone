const { sink, once } = require("./helper");

const {
    app: { fastLogger },
    std: { http, os }
} = adone;

const { pid } = process;
const hostname = os.hostname();

describe("fast report", "http", () => {
    it("http request support", async () => {
        let originalReq;
        const instance = fastLogger(sink((chunk, enc) => {
            assert.ok(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.deepEqual(chunk, {
                pid,
                hostname,
                level: 30,
                msg: "my request",
                v: 1,
                req: {
                    method: originalReq.method,
                    url: originalReq.url,
                    headers: originalReq.headers,
                    remoteAddress: originalReq.connection.remoteAddress,
                    remotePort: originalReq.connection.remotePort
                }
            });
        }));
    
        const server = http.createServer((req, res) => {
            originalReq = req;
            instance.info(req, "my request");
            res.end("hello");
        });
        server.unref();
        server.listen();
        const err = await once(server, "listening");
        assert.undefined(err);
        const res = await once(http.get(`http://localhost:${ server.address().port}`), "response");
        res.resume();
        server.close();
    });
    
    it("http request support via serializer", async () => {
        let originalReq;
        const instance = fastLogger({
            serializers: {
                req: fastLogger.stdSerializers.req
            }
        }, sink((chunk, enc) => {
            assert.ok(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.deepEqual(chunk, {
                pid,
                hostname,
                level: 30,
                msg: "my request",
                v: 1,
                req: {
                    method: originalReq.method,
                    url: originalReq.url,
                    headers: originalReq.headers,
                    remoteAddress: originalReq.connection.remoteAddress,
                    remotePort: originalReq.connection.remotePort
                }
            });
        }));
    
        const server = http.createServer((req, res) => {
            originalReq = req;
            instance.info({ req }, "my request");
            res.end("hello");
        });
        server.unref();
        server.listen();
        const err = await once(server, "listening");
        assert.undefined(err);
    
        const res = await once(http.get(`http://localhost:${server.address().port}`), "response");
        res.resume();
        server.close();
    });
    
    it("http request support via serializer without request connection", async () => {
        let originalReq;
        const instance = fastLogger({
            serializers: {
                req: fastLogger.stdSerializers.req
            }
        }, sink((chunk, enc) => {
            assert.ok(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.deepEqual(chunk, {
                pid,
                hostname,
                level: 30,
                msg: "my request",
                v: 1,
                req: {
                    method: originalReq.method,
                    url: originalReq.url,
                    headers: originalReq.headers
                }
            });
        }));
    
        const server = http.createServer((req, res) => {
            originalReq = req;
            delete req.connection;
            instance.info({ req }, "my request");
            res.end("hello");
        });
        server.unref();
        server.listen();
        const err = await once(server, "listening");
        assert.undefined(err);
    
        const res = await once(http.get(`http://localhost:${server.address().port}`), "response");
        res.resume();
        server.close();
    });
    
    it("http response support", async () => {
        let originalRes;
        const instance = fastLogger(sink((chunk, enc) => {
            assert.ok(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.deepEqual(chunk, {
                pid,
                hostname,
                level: 30,
                msg: "my response",
                v: 1,
                res: {
                    statusCode: originalRes.statusCode,
                    headers: originalRes._headers
                }
            });
        }));
    
        const server = http.createServer((req, res) => {
            originalRes = res;
            res.end("hello");
            instance.info(res, "my response");
        });
        server.unref();
        server.listen();
        const err = await once(server, "listening");
    
        assert.undefined(err);
    
        const res = await once(http.get(`http://localhost:${server.address().port}`), "response");
        res.resume();
        server.close();
    });
    
    it("http response support via a serializer", async () => {
        const instance = fastLogger({
            serializers: {
                res: fastLogger.stdSerializers.res
            }
        }, sink((chunk, enc) => {
            assert.ok(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.deepEqual(chunk, {
                pid,
                hostname,
                level: 30,
                msg: "my response",
                v: 1,
                res: {
                    statusCode: 200,
                    headers: {
                        "x-single": "y",
                        "x-multi": [1, 2]
                    }
                }
            });
        }));
    
        const server = http.createServer((req, res) => {
            res.setHeader("x-single", "y");
            res.setHeader("x-multi", [1, 2]);
            res.end("hello");
            instance.info({ res }, "my response");
        });
    
        server.unref();
        server.listen();
        const err = await once(server, "listening");
        assert.undefined(err);
    
        const res = await once(http.get(`http://localhost:${server.address().port}`), "response");
        res.resume();
        server.close();
    });
    
    it("http request support via serializer in a child", async () => {
        let originalReq;
        const instance = fastLogger({
            serializers: {
                req: fastLogger.stdSerializers.req
            }
        }, sink((chunk, enc) => {
            assert.ok(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.deepEqual(chunk, {
                pid,
                hostname,
                level: 30,
                msg: "my request",
                v: 1,
                req: {
                    method: originalReq.method,
                    url: originalReq.url,
                    headers: originalReq.headers,
                    remoteAddress: originalReq.connection.remoteAddress,
                    remotePort: originalReq.connection.remotePort
                }
            });
        }));
    
        const server = http.createServer((req, res) => {
            originalReq = req;
            const child = instance.child({ req });
            child.info("my request");
            res.end("hello");
        });
    
        server.unref();
        server.listen();
        const err = await once(server, "listening");
        assert.undefined(err);
    
        const res = await once(http.get(`http://localhost:${server.address().port}`), "response");
        res.resume();
        server.close();
    });    
});
