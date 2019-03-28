const {
    logging: { fastLogger }
} = adone;

const { join } = require("path");
const { fork } = require("child_process");
const { once } = require("./helper");

describe.todo("broken pipe", () => {

    const test = function (file) {
        file = join(__dirname, "fixtures", "broken-pipe", file);
        it(file, { parallel: true }, async () => {
            const child = fork(join(__dirname, file), { silent: true });
            child.stdout.destroy();

            child.stderr.pipe(process.stdout);

            const res = await once(child, "close");
            assert.equal(res, 0); // process exits successfully
        });
    };

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
