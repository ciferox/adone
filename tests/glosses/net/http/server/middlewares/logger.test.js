describe("net", "http", "server", "middlewares", "logger", () => {
    const {
        net: { http: { server: { Server, middleware: { logger } } } },
        collection: { BufferList },
        util: { humanizeSize },
        fs, noop
    } = adone;

    const getLogger = () => {
        const buffer = new BufferList();
        return {
            middleware: logger({
                timestamp: false,
                sinks: [{
                    type: "stream",
                    stream: buffer,
                    argsSchema: [
                        { format: "%s" },
                        { format: "%s" },
                        { format: "%s" },
                        { format: "%s" },
                        { format: "%s" },
                        { format: "%s" }
                    ]
                }]
            }),
            buffer
        };
    };

    it("should print correct length", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use((ctx) => {
            ctx.body = Buffer.alloc(12345, "a");
        });

        await request(server).get("/");

        const buf = logger.buffer.slice(0, logger.buffer.length);

        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("---");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/");
        expect(parts[3]).to.be.equal("200");
        expect(parts[4]).to.match(/^\d+ms$/);
        expect(parts[5]).to.be.equal(humanizeSize(12345, ""));
    });

    it("should handle response streams", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use((ctx) => {
            ctx.body = fs.createReadStream(__filename);
        });

        await request(server).get("/");

        const buf = logger.buffer.slice(0, logger.buffer.length);

        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("---");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/");
        expect(parts[3]).to.be.equal("200");
        expect(parts[4]).to.match(/^\d+ms$/);

        const { size } = await fs.stat(__filename);
        expect(parts[5]).to.be.equal(humanizeSize(size, ""));
    });

    it("should mark closed socket", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use((ctx) => {
            ctx.body = fs.createReadStream(__filename);
        });

        await request(server).get("/").once("request socket", (socket) => {
            socket.end();
        }).catch(noop);

        const buf = logger.buffer.slice(0, logger.buffer.length);
        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("-x-");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/");
        expect(parts[3]).to.be.equal("200");
        expect(parts[4]).to.match(/^\d+ms$/);
        expect(parts[5]).to.be.equal("0B");
    });

    it("should mark errors", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use(() => {
            throw new Error("hello");
        });

        await request(server).get("/");

        const buf = logger.buffer.slice(0, logger.buffer.length);
        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("xxx");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/");
        expect(parts[3]).to.be.equal("-");
        expect(parts[4]).to.match(/^\d+ms$/);
        expect(parts[5]).to.be.equal("-");
    });

    it("should remove length mark if there is no body", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use((ctx) => {
            if (ctx.method === "HEAD") {
                ctx.status = 200;
                return;
            }
            ctx.status = 204;
        });
        {
            // get request
            await request(server).get("/");

            const buf = logger.buffer.slice(0, logger.buffer.length);
            const lines = buf.toString().trimRight().split("\n");
            expect(lines).to.have.lengthOf(1);

            const parts = lines[0].split(/\s/);

            expect(parts).to.have.lengthOf(5);
            expect(parts[0]).to.be.equal("---");
            expect(parts[1]).to.be.equal("GET");
            expect(parts[2]).to.be.equal("/");
            expect(parts[3]).to.be.equal("204");
            expect(parts[4]).to.match(/^\d+ms/);
        }
        {
            // head request
            await request(server).head("/");

            const buf = logger.buffer.slice(0, logger.buffer.length);
            const lines = buf.toString().trimRight().split("\n");
            expect(lines).to.have.lengthOf(2);

            const parts = lines[1].split(/\s/);

            expect(parts).to.have.lengthOf(6);
            expect(parts[0]).to.be.equal("---");
            expect(parts[1]).to.be.equal("HEAD");
            expect(parts[2]).to.be.equal("/");
            expect(parts[3]).to.be.equal("200");
            expect(parts[4]).to.match(/^\d+ms/);
        }
    });

    it("should the length as undefined", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use((ctx) => {
            ctx.status = 200;
            ctx.message = "hello";
        });

        await request(server).get("/");

        const buf = logger.buffer.slice(0, logger.buffer.length);

        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("---");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/");
        expect(parts[3]).to.be.equal("200");
        expect(parts[4]).to.match(/^\d+ms$/);
        expect(parts[5]).to.be.equal("-");
    });

    it("should print correct time", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use(async (ctx) => {
            await adone.promise.delay(500);
            ctx.body = "hello";
        });

        await request(server).get("/");

        const buf = logger.buffer.slice(0, logger.buffer.length);

        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("---");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/");
        expect(parts[3]).to.be.equal("200");

        expect(parts[4]).to.match(/^\d+ms$/);
        const time = parts[4].match(/^(\d+)ms/)[1];
        expect(Number(time)).to.be.at.least(500);
        expect(parts[5]).to.match(/^\d+/);
    });

    it("should print correct path", async () => {
        const server = new Server();
        const logger = getLogger();

        server.use(logger.middleware);
        server.use(async (ctx) => {
            ctx.body = "hello";
        });

        await request(server).get("/a/b/c/d/e/f");

        const buf = logger.buffer.slice(0, logger.buffer.length);

        const lines = buf.toString().trimRight().split("\n");
        expect(lines).to.have.lengthOf(1);

        const parts = lines[0].split(/\s/);

        expect(parts).to.have.lengthOf(6);
        expect(parts[0]).to.be.equal("---");
        expect(parts[1]).to.be.equal("GET");
        expect(parts[2]).to.be.equal("/a/b/c/d/e/f");
        expect(parts[3]).to.be.equal("200");
        expect(parts[4]).to.match(/^\d+ms$/);
        expect(parts[5]).to.match(/^\d+/);
    });
});
