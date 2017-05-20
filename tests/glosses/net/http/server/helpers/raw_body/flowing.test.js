describe("glosses", "net", "http", "helper", "raw body", "stream flowing", () => {
    const {
        net: { http: { server: { helper: { getRawBody } } } },
        std: { stream: { Readable, Writable } }
    } = adone;
    const defaultLimit = 1024 * 1024;

    const createChunk = () => {
        const base = Math.random().toString(32);
        const KB_4 = 32 * 4;
        const KB_8 = KB_4 * 2;
        const KB_16 = KB_8 * 2;
        const KB_64 = KB_16 * 4;

        const rand = Math.random();
        if (rand < 0.25) {
            return base.repeat(KB_4);
        } else if (rand < 0.5) {
            return base.repeat(KB_8);
        } else if (rand < 0.75) {
            return base.repeat(KB_16);
        } 
        return base.repeat(KB_64);
        
    };

    const createBlackholeStream = () => {
        const stream = new Writable();
        stream._write = (chunk, encoding, cb) => cb();
        return stream;
    };

    const createInfiniteStream = (paused) => {
        const stream = new Readable();
        stream._read = () => {
            const rand = 2 + Math.floor(Math.random() * 10);

            setTimeout(() => {
                for (let i = 0; i < rand; i++) {
                    stream.push(createChunk());
                }
            }, 100);
        };

        // track paused state for tests
        stream.isPaused = false;
        stream.on("pause", function onPause() {
            this.isPaused = true;
        });
        stream.on("resume", function onResume() {
            this.isPaused = false;
        });

        // immediately put the stream in flowing mode
        if (!paused) {
            stream.resume();
        }

        return stream;
    };

    describe("when limit lower then length", () => {
        it("should stop the steam flow", async () => {
            const stream = createInfiniteStream();

            const err = await getRawBody(stream, {
                limit: defaultLimit,
                length: defaultLimit * 2
            }).then(() => null, (e) => e);

            assert.ok(err);
            assert.equal(err.type, "entity.too.large");
            assert.equal(err.message, "request entity too large");
            assert.equal(err.status, 413);
            assert.equal(err.length, defaultLimit * 2);
            assert.equal(err.limit, defaultLimit);
            assert.ok(stream.isPaused);
        });

        it("should halt flowing stream", async () => {
            const stream = createInfiniteStream(true);
            const dest = createBlackholeStream();

            stream.pipe(dest);

            const err = await getRawBody(stream, {
                limit: defaultLimit * 2,
                length: defaultLimit
            }).then(() => null, (e) => e);
            assert.ok(err);
            assert.equal(err.type, "entity.too.large");
            assert.equal(err.message, "request entity too large");
            assert.equal(err.status, 413);
            assert.ok(stream.isPaused);
        });
    });

    describe("when stream has encoding set", () => {
        it("should stop the steam flow", async () => {
            const stream = createInfiniteStream();
            stream.setEncoding("utf8");

            const err = await getRawBody(stream, {
                limit: defaultLimit
            }).then(() => null, (e) => e);

            assert.ok(err);
            assert.equal(err.type, "stream.encoding.set");
            assert.equal(err.message, "stream encoding should not be set");
            assert.equal(err.status, 500);
            assert.ok(stream.isPaused);
        });
    });

    describe("when stream has limit", () => {
        it("should stop the steam flow", async () => {
            const stream = createInfiniteStream();

            const err = await getRawBody(stream, {
                limit: defaultLimit
            }).then(() => null, (e) => e);

            assert.ok(err);
            assert.equal(err.type, "entity.too.large");
            assert.equal(err.status, 413);
            assert.ok(err.received > defaultLimit);
            assert.equal(err.limit, defaultLimit);
            assert.ok(stream.isPaused);
        });
    });

    describe("when stream has limit", () => {
        it("should stop the steam flow", async () => {
            const stream = createInfiniteStream();

            setTimeout(() => {
                stream.emit("error", new Error("BOOM"));
            }, 500);

            const err = await getRawBody(stream).then(() => null, (e) => e);

            assert.ok(err);
            assert.equal(err.message, "BOOM");
            assert.ok(stream.isPaused);

        });
    });
});
