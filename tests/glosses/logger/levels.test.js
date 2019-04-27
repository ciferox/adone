const { sink, once, check } = require("./helper");

describe("levels", () => {
    it("set the level by string", async () => {
        const expected = [{
            level: 50,
            msg: "this is an error"
        }, {
            level: 60,
            msg: "this is fatal"
        }];
        const stream = sink();
        const instance = adone.logger(stream);
        instance.level = "error";
        instance.info("hello world");
        instance.error("this is an error");
        instance.fatal("this is fatal");
        const result = await once(stream, "data");
        const current = expected.shift();
        check(result, current.level, current.msg);
    });

    it("the wrong level throws", async () => {
        const instance = adone.logger();
        assert.throws(() => {
            instance.level = "kaboom";
        });
    });

    it("set the level by number", async () => {
        const expected = [{
            level: 50,
            msg: "this is an error"
        }, {
            level: 60,
            msg: "this is fatal"
        }];
        const stream = sink();
        const instance = adone.logger(stream);

        instance.level = 50;
        instance.info("hello world");
        instance.error("this is an error");
        instance.fatal("this is fatal");
        const result = await once(stream, "data");
        const current = expected.shift();
        check(result, current.level, current.msg);
    });

    it("exposes level string mappings", async () => {
        assert.equal(adone.logger.levels.values.error, 50);
    });

    it("exposes level number mappings", async () => {
        assert.equal(adone.logger.levels.labels[50], "error");
    });

    it("returns level integer", async () => {
        const instance = adone.logger({ level: "error" });
        assert.equal(instance.levelVal, 50);
    });

    it("child returns level integer", async () => {
        const parent = adone.logger({ level: "error" });
        const child = parent.child({ foo: "bar" });
        assert.equal(child.levelVal, 50);
    });

    it("set the level via exported pino function", async () => {
        const expected = [{
            level: 50,
            msg: "this is an error"
        }, {
            level: 60,
            msg: "this is fatal"
        }];
        const stream = sink();
        const instance = adone.logger({ level: "error" }, stream);

        instance.info("hello world");
        instance.error("this is an error");
        instance.fatal("this is fatal");
        const result = await once(stream, "data");
        const current = expected.shift();
        check(result, current.level, current.msg);
    });

    it("level-change event", async () => {
        const instance = adone.logger();
        const handle = (lvl, val, prevLvl, prevVal) => {
            assert.equal(lvl, "trace");
            assert.equal(val, 10);
            assert.equal(prevLvl, "info");
            assert.equal(prevVal, 30);
        };
        instance.on("level-change", handle);
        instance.level = "trace";
        instance.removeListener("level-change", handle);
        instance.level = "info";

        let count = 0;

        const l1 = () => count++;
        const l2 = () => count++;
        const l3 = () => count++;
        instance.on("level-change", l1);
        instance.on("level-change", l2);
        instance.on("level-change", l3);

        instance.level = "trace";
        instance.removeListener("level-change", l3);
        instance.level = "fatal";
        instance.removeListener("level-change", l1);
        instance.level = "debug";
        instance.removeListener("level-change", l2);
        instance.level = "info";

        assert.equal(count, 6);
    });

    it("enable", async () => {
        const instance = adone.logger({
            level: "trace",
            enabled: false
        }, sink((result, enc) => {
            assert.fail("no data should be logged");
        }));

        Object.keys(adone.logger.levels.values).forEach((level) => {
            instance[level]("hello world");
        });
    });

    it("silent level", async () => {
        const instance = adone.logger({
            level: "silent"
        }, sink((result, enc) => {
            assert.fail("no data should be logged");
        }));

        Object.keys(adone.logger.levels.values).forEach((level) => {
            instance[level]("hello world");
        });
    });

    it("set silent via Infinity", async () => {
        const instance = adone.logger({
            level: Infinity
        }, sink((result, enc) => {
            assert.fail("no data should be logged");
        }));

        Object.keys(adone.logger.levels.values).forEach((level) => {
            instance[level]("hello world");
        });
    });

    it("exposed levels", async () => {
        assert.deepEqual(Object.keys(adone.logger.levels.values), [
            "trace",
            "debug",
            "info",
            "warn",
            "error",
            "fatal"
        ]);
    });

    it("exposed labels", async () => {
        assert.deepEqual(Object.keys(adone.logger.levels.labels), [
            "10",
            "20",
            "30",
            "40",
            "50",
            "60"
        ]);
    });

    it("setting level in child", async () => {
        const expected = [{
            level: 50,
            msg: "this is an error"
        }, {
            level: 60,
            msg: "this is fatal"
        }];
        const instance = adone.logger(sink((result, enc, cb) => {
            const current = expected.shift();
            check(result, current.level, current.msg);
            cb();
        })).child({ level: 30 });

        instance.level = "error";
        instance.info("hello world");
        instance.error("this is an error");
        instance.fatal("this is fatal");
    });

    it("setting level by assigning a number to level", async () => {
        const instance = adone.logger();
        assert.equal(instance.levelVal, 30);
        assert.equal(instance.level, "info");
        instance.level = 50;
        assert.equal(instance.levelVal, 50);
        assert.equal(instance.level, "error");
    });

    it("setting level by number to unknown value results in a throw", async () => {
        const instance = adone.logger();
        assert.throws(() => {
            instance.level = 973;
        });
    });

    it("setting level by assigning a known label to level", async () => {
        const instance = adone.logger();
        assert.equal(instance.levelVal, 30);
        assert.equal(instance.level, "info");
        instance.level = "error";
        assert.equal(instance.levelVal, 50);
        assert.equal(instance.level, "error");
    });

    it("levelVal is read only", async () => {
        const instance = adone.logger();
        assert.throws(() => {
            instance.levelVal = 20;
        });
    });

    it("produces labels when told to", async () => {
        const expected = [{
            level: "info",
            msg: "hello world"
        }];
        const instance = adone.logger({ useLevelLabels: true }, sink((result, enc, cb) => {
            const current = expected.shift();
            check(result, current.level, current.msg);
            cb();
        }));

        instance.info("hello world");
    });

    it("changes label naming when told to", async () => {
        const expected = [{
            priority: 30,
            msg: "hello world"
        }];
        const instance = adone.logger({ changeLevelName: "priority" }, sink((result, enc, cb) => {
            const current = expected.shift();
            assert.equal(result.priority, current.priority);
            assert.equal(result.msg, current.msg);
            cb();
        }));

        instance.info("hello world");
    });

    it("children produce labels when told to", async () => {
        const expected = [
            {
                level: "info",
                msg: "child 1"
            },
            {
                level: "info",
                msg: "child 2"
            }
        ];
        const instance = adone.logger({ useLevelLabels: true }, sink((result, enc, cb) => {
            const current = expected.shift();
            check(result, current.level, current.msg);
            cb();
        }));

        const child1 = instance.child({ name: "child1" });
        const child2 = child1.child({ name: "child2" });

        child1.info("child 1");
        child2.info("child 2");
    });

    it("produces labels for custom levels", async () => {
        const expected = [
            {
                level: "info",
                msg: "hello world"
            },
            {
                level: "foo",
                msg: "foobar"
            }
        ];
        const opts = {
            useLevelLabels: true,
            customLevels: {
                foo: 35
            }
        };
        const instance = adone.logger(opts, sink((result, enc, cb) => {
            const current = expected.shift();
            check(result, current.level, current.msg);
            cb();
        }));

        instance.info("hello world");
        instance.foo("foobar");
    });

    it("setting changeLevelName does not affect labels when told to", async () => {
        const instance = adone.logger(
            {
                useLevelLabels: true,
                changeLevelName: "priority"
            },
            sink((result, enc, cb) => {
                assert.equal(result.priority, "info");
                cb();
            })
        );

        instance.info("hello world");
    });

    it("throws when creating a default label that does not exist in logger levels", async () => {
        const defaultLevel = "foo";
        assert.throws(() => {
            adone.logger({
                customLevels: {
                    bar: 5
                },
                level: defaultLevel
            });
        });
        try {
            adone.logger({
                level: defaultLevel
            });
        } catch ({ message }) {
            assert.equal(message, `default level:${defaultLevel} must be included in custom levels`);
        }
    });

    it("throws when creating a default value that does not exist in logger levels", async () => {
        const defaultLevel = 15;
        assert.throws(() => {
            adone.logger({
                customLevels: {
                    bar: 5
                },
                level: defaultLevel
            });
        });
        try {
            adone.logger({
                level: defaultLevel
            });
        } catch ({ message }) {
            assert.equal(message, `default level:${defaultLevel} must be included in custom levels`);
        }
    });

    it("throws when creating a default value that does not exist in logger levels", async () => {
        assert.throws(() => {
            adone.logger({
                customLevels: {
                    foo: 5
                },
                useOnlyCustomLevels: true
            });
        });
        try {
            adone.logger({
                customLevels: {
                    foo: 5
                },
                useOnlyCustomLevels: true
            });
        } catch ({ message }) {
            assert.equal(message, "default level:info must be included in custom levels");
        }
    });

    it("passes when creating a default value that exists in logger levels", async () => {
        adone.logger({
            level: 30
        });
    });
});
