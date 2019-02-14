const writer = require("flush-write-stream");
const { once } = require("./helper");

const {
    std: { os, path: { join }, fs: { createWriteStream } }
} = adone;

describe("app", "fast logger", "extreme", () => {
    let now;
    let hostname;
    let proc;

    before(async () => {
        // Initialize realm runtime stuff like `adone.runtime.config`.
        await adone.realm.getManager().initialize();
    });

    beforeEach(() => {
        now = Date.now;
        hostname = os.hostname;
        proc = process;
    });
    afterEach(() => {
        os.hostname = hostname;
        Date.now = now;
        global.process = proc;
    });

    it("extreme mode", async () => {
        global.process = {
            __proto__: process,
            pid: 123456
        };
        Date.now = () => 1459875739796;
        os.hostname = () => "abcdefghijklmnopqr";
        const loggerPath = adone.std.path.join(adone.runtime.config.ROOT_PATH, "lib/glosses/app/fast_logger");
        delete require.cache[loggerPath];
        const fastLogger = require(loggerPath);
        let expected = "";
        let actual = "";
        const normal = fastLogger(writer((s, enc, cb) => {
            expected += s;
            cb();
        }));
    
        const dest = createWriteStream("/dev/null");
        dest.write = (s) => {
            actual += s;
        };
        const extreme = fastLogger(dest);
    
        let i = 44;
        while (i--) {
            normal.info("h");
            extreme.info("h");
        }
    
        const expected2 = expected.split("\n")[0];
        let actual2 = "";
    
        const child = forkProcess(join(__dirname, "/fixtures/extreme.js"), [], { silent: true });
        child.stdout.pipe(writer((s, enc, cb) => {
            actual2 += s;
            cb();
        }));
        await once(child, "close");
        assert.equal(actual, expected);
        assert.equal(actual2.trim(), expected2);
    });
    
    it("extreme mode with child", async () => {
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

        const loggerPath = adone.std.path.join(adone.runtime.config.ROOT_PATH, "lib/glosses/app/fast_logger");
        delete require.cache[loggerPath];
        const fastLogger = require(loggerPath);
        // delete require.cache[require.resolve("../")];

        let expected = "";
        let actual = "";
        const normal = fastLogger(writer((s, enc, cb) => {
            expected += s;
            cb();
        })).child({ hello: "world" });
    
        const dest = createWriteStream("/dev/null");
        dest.write = function (s) {
            actual += s; 
        };
        const extreme = fastLogger(dest).child({ hello: "world" });
    
        let i = 500;
        while (i--) {
            normal.info("h");
            extreme.info("h");
        }
    
        extreme.flush();
    
        const expected2 = expected.split("\n")[0];
        let actual2 = "";
    
        const child = forkProcess(join(__dirname, "/fixtures/extreme_child.js"), [], { silent: true });
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
            adone.app.fastLogger({ extreme: true });
        });
    });
    
    it("flush does nothing without extreme mode", async () => {
        const instance = adone.app.fastLogger();
        instance.flush();
    });    
});
