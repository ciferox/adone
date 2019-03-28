const {
    is,
    data,
    text: { stripAnsi },
    cli: { chalk }
} = adone;

describe("app", "logger", "formats", () => {
    describe("cli", () => {
        const {
            assumeFormatted,
            infoify,
            setupLevels
        } = require("./helpers");

        const {
            logging: { logger: { LEVEL, MESSAGE, format: { cli } } }
        } = adone;

        before(setupLevels);

        it("cli() (default) sets info[MESSAGE]", assumeFormatted(
            cli(),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, "     whatever");

                assert.isString(info[LEVEL]);
                assert.isString(info[MESSAGE]);
                assert.equal(info[LEVEL], "info");
                assert.equal(info[MESSAGE], `${chalk.green("info")}:     whatever`);
            }
        ));
    });


    describe("colorize", () => {
        const {
            logging: { logger: { MESSAGE, LEVEL, format: { colorize } } }
        } = adone;

        const { Colorizer } = colorize;
        const {
            assumeFormatted,
            infoify,
            setupLevels
        } = require("./helpers");


        before(setupLevels);

        it("colorize() (default)", assumeFormatted(
            colorize(),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, "whatever");
            }
        ));

        it("colorize({ level: true })", assumeFormatted(
            colorize({ level: true }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, "whatever");
            }
        ));

        it("colorize{ message: true })", assumeFormatted(
            colorize({ message: true }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, chalk.green("whatever"));
            }
        ));

        it("colorize({ level: true, message: true })", assumeFormatted(
            colorize({ level: true, message: true }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, chalk.green("whatever"));
            }
        ));

        it("colorize({ all: true })", assumeFormatted(
            colorize({ all: true }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, chalk.green("whatever"));
            }
        ));

        it("colorize({ all: true }) [custom message]", assumeFormatted(
            colorize({ all: true }),
            {
                level: "info",
                [LEVEL]: "info",
                message: "whatever",
                [MESSAGE]: "[info] whatever custom"
            },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info[LEVEL], "info");
                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, chalk.green("whatever"));
                assert.equal(info[MESSAGE], chalk.green("[info] whatever custom"));
            }
        ));

        it("colorizes when LEVEL !== level", assumeFormatted(
            colorize(),
            { [LEVEL]: "info", level: "INFO", message: "whatever" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, chalk.green("INFO"));
            }
        ));

        describe("Colorizer", () => {
            const allColors = Object.assign({},
                adone.logging.logger.config.adone,
                adone.logging.logger.config.cli,
                adone.logging.logger.config.npm,
                adone.logging.logger.config.syslog);

            const expected = {};

            Object.keys(allColors).forEach((level) => {
                expected[level] = allColors[level].color;
            });

            before(() => {
                setupLevels();
            });

            it("Colorizer.addColors({ string: string })", () => {
                Colorizer.addColors({
                    weird: {
                        color: "cyan"
                    }
                });

                assert.deepEqual(Colorizer.allColors, Object.assign({}, expected, { weird: "cyan" }));
            });

            it("Colorizer.addColors({ string: [Array] })", () => {
                Colorizer.addColors({
                    multiple: {
                        color: ["red", "bold"]
                    }
                });
                assert.array(Colorizer.allColors.multiple);
                assert.sameMembers(Colorizer.allColors.multiple, ["red", "bold"]);
            });

            it('Colorizer.addColors({ string: "(\w+)/s(\w+)" })', () => {
                Colorizer.addColors({
                    delimited: {
                        color: "blue underline"
                    }
                });
                assert.sameMembers(Colorizer.allColors.delimited, ["blue", "underline"]);
            });

            describe("#colorize(LEVEL, level, message)", () => {
                const instance = new Colorizer();

                it("colorize(level) [single color]", () => {
                    assert.equal(instance.colorize("weird", "weird"), chalk.cyan("weird"));
                });

                it("colorize(level) [multiple colors]", () => {
                    assert.equal(instance.colorize("multiple", "multiple"), chalk.bold.red("multiple"));
                });

                it("colorize(level, message) [single color]", () => {
                    assert.equal(instance.colorize("weird", "weird", "message"), chalk.cyan("message"));
                });

                it("colorize(level, message) [multiple colors]", () => {
                    assert.equal(instance.colorize("multiple", "multiple", "message"), chalk.bold.red("message"));
                });
            });
        });
    });

    describe("combine", () => {
        const {
            logging: { logger: { LEVEL, format: { combine, label, timestamp } } }
        } = adone;

        const { formats } = require("./helpers");

        it.skip("exposes the cascade function", () => {
            assert.isFunction(combine.cascade);
        });

        describe("combine(...formats)", () => {
            it("returns a function", () => {
                const fmt = combine(
                    formats.identity(),
                    formats.identity()
                );

                assert.isFunction(fmt.transform);
                assert.deepEqual(fmt.options, {});
            });

            it("exposes the Format prototype", () => {
                const fmt = combine(
                    formats.identity(),
                    formats.identity()
                );

                assert.isTrue(is.class(fmt.Format));
                assert.isFunction(fmt.Format.prototype.transform);
            });

            it("throws an error when provided a non-format", () => {
                assert.throws(() => {
                    combine(
                        function lolwut() { },
                        function notaformat() { }
                    );
                });
            });
        });

        describe(".transform(info, opts)", () => {
            it("invokes all intermediary formats", () => {
                const labelTimestamp = combine(
                    label({ label: "testing" }),
                    timestamp()
                );

                const info = {
                    level: "info",
                    message: "wow such testing"
                };

                const actual = labelTimestamp.transform(Object.assign({}, info));
                assert.strictEqual(actual.level, info.level);
                assert.strictEqual(actual.message, info.message);
                assert.isString(actual.timestamp);
                assert.equal(actual.label, "testing");
            });

            it("return the result of the transformation chain", () => {
                const assignedInfo = combine(
                    formats.identity(),
                    formats.assign({ key: "value" }),
                    formats.identity()
                );

                const info = {
                    level: "info",
                    message: "wow such testing"
                };

                const actual = assignedInfo.transform(Object.assign({}, info));
                assert.strictEqual(actual.level, info.level);
                assert.strictEqual(actual.message, info.message);
                assert.isString(actual.key);
            });

            it("{ false } when formats yield [false, obj, obj]", () => {
                const firstFalse = combine(
                    formats.ignore(),
                    formats.die(),
                    formats.die()
                );

                assert.isFalse(firstFalse.transform({
                    level: "info",
                    message: "lolwut"
                }));
            });

            it("{ false } when formats yield [obj, false, obj]", () => {
                const midFalse = combine(
                    formats.identity(),
                    formats.ignore(),
                    formats.die()
                );

                assert.isFalse(midFalse.transform({
                    level: "info",
                    message: "lolwut"
                }));
            });

            it("{ false } when formats yield [obj, obj, false]", () => {
                const lastFalse = combine(
                    formats.identity(),
                    formats.identity(),
                    formats.ignore()
                );

                assert.isFalse(lastFalse.transform({
                    level: "info",
                    message: "lolwut"
                }));
            });
        });
    });

    describe("format", () => {
        const { formatFns } = require("./helpers");
        const {
            logging: { logger: { format } }
        } = adone;

        it("has the expected default formats", () => {
            assert.isFunction(format);
            assert.isFunction(format.align);
            assert.isFunction(format.cli);
            assert.isFunction(format.colorize);
            assert.isFunction(format.combine);
            assert.isFunction(format.json);
            assert.isFunction(format.label);
            assert.isFunction(format.logstash);
            assert.isFunction(format.padLevels);
            assert.isFunction(format.prettyPrint);
            assert.isFunction(format.printf);
            assert.isFunction(format.splat);
            assert.isFunction(format.simple);
            assert.isFunction(format.timestamp);
            assert.isFunction(format.uncolorize);
        });

        describe("format(fn)", () => {
            it("returns a function", () => {
                const identity = format(formatFns.identity);
                assert.isFunction(identity);
            });

            it("exposes the Format prototype", () => {
                const identity = format(formatFns.identity);
                assert.isTrue(is.class(identity.Format));
                assert.isFunction(identity.Format.prototype.transform);
            });

            it("throws if provided a function of invalid length", () => {
                assert.throws(() => {
                    format(formatFns.invalid);
                }, /Format functions must be synchronous taking a two arguments/);
            });

            it("throws an error including the bad function signature", () => {
                const fnsig = formatFns.invalid.toString().split("\n")[0];
                try {
                    format(formatFns.invalid);
                } catch (ex) {
                    assert.isTrue(ex.message.includes(fnsig));
                }
            });

            it("format(fn)()", () => {
                const identity = format(formatFns.identity);
                const fmt = identity();
                assert.isFunction(fmt.transform);
                assert.deepEqual(fmt.options, {});
            });

            it("format(fn)(opts)", () => {
                const opts = { testing: true };
                const identity = format(formatFns.identity);
                const fmt = identity(opts);
                assert.isFunction(fmt.transform);
                assert.deepEqual(fmt.options, opts);
            });
        });
    });

    describe("json", () => {
        const {
            logging: { logger: { MESSAGE, format: { json } } }
        } = adone;

        const { assumeFormatted, assumeHasPrototype, writable } = require("./helpers");

        it("json() (default) sets info[MESSAGE]", assumeFormatted(
            json(),
            { level: "info", message: "whatever" },
            (info, expected) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");

                const raw = JSON.stringify(expected);
                assert.deepEqual(info[MESSAGE], raw);
                assert.strictEqual(JSON.stringify(info), raw);
            }
        ));

        it("json({ space: 2 }) sets info[MESSAGE]", assumeFormatted(
            json({ space: 2 }),
            { level: "info", message: "2 spaces 4 lyfe" },
            (info, expected) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "2 spaces 4 lyfe");
                assert.strictEqual(info[MESSAGE], JSON.stringify(expected, null, 2));
            }
        ));

        it("json({ replacer }) sets info[MESSAGE]", assumeFormatted(
            json({
                replacer(key, value) {
                    if (key === "filtered") {
                        return undefined;
                    }
                    return value;
                }
            }),
            { level: "info", message: "replacer", filtered: true },
            (info) => {
                const { level, message } = info;
                assert.isString(info.level);
                assert.isString(info.message);
                assert.isTrue(info.filtered);
                assert.equal(info.level, "info");
                assert.equal(info.message, "replacer");
                assert.strictEqual(info[MESSAGE], JSON.stringify({ level, message }));
            }
        ));

        it("json() can handle circular JSON objects", (done) => {
            // Define an info with a circular reference.
            const circular = { level: "info", message: "has a circular ref ok!", filtered: true };
            circular.self = { circular };

            const fmt = json();
            const stream = writable((info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.isTrue(info.filtered);
                assert.equal(info.level, "info");
                assert.equal(info.message, "has a circular ref ok!");
                assert.strictEqual(info.self.circular, circular);
                assert.strictEqual(info[MESSAGE], data.json.encodeSafe(circular));
                done();
            });

            stream.write(fmt.transform(circular, fmt.options));
        });

        it("exposes the Format prototype", assumeHasPrototype(json));
    });

    describe("label", () => {
        const helpers = require("./helpers");

        const {
            logging: { logger: { MESSAGE, format: { label } } }
        } = adone;

        it("label({ label }) set the label to info.label", helpers.assumeFormatted(
            label({ label: "wow such impress" }),
            { level: "info", message: "label all the things" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.isString(info.label);
                assert.equal(info.level, "info");
                assert.equal(info.message, "label all the things");
                assert.equal(info.label, "wow such impress");
                assert.isUndefined(info[MESSAGE]);
            }
        ));

        it("label({ label, message }) adds the label to info.message", helpers.assumeFormatted(
            label({ label: "wow such impress", message: true }),
            { level: "info", message: "label all the things" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "[wow such impress] label all the things");
                assert.isUndefined(info[MESSAGE]);
            }
        ));
    });

    describe("logstash", () => {
        const helpers = require("./helpers");
        const TIMESTAMP = Symbol.for("timestamp");

        const {
            logging: { logger: { MESSAGE, format: { combine, logstash, timestamp } } }
        } = adone;

        it("default { @message, @fields } sets info[MESSAGE]", helpers.assumeFormatted(
            logstash(),
            { level: "info", message: "whatever" },
            (info, expected) => {
                assert.equal(info.level, "info");
                assert.isUndefined(info.message);
                assert.equal(info[MESSAGE], JSON.stringify({
                    "@message": expected.message,
                    "@fields": {
                        level: expected.level
                    }
                }));
            }
        ));

        it("with timestamp { @message, @timestamp, @fields } sets info[MESSAGE]", helpers.assumeFormatted(
            combine(
                timestamp({ alias: TIMESTAMP }),
                logstash()
            ),
            { level: "info", message: "whatever" },
            (info, expected) => {
                assert.equal(info.level, "info");
                assert.isUndefined(info.message);
                assert.strictEqual(info[MESSAGE], JSON.stringify({
                    "@message": expected.message,
                    "@timestamp": info[TIMESTAMP],
                    "@fields": {
                        level: expected.level
                    }
                }));
            }
        ));
    });

    describe("metadata", () => {
        const helpers = require("./helpers");

        const {
            logging: { logger: { format: { metadata } } }
        } = adone;

        const testInfoObject = {
            level: "info",
            message: "whatever",
            someKey: "someValue",
            someObject: {
                key: "value"
            }
        };

        it("metadata() (default) removes message and level and puts everything else into metadata", helpers.assumeFormatted(
            metadata(),
            testInfoObject,
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.isObject(info.metadata);
                assert.equal(info.metadata.someKey, "someValue");
                assert.isObject(info.metadata.someObject);
                assert.equal(info.metadata.someObject.key, "value");
            }
        ));

        it("metadata({ fillWith: [keys] }) only adds specified keys to the metadata object", helpers.assumeFormatted(
            metadata({ fillWith: ["level", "someObject"] }),
            testInfoObject,
            (info) => {
                assert.isObject(info.metadata);
                assert.equal(info.metadata.level, "info");
                assert.equal(info.metadata.someObject.key, "value");
            }
        ));

        it("metadata({ fillExcept: [keys] }) fills all but the specified keys in the metadata object", helpers.assumeFormatted(
            metadata({ fillExcept: ["message", "someObject"] }),
            testInfoObject,
            (info) => {
                assert.equal(info.message, "whatever");
                assert.isObject(info.someObject);
                assert.equal(info.someObject.key, "value");
                assert.isObject(info.metadata);
                assert.equal(info.metadata.level, "info");
            }
        ));

        it("metadata({ fillWith: [keys], fillExcept: [keys] }) should only fillExcept the specified keys", helpers.assumeFormatted(
            metadata({ fillWith: ["message"], fillExcept: ["message"] }),
            testInfoObject,
            (info) => {
                assert.equal(info.message, "whatever");
                assert.equal(info.metadata.level, "info");
            }
        ));

        it("metadata({ key: someString }) should return an object with `someString` instead of `metadata` as the key",
            helpers.assumeFormatted(
                metadata({ fillWith: ["level", "someKey"], key: "myCustomKey" }),
                testInfoObject,
                (info) => {
                    assert.isObject(info.myCustomKey);
                    assert.equal(info.message, "whatever");
                    assert.equal(info.myCustomKey.level, "info");
                }
            ));
    });

    describe("ms", () => {
        const helpers = require("./helpers");

        const {
            logging: { logger: { MESSAGE, format: { ms } } }
        } = adone;


        it("ms() set the ms to info.ms", helpers.assumeFormatted(
            ms(),
            { level: "info", message: "time all the things" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.isString(info.ms);
                assert.equal(info.level, "info");
                assert.equal(info.message, "time all the things");
                assert.isUndefined(info[MESSAGE]);
            }
        ));
    });

    describe("pad levels", () => {
        const {
            assumeFormatted,
            assumeHasPrototype,
            infoify
        } = require("./helpers");

        const {
            logging: { logger: { format: { padLevels }, config, MESSAGE } }
        } = adone;
        const { Format: Padder } = padLevels;

        const longLevels = Object.assign({}, config.npm);
        longLevels["really-really-long"] = 7;

        describe("padLevels", () => {
            it("padLevels({ levels }) set the padding to info.padding", assumeFormatted(
                padLevels(),
                infoify({ level: "info", message: "pad all the things" }),
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");
                    assert.equal(info.message, "     pad all the things");
                    assert.equal(info[MESSAGE], "     pad all the things");
                }
            ));

            it("padLevels({ levels }) set the padding to info.padding", assumeFormatted(
                padLevels({ config: longLevels }),
                infoify({ level: "info", message: "pad all the things" }),
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");

                    assert.equal(info.message, "               pad all the things");
                    assert.equal(info[MESSAGE], "               pad all the things");
                }
            ));

            it("padLevels({ levels, filler }) set the padding to info.padding with a custom filler", assumeFormatted(
                padLevels({ config: config.npm, filler: "foo" }),
                infoify({ level: "info", message: "pad all the things" }),
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");
                    assert.equal(info.message, "foofpad all the things");
                    assert.equal(info[MESSAGE], "foofpad all the things");
                }
            ));

            it("exposes the Format prototype", assumeHasPrototype(padLevels));
        });

        describe("Padder", () => {
            const expected = Object.keys(Object.assign({},
                config.cli,
                config.npm,
                config.syslog
            ));

            it("Padder.paddingForConfig({ string: number })", () => {
                const paddings = Padder.paddingForConfig(Object.assign({},
                    config.cli,
                    config.npm,
                    config.syslog
                ));

                const keys = Object.keys(paddings);
                assert.sameDeepMembers(keys, expected);

                const padding = paddings[keys.pop()];
                assert.isString(padding);
                assert.equal(padding[0], " ");
            });

            it("Padder.paddingForConfig({ string: number }, string)", () => {
                const paddings = Padder.paddingForConfig(Object.assign({},
                    config.cli,
                    config.npm,
                    config.syslog
                ), "foo");

                const keys = Object.keys(paddings);
                assert.sameDeepMembers(keys, expected);

                const padding = paddings[keys.pop()];
                assert.isString(padding);
                assert.equal(padding[0], "f");
            });
        });
    });

    describe("prettyPrint", () => {
        const helpers = require("./helpers");
        const {
            logging: { logger: { format: { prettyPrint }, MESSAGE } },
            std: { util }
        } = adone;

        it("prettyPrint() (default) sets info[MESSAGE]", helpers.assumeFormatted(
            prettyPrint(),
            { level: "info", message: "yay template strings are fast" },
            (info, expected) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "yay template strings are fast");
                assert.equal(info[MESSAGE], util.inspect(expected));
            }
        ));
    });


    describe("printf", () => {
        const helpers = require("./helpers");

        const {
            logging: { logger: { format: { printf }, MESSAGE } }
        } = adone;


        it("printf(info => `${template}`) sets info[MESSAGE]", helpers.assumeFormatted(
            printf((info) => `${info.level}: ${info.message}`),
            { level: "info", message: "yay template strings are fast" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "yay template strings are fast");
                assert.equal(info[MESSAGE], "info: yay template strings are fast");
            }
        ));
    });

    describe("simple", () => {
        const helpers = require("./helpers");
        const {
            logging: { logger: { format: { simple }, MESSAGE } }
        } = adone;

        it("simple() (default) sets info[MESSAGE]", helpers.assumeFormatted(
            simple(),
            { level: "info", message: "whatever" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");

                assert.equal(info[MESSAGE], "info: whatever");
            }
        ));

        it("simple() strips { splat }", helpers.assumeFormatted(
            simple(),
            { level: "info", message: "whatever", splat: [1, 2, 3] },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.array(info.splat);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");
                assert.sameMembers(info.splat, [1, 2, 3]);

                assert.equal(info[MESSAGE], "info: whatever");
            }
        ));

        it("simple() shows { rest }", helpers.assumeFormatted(
            simple(),
            { level: "info", message: "whatever", rest: "something" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.isString(info.rest);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");
                assert.equal(info.rest, "something");

                assert.equal(info[MESSAGE], 'info: whatever {"rest":"something"}');
            }
        ));
    });

    describe("splat", () => {
        const helpers = require("./helpers");
        const {
            logging: { logger: { format: { splat }, SPLAT } }
        } = adone;

        /**
         * Helper function for asserting that an info object
         * with the given { message, splat: spread } is properly interoplated
         * by the splat format into the `expected` value.
         */
        const assumeSplat = function (message, spread, expected) {
            return helpers.assumeFormatted(
                splat(),
                { level: "info", message, [SPLAT]: spread },
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.array(info[SPLAT]);

                    // Prefer any user-defined assertion (if provided).
                    if (is.function(expected)) {
                        return expected(info);
                    }

                    assert.strictEqual(info.message, expected);
                }
            );
        };


        it("basic string", assumeSplat(
            "just a string", [], "just a string"
        ));

        it("%s | string placeholder sets info.message", assumeSplat(
            "alright %s", ["what"], "alright what"
        ));

        it("%d | number placeholder sets info.message", assumeSplat(
            "test message %d", [123], "test message 123"
        ));

        it("%j | json placeholder sets info.message", assumeSplat(
            "test %j", [{ number: 123 }], 'test {"number":123}'
        ));

        it('balanced number of arguments to % | does not have "meta"', assumeSplat(
            "test %j", [{ number: 123 }], (info) => {
                assert.equal(info.message, 'test {"number":123}');
                assert.isUndefined(info.meta);
            }
        ));

        it('more arguments than % | multiple "meta"', assumeSplat(
            "test %j", [{ number: 123 }, { an: "object" }, ["an", "array"]], (info) => {
                assert.equal(info.message, 'test {"number":123}');
                assert.equal(info.an, "object");
                assert.equal(info[0], "an");
                assert.equal(info[1], "array");
            }
        ));

        it("%% | escaped % sets info.message", assumeSplat(
            "test %d%%", [100], "test 100%"
        ));

        it("no % and one object | returns the message and properties", assumeSplat(
            "see an object", [{ an: "object" }], (info) => {
                assert.equal(info.message, "see an object");
                assert.equal(info.an, "object");
            }
        ));

        it("no % and two objects | returns the string and all properties", assumeSplat(
            "lots to see here", [{ an: "object" }, ["an", "array"]], (info) => {
                assert.equal(info.message, "lots to see here");
                assert.equal(info.an, "object");
                assert.equal(info[0], "an");
                assert.equal(info[1], "array");
            }
        ));

        it("no % and no splat | returns the same info", assumeSplat(
            "nothing to see here", [], (info) => {
                assert.equal(info.message, "nothing to see here");
                assert.isUndefined(info.meta);
            }
        ));

        it("no % but some splat | returns the same message with new properties", assumeSplat(
            "Look! No tokens!", ["ok"], (info) => {
                assert.equal(info.message, "Look! No tokens!");
                assert.equal(info[0], "o");
                assert.equal(info[1], "k");
            }
        ));

        it("Splat overflow (too many arguments) sets info.message", assumeSplat(
            "%s #%d, how are you %s",
            ["Hi", 42, "feeling", { today: true }],
            (info) => {
                assert.equal(info.message, "Hi #42, how are you feeling");
                assert.isTrue(info.today);
            }
        ));

        it("No [SPLAT] does not crash", () => {
            return helpers.assumeFormatted(
                splat(),
                { level: "info", message: "Why hello %s!" },
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.isUndefined(info[SPLAT]);
                    assert.equal(info.message, "Why hello %s!");
                }
            );
        });

        it("tests info.splat as passed in with an object", () => {
            return helpers.assumeFormatted(
                splat(),
                {
                    level: "info",
                    message: "%d: The answer to life, the universe and everything",
                    splat: [42]
                },
                (info) => {
                    assert.isString(info.level).is.a("string");
                    assert.isString(info.message).is.a("string");

                    assert.equal(info.message, "info: 42: The answer to life, the universe and everything");
                }
            );
        });
    });



    describe("timestamp", () => {
        const helpers = require("./helpers");
        const {
            logging: { logger: { format: { timestamp } } }
        } = adone;

        it("timestamp() (default) sets info[timestamp]", helpers.assumeFormatted(
            timestamp(),
            { level: "info", message: "whatever", timestamp: new Date().toISOString() },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");
                assert.isString(info.timestamp);
            }
        ));

        it("timestamp({ format: () => { return 'test timestamp'; } }) sets info[timestamp]", helpers.assumeFormatted(
            timestamp({
                format: () => {
                    return "test timestamp";
                }
            }),
            { level: "info", message: "whatever", timestamp: "test timestamp" },
            (info, expected) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");
                assert.isString(info.timestamp);
                assert.equal(info.timestamp, "test timestamp");

                const raw = JSON.stringify(expected);
                assert.strictEqual(JSON.stringify(info), raw);
            }
        ));

        it("timestamp({ format: 'YYYY-MM-DD' }) sets info[timestamp]", helpers.assumeFormatted(
            timestamp({
                format: "YYYY-MM-DD"
            }),
            { level: "info", message: "whatever", timestamp: new Date().toISOString() },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);
                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");
                assert.isString(info.timestamp);
            }
        ));

        it("exposes the Format prototype", helpers.assumeHasPrototype(timestamp));
    });

    describe("uncolorize", () => {
        const { assumeFormatted, infoify, setupLevels } = require("./helpers");
        const COLORED = Symbol.for("colored");

        const {
            logging: { logger: { format, LEVEL, MESSAGE } }
        } = adone;

        const { colorize, combine, simple, uncolorize } = format;

        //
        // Test focused format to store a copy of
        // the colorized content for later comparison
        //
        const rememberColors = format((info) => {
            info[COLORED] = {
                [LEVEL]: info[LEVEL],
                [MESSAGE]: info[MESSAGE],
                level: info.level,
                message: info.message
            };

            return info;
        });

        /**
         * Helper function to return a testable format that
         * transitions from colors to uncolored
         */
        const addAndRemoveColors = function (opts = {}) {
            return combine(
                colorize({ all: true }),
                simple(),
                rememberColors(),
                uncolorize(opts)
            );
        };


        before(setupLevels);

        it("uncolorize() (default) removes all colors", assumeFormatted(
            addAndRemoveColors(),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);

                const colored = info[COLORED];
                assert.equal(info.level, "info");
                assert.notEqual(info.level, colored.level);
                assert.equal(info.level, stripAnsi(colored.level));

                assert.equal(info.message, "whatever");
                assert.equal(info.message, stripAnsi(colored.message));
                assert.notEqual(info.message, colored.message);

                assert.equal(info[MESSAGE], "info: whatever");
                assert.equal(info[MESSAGE], stripAnsi(colored[MESSAGE]));
                assert.notEqual(info[MESSAGE], colored[MESSAGE]);
            }
        ));

        it("uncolorize() (default) preserves mutable level formatting", assumeFormatted(
            combine(
                format((info) => {
                    info.level = info.level.toUpperCase();
                    return info;
                })(),
                colorize(),
                uncolorize()
            ),
            { [LEVEL]: "info", level: "info", message: "whatever" },
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);

                assert.equal(info.level, "INFO");
                assert.equal(info.message, "whatever");
            }
        ));

        it("uncolorize({ level: false }) removes color from { message, [MESSAGE] }", assumeFormatted(
            addAndRemoveColors({ level: false }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);

                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, "whatever");
                assert.equal(info[MESSAGE], "info: whatever");
            }
        ));

        it("uncolorize({ message: false }) removes color from { level, [MESSAGE] }", assumeFormatted(
            addAndRemoveColors({ message: false }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);

                assert.equal(info.level, "info");
                assert.equal(info.message, chalk.green("whatever"));
                assert.equal(info[MESSAGE], "info: whatever");
            }
        ));

        it("uncolorize({ raw: false }) removes color from { level, message }", assumeFormatted(
            addAndRemoveColors({ raw: false }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);

                assert.equal(info.level, "info");
                assert.equal(info.message, "whatever");
                assert.equal(info[MESSAGE], info[COLORED][MESSAGE]);
            }
        ));

        it("uncolorize({ level: false, message: false }) removes color from [MESSAGE]", assumeFormatted(
            addAndRemoveColors({ level: false, message: false }),
            infoify({ level: "info", message: "whatever" }),
            (info) => {
                assert.isString(info.level);
                assert.isString(info.message);

                assert.equal(info.level, chalk.green("info"));
                assert.equal(info.message, chalk.green("whatever"));
                assert.equal(info[MESSAGE], "info: whatever");
            }
        ));
    });

    describe("errors", () => {
        const { assumeFormatted } = require("./helpers");

        const {
            logging: { logger: { MESSAGE, format: { errors } } }
        } = adone;

        const err = new Error("whatever");

        const errProps = new Error("another error");
        errProps.whatever = true;
        errProps.wut = "some string";

        const errInfo = new Error("Already has level");
        errInfo.level = "error";

        const errInfoProps = new Error("Level with props");
        errInfoProps.level = "error";
        errInfoProps.whatever = true;
        errInfoProps.wut = "some string";


        describe("errors()({ object })", () => {
            it("errors() returns the original info", assumeFormatted(
                errors(),
                { level: "info", message: "whatever" },
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");
                    assert.equal(info.message, "whatever");
                }
            ));

            it("errors() (default) sets info[MESSAGE]", assumeFormatted(
                errors(),
                { level: "info", message: err },
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");
                    assert.equal(info.message, err.message);
                    assert.equal(info[MESSAGE], err.message);
                }
            ));

            it("errors({ stack: true }) sets info.stack", assumeFormatted(
                errors({ stack: true }),
                { level: "info", message: err },
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");
                    assert.equal(info.message, err.message);
                    assert.equal(info[MESSAGE], err.message);
                    assert.equal(info.stack, err.stack);
                }
            ));

            it("errors() sets custom error properties", assumeFormatted(
                errors(),
                { level: "info", message: errProps },
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, "info");
                    assert.equal(info.message, errProps.message);
                    assert.equal(info[MESSAGE], errProps.message);
                    assert.isTrue(info.whatever);
                    assert.equal(info.wut, "some string");
                }
            ));
        });

        describe("errors()(Error)", () => {
            it("errors() (default) sets info[MESSAGE]", assumeFormatted(
                errors(),
                errInfo,
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, errInfo.level);
                    assert.equal(info.message, errInfo.message);
                    assert.equal(info[MESSAGE], errInfo.message);
                },
                { immutable: false }
            ));

            it("errors({ space: 2 }) sets info.stack", assumeFormatted(
                errors({ stack: true }),
                errInfo,
                (info) => {
                    assert.isString(info.level);
                    assert.isString(info.message);
                    assert.equal(info.level, errInfo.level);
                    assert.equal(info.message, errInfo.message);
                    assert.equal(info[MESSAGE], errInfo.message);
                    assert.equal(info.stack, errInfo.stack);
                },
                { immutable: false }
            ));
        });
    });
});
