

const os = require("os");
const { createWriteStream } = require("fs");
const { join } = require("path");
const { fork } = require("child_process");
const writer = require("flush-write-stream");
const { once, getPathToNull } = require("./helper");

describe("extreme", () => {
    let now;
    let hostname;
    let proc;

    afterEach(() => {
        os.hostname = hostname;
        Date.now = now;
        global.process = proc;
    });

    it("extreme mode", async () => {
        now = Date.now;
        hostname = os.hostname;
        proc = process;
        global.process = {
            __proto__: process,
            pid: 123456
        };
        Date.now = () => 1459875739796;
        os.hostname = () => "abcdefghijklmnopqr";
        adone.module.require.uncache(join(adone.ROOT_PATH, "lib", "glosses", "logger", "index.js"));
        const logger = require(join(adone.ROOT_PATH, "lib", "glosses", "logger", "index.js"));
        let expected = "";
        let actual = "";
        const normal = logger(writer((s, enc, cb) => {
            expected += s;
            cb();
        }));

        const dest = createWriteStream(getPathToNull());
        dest.write = (s) => {
            actual += s;
        };
        const extreme = logger(dest);

        let i = 44;
        while (i--) {
            normal.info("h");
            extreme.info("h");
        }

        const expected2 = expected.split("\n")[0];
        let actual2 = "";

        const child = fork(join(__dirname, "/fixtures/extreme.js"), { silent: true });
        child.stdout.pipe(writer((s, enc, cb) => {
            actual2 += s;
            cb();
        }));
        await once(child, "close");
        assert.equal(actual, expected);
        assert.equal(actual2.trim(), expected2);
    });

    it("extreme mode with child", async () => {
        now = Date.now;
        hostname = os.hostname;
        proc = process;
        global.process = {
            __proto__: process,
            pid: 123456
        };
        Date.now = function () {
            return 1459875739796;
        };
        os.hostname = function () {
            return "abcdefghijklmnopqr";
        };
        adone.module.require.uncache(join(adone.ROOT_PATH, "lib", "glosses", "logger", "index.js"));
        const logger = require(join(adone.ROOT_PATH, "lib", "glosses", "logger", "index.js"));
        let expected = "";
        let actual = "";
        const normal = logger(writer((s, enc, cb) => {
            expected += s;
            cb();
        })).child({ hello: "world" });

        const dest = createWriteStream(getPathToNull());
        dest.write = function (s) {
            actual += s;
        };
        const extreme = logger(dest).child({ hello: "world" });

        let i = 500;
        while (i--) {
            normal.info("h");
            extreme.info("h");
        }

        extreme.flush();

        const expected2 = expected.split("\n")[0];
        let actual2 = "";

        const child = fork(join(__dirname, "/fixtures/extreme_child.js"), { silent: true });
        child.stdout.pipe(writer((s, enc, cb) => {
            actual2 += s;
            cb();
        }));
        await once(child, "close");
        assert.equal(actual, expected);
        assert.equal(actual2.trim(), expected2);
    });

    it("throw an error if extreme is passed", async () => {
        assert.throws(() => {
            adone.logger({ extreme: true });
        });
    });

    it("flush does nothing without extreme mode", async () => {
        adone.logger().flush();
    });
});
