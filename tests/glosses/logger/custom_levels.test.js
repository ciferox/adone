const { sink, once } = require("./helper");

describe("custom levels", () => {
    it("adds additional levels", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                foo: 35,
                bar: 45
            }
        }, stream);

        logger.foo("test");
        const { level } = await once(stream, "data");
        assert.equal(level, 35);
    });

    it("custom levels does not override default levels", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                foo: 35
            }
        }, stream);

        logger.info("test");
        const { level } = await once(stream, "data");
        assert.equal(level, 30);
    });

    it("default levels can be redefined using custom levels", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                info: 35,
                debug: 45
            },
            useOnlyCustomLevels: true
        }, stream);

        assert.equal(logger.hasOwnProperty("info"), true);

        logger.info("test");
        const { level } = await once(stream, "data");
        assert.equal(level, 35);
    });

    it("custom levels overrides default level label if use useOnlyCustomLevels", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                foo: 35
            },
            useOnlyCustomLevels: true,
            level: "foo"
        }, stream);

        assert.equal(logger.hasOwnProperty("info"), false);
    });

    it("custom levels overrides default level value if use useOnlyCustomLevels", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                foo: 35
            },
            useOnlyCustomLevels: true,
            level: 35
        }, stream);

        assert.equal(logger.hasOwnProperty("info"), false);
    });

    it("custom levels are inherited by children", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                foo: 35
            }
        }, stream);

        logger.child({ childMsg: "ok" }).foo("test");
        const { msg, childMsg, level } = await once(stream, "data");
        assert.equal(level, 35);
        assert.equal(childMsg, "ok");
        assert.equal(msg, "test");
    });

    it("custom levels can be specified on child bindings", async () => {
        const stream = sink();
        const logger = adone.logger(stream).child({
            customLevels: {
                foo: 35
            },
            childMsg: "ok"
        });

        logger.foo("test");
        const { msg, childMsg, level } = await once(stream, "data");
        assert.equal(level, 35);
        assert.equal(childMsg, "ok");
        assert.equal(msg, "test");
    });

    it("customLevels property child bindings does not get logged", async () => {
        const stream = sink();
        const logger = adone.logger(stream).child({
            customLevels: {
                foo: 35
            },
            childMsg: "ok"
        });

        logger.foo("test");
        const { customLevels } = await once(stream, "data");
        assert.equal(customLevels, undefined);
    });

    it("throws when specifying pre-existing parent labels via child bindings", async () => {
        const stream = sink();
        assert.throws(() => adone.logger({
            customLevels: {
                foo: 35
            }
        }, stream).child({
            customLevels: {
                foo: 45
            }
        }));
        try {
            adone.logger({
                customLevels: {
                    foo: 35
                }
            }, stream).child({
                customLevels: {
                    foo: 45
                }
            });
        } catch ({ message }) {
            assert.equal(message, "levels cannot be overridden");
        }
    });

    it("throws when specifying pre-existing parent values via child bindings", async () => {
        const stream = sink();
        assert.throws(() => adone.logger({
            customLevels: {
                foo: 35
            }
        }, stream).child({
            customLevels: {
                bar: 35
            }
        })
        );
        try {
            adone.logger({
                customLevels: {
                    foo: 35
                }
            }, stream).child({
                customLevels: {
                    bar: 35
                }
            });
        } catch ({ message }) {
            assert.equal(message, "pre-existing level values cannot be used for new levels");
        }
    });

    it("throws when specifying core values via child bindings", async () => {
        const stream = sink();
        assert.throws(() => adone.logger(stream).child({
            customLevels: {
                foo: 30
            }
        })
        );
        try {
            adone.logger(stream).child({
                customLevels: {
                    foo: 30
                }
            });
        } catch ({ message }) {
            assert.equal(message, "pre-existing level values cannot be used for new levels");
        }
    });

    it("throws when useOnlyCustomLevels is set true without customLevels", async () => {
        const stream = sink();
        assert.throws(() => adone.logger({
            useOnlyCustomLevels: true
        }, stream)
        );
        try {
            adone.logger({
                useOnlyCustomLevels: true
            }, stream);
        } catch ({ message }) {
            assert.equal(message, "customLevels is required if useOnlyCustomLevels is set true");
        }
    });

    it("custom level on one instance does not affect other instances", async () => {
        adone.logger({
            customLevels: {
                foo: 37
            }
        });
        assert.equal(typeof adone.logger().foo, "undefined");
    });

    it("setting level below or at custom level will successfully log", async () => {
        const stream = sink();
        const instance = adone.logger({ customLevels: { foo: 35 } }, stream);
        instance.level = "foo";
        instance.info("nope");
        instance.foo("bar");
        const { msg } = await once(stream, "data");
        assert.equal(msg, "bar");
    });

    it("custom level below level threshold will not log", async () => {
        const stream = sink();
        const instance = adone.logger({ customLevels: { foo: 15 } }, stream);
        instance.level = "info";
        instance.info("bar");
        instance.foo("nope");
        const { msg } = await once(stream, "data");
        assert.equal(msg, "bar");
    });

    it("does not share custom level state across siblings", async () => {
        const stream = sink();
        const logger = adone.logger(stream);
        logger.child({
            customLevels: { foo: 35 }
        });
        logger.child({
            customLevels: { foo: 35 }
        });
    });

    it("custom level does not affect changeLevelName", async () => {
        const stream = sink();
        const logger = adone.logger({
            customLevels: {
                foo: 35,
                bar: 45
            },
            changeLevelName: "priority"
        }, stream);

        logger.foo("test");
        const { priority } = await once(stream, "data");
        assert.equal(priority, 35);
    });
});
