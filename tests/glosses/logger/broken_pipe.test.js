const {
    logger,
    path: { join },
    std: { childProcess: { fork } }
} = adone;

const { once } = require("./helper");

const test = (file) => {
    file = join("fixtures", "broken_pipe", file);
    it(file, { parallel: true }, async () => {
        const child = fork(join(__dirname, file), { silent: true });
        child.stdout.destroy();

        child.stderr.pipe(process.stdout);

        const res = await once(child, "close");
        assert.equal(res, 0); // process exits successfully
    });
};

// t.jobs = 42;

describe("broken pipe", () => {
    test("basic.js");
    test("destination.js");
    test("extreme.js");

    it("let error pass through", (done) => {
        expect(3).checks(done);
        const stream = logger.destination();

        // side effect of the pino constructor is that it will set an
        // event handler for error
        logger(stream);

        process.nextTick(() => stream.emit("error", new Error("kaboom")));
        process.nextTick(() => stream.emit("error", new Error("kaboom")));

        stream.on("error", (err) => {
            expect(err.message).to.be.equal("kaboom").mark();
        });
    });
});
