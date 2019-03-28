const { once } = require("./helper");

const {
    app: { fastLogger },
    std: { path: { join } }
} = adone;

const test = (file) => {
    file = join("fixtures", "broken_pipe", file);
    it(file, { parallel: true }, async () => {
        const child = forkProcess(join(__dirname, file), [], { silent: true });
        child.stdout.destroy();

        child.stderr.pipe(process.stdout);

        const res = await once(child, "close");
        assert.equal(res, 0); // process exits successfully
    });
};


describe("fast logger", "broken pipe", () => {
    test("basic.js");
    test("destination.js");
    test("extreme.js");
    
    it("let error pass through", () => {
        const stream = fastLogger.destination();
    
        // side effect of the pino constructor is that it will set an
        // event handler for error
        fastLogger(stream);
    
        process.nextTick(() => stream.emit("error", new Error("kaboom")));
        process.nextTick(() => stream.emit("error", new Error("kaboom")));
    
        stream.on("error", (err) => {
            assert.equal(err.message, "kaboom");
        });
    });    
});
