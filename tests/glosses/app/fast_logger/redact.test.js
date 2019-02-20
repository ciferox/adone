const { sink, once } = require("./helper");

const {
    app: { fastLogger }
} = adone;

describe("fastLogger", "redact", () => {
    it("redact option – throws if not array", () => {
        assert.throws(() => {
            fastLogger({ redact: "req.headers.cookie" });
        });
    });
  
    it("redact option – throws if array does not only contain strings", () => {
        assert.throws(() => {
            fastLogger({ redact: ["req.headers.cookie", {}] });
        });
    });
  
    it("redact option – throws if array contains an invalid path", () => {
        assert.throws(() => {
            fastLogger({ redact: ["req,headers.cookie"] });
        });
    });
  
    it("redact.paths option – throws if not array", () => {
        assert.throws(() => {
            fastLogger({ redact: { paths: "req.headers.cookie" } });
        });
    });
  
    it("redact.paths option – throws if array does not only contain strings", () => {
        assert.throws(() => {
            fastLogger({ redact: { paths: ["req.headers.cookie", {}] } });
        });
    });
  
    it("redact.paths option – throws if array contains an invalid path", () => {
        assert.throws(() => {
            fastLogger({ redact: { paths: ["req,headers.cookie"] } });
        });
    });
  
    it("redact option – top level key", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["key"] }, stream);
        instance.info({
            key: { redact: "me" }
        });
        const { key } = await once(stream, "data");
        assert.equal(key, "[Redacted]");
    });
  
    it("redact option – object", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["req.headers.cookie"] }, stream);
        instance.info({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "[Redacted]");
    });
  
    it("redact option – child object", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["req.headers.cookie"] }, stream);
        instance.child({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        }).info("message completed");
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "[Redacted]");
    });
  
    it("redact option – interpolated object", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["req.headers.cookie"] }, stream);
  
        instance.info("test", {
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { msg } = await once(stream, "data");
        assert.equal(JSON.parse(msg.replace(/test /, "")).req.headers.cookie, "[Redacted]");
    });
  
    it("redact.paths option – object", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"] } }, stream);
        instance.info({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "[Redacted]");
    });
  
    it("redact.paths option – child object", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"] } }, stream);
        instance.child({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        }).info("message completed");
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "[Redacted]");
    });
  
    it("redact.paths option – interpolated object", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"] } }, stream);
  
        instance.info("test", {
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { msg } = await once(stream, "data");
        assert.equal(JSON.parse(msg.replace(/test /, "")).req.headers.cookie, "[Redacted]");
    });
  
    it("redact.censor option – sets the redact value", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"], censor: "test" } }, stream);
        instance.info({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "test");
    });
  
    it("redact.remove option – removes both key and value", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"], remove: true } }, stream);
        instance.info({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { req } = await once(stream, "data");
        assert.false("cookie" in req.headers);
    });
  
    it("redact.remove – top level key", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["key"], remove: true } }, stream);
        instance.info({
            key: { redact: "me" }
        });
        const o = await once(stream, "data");
        assert.false("key" in o);
    });
  
    it("redact.remove – top level key in child logger", async () => {
        const stream = sink();
        const opts = { redact: { paths: ["key"], remove: true } };
        const instance = fastLogger(opts, stream).child({ key: { redact: "me" } });
        instance.info("test");
        const o = await once(stream, "data");
        assert.false("key" in o);
    });
  
    it("redact.paths preserves original object values after the log write", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["req.headers.cookie"] }, stream);
        const obj = {
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.req.headers.cookie, "[Redacted]");
        assert.equal(obj.req.headers.cookie, "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;");
    });
  
    it("redact.paths preserves original object values after the log write", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"] } }, stream);
        const obj = {
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.req.headers.cookie, "[Redacted]");
        assert.equal(obj.req.headers.cookie, "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;");
    });
  
    it("redact.censor preserves original object values after the log write", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"], censor: "test" } }, stream);
        const obj = {
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.req.headers.cookie, "test");
        assert.equal(obj.req.headers.cookie, "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;");
    });
  
    it("redact.remove preserves original object values after the log write", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: { paths: ["req.headers.cookie"], remove: true } }, stream);
        const obj = {
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.false("cookie" in o.req.headers);
        assert.true("cookie" in obj.req.headers);
    });
  
    it("redact – supports last position wildcard paths", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["req.headers.*"] }, stream);
        instance.info({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "[Redacted]");
        assert.equal(req.headers.host, "[Redacted]");
        assert.equal(req.headers.connection, "[Redacted]");
    });
  
    it("redact – supports intermediate wildcard paths", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["req.*.cookie"] }, stream);
        instance.info({
            req: {
                id: 7915,
                method: "GET",
                url: "/",
                headers: {
                    host: "localhost:3000",
                    connection: "keep-alive",
                    cookie: "SESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1;"
                },
                remoteAddress: "::ffff:127.0.0.1",
                remotePort: 58022
            }
        });
        const { req } = await once(stream, "data");
        assert.equal(req.headers.cookie, "[Redacted]");
    });
  
    it("redacts numbers at the top level", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["id"] }, stream);
        const obj = {
            id: 7915
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.id, "[Redacted]");
    });
  
    it("redacts booleans at the top level", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["maybe"] }, stream);
        const obj = {
            maybe: true
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.maybe, "[Redacted]");
    });
  
    it("redacts strings at the top level", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["s"] }, stream);
        const obj = {
            s: "s"
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.s, "[Redacted]");
    });
  
    it("does not redact primitives if not objects", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["a.b"] }, stream);
        const obj = {
            a: 42
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.a, 42);
    });
  
    it("redacts null at the top level", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ["n"] }, stream);
        const obj = {
            n: null
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.n, "[Redacted]");
    });
  
    it("supports bracket notation", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ['a["b-b"]'] }, stream);
        const obj = {
            a: { "b-b": "c" }
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o.a["b-b"], "[Redacted]");
    });
  
    it("supports leading bracket notation", async () => {
        const stream = sink();
        const instance = fastLogger({ redact: ['["a-a"].b'] }, stream);
        const obj = {
            "a-a": { b: "c" }
        };
        instance.info(obj);
        const o = await once(stream, "data");
        assert.equal(o["a-a"].b, "[Redacted]");
    });  
});
