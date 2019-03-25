const {
    error,
    app: { CliApplication }
} = adone;

describe.todo("argv handling", () => {
    let app = null;

    const parse = async (...args) => {
        const { command, errors, rest, match } = await app._parseArgs(args);
        return {
            args: app[Symbol.for("adone.app.CliApplication#mainCommand")].getArgumentsMap(),
            opts: app[Symbol.for("adone.app.CliApplication#mainCommand")].getOptionsMap(),
            command,
            errors,
            rest,
            match
        };
    };

    beforeEach(() => {
        app = new CliApplication();
    });

    describe("arguments", () => {
        it("should define an argument", async () => {
            app.defineArguments({
                arguments: [
                    { name: "x" }
                ]
            });
            const { args } = await parse("1");
            expect(args.get("x")).to.be.equal("1");
        });

        it("should define an argument using only a name", async () => {
            app.defineArguments({
                arguments: [
                    "x"
                ]
            });
            const { args } = await parse("1");
            expect(args.get("x")).to.be.equal("1");
        });

        it("should define a couple of args", async () => {
            app.defineArguments({
                arguments: [
                    "x", "y"
                ]
            });
            const { args } = await parse("1", "2");
            expect(args.get("x")).to.be.equal("1");
            expect(args.get("y")).to.be.equal("2");
        });

        describe("type", () => {
            it("should be a string by default", async () => {
                app.defineArguments({
                    arguments: [
                        "x"
                    ]
                });
                const { args } = await parse("hello world");
                expect(args.get("x")).to.be.equal("hello world");
            });

            it("should return a number", async () => {
                app.defineArguments({
                    arguments: [
                        { name: "x", type: Number }
                    ]
                });
                const { args } = await parse("1");
                expect(args.get("x")).to.be.equal(1);
            });

            it("should return a list of numbers", async () => {
                app.defineArguments({
                    arguments: [
                        { name: "x", type: Number, nargs: "+" }
                    ]
                });
                const { args } = await parse("1", "2", "3", "4", "5");
                expect(args.get("x")).to.be.deep.equal([1, 2, 3, 4, 5]);
            });

            it("should call a function", async () => {
                app.defineArguments({
                    arguments: [
                        { name: "x", type: () => null },
                        { name: "y", type: JSON.parse }
                    ]
                });
                const { args } = await parse("1", '{"a":[1,2,3]}');
                expect(args.get("x")).to.be.null();
                expect(args.get("y")).to.be.deep.equal({ a: [1, 2, 3] });
            });

            it("should pass an argument index to the function in case of variadic params", async () => {
                app.defineArguments({
                    arguments: [
                        { name: "x", type: (x, i) => [x, i], nargs: "+" },
                        { name: "y", type: (x, i) => [x, i], nargs: "+" }
                    ]
                });
                const { args } = await parse("1", "2", "3", "4");
                expect(args.get("x")).to.be.deep.equal([["1", 0], ["2", 1], ["3", 2]]);
                expect(args.get("y")).to.be.deep.equal([["4", 0]]);
            });

            it("should create a class instance", async () => {
                class Wrapper {
                    constructor(a) {
                        this.value = a;
                    }
                }

                app.defineArguments({
                    arguments: [
                        { name: "x", type: () => null },
                        { name: "y", type: Wrapper }
                    ]
                });
                const { args } = await parse("1", "hello");
                expect(args.get("x")).to.be.null();
                const w = args.get("y");
                expect(w).to.be.instanceOf(Wrapper);
                expect(w.value).to.be.equal("hello");
            });

            it("should support array of types", async () => {
                app.defineArguments({
                    arguments: [
                        { name: "x", nargs: 2, type: [Number, String] },
                        { name: "y" }
                    ]
                });
                const { args } = await parse("1", "2", "3");
                expect(args.get("x")).to.be.deep.equal([1, "2"]);
                expect(args.get("y")).to.be.deep.equal("3");
            });

            context("regexp", () => {
                it("should support regexps", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", type: /^\d+$/ },
                            { name: "y", type: /^[a-z]+$/ },
                            { name: "z", type: /^(\d+) (\d+)$/ }
                        ]
                    });
                    const { args, errors } = await parse("1", "abcdef", "123 45");
                    expect(errors).to.be.empty();
                    expect(args.get("x")).to.be.deep.equal("1".match(/^\d+$/));
                    expect(args.get("y")).to.be.deep.equal("abcdef".match(/^[a-z]+$/));
                    expect(args.get("z")).to.be.deep.equal("123 45".match(/^(\d+) (\d+)$/));
                });

                it("should throw a fatal error if mismatches", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", type: /^\d+$/ }
                        ]
                    });
                    const { errors } = await parse("hey");
                    expect(errors).to.have.lengthOf(1);
                    expect(errors[0].message).to.be.equal(`x: Incorrect value, must match ${/^\d+$/}`);
                    expect(errors[0].fatal).to.be.true();
                });
            });
        });

        describe("nargs", () => {
            describe("nargs is an intgerer", () => {
                it("should be a value when = 1", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 1 }
                        ]
                    });
                    const { args } = await parse("1");
                    expect(args.get("x")).to.be.equal("1");
                });

                it("should be an array when > 1", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 2 }
                        ]
                    });
                    const { args } = await parse("1", "2");
                    expect(args.get("x")).to.be.deep.equal(["1", "2"]);
                });
            });

            describe("nargs = +", () => {
                it("should support 1 value", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "+" }
                        ]
                    });
                    const { args } = await parse("1");
                    expect(args.get("x")).to.be.deep.equal(["1"]);
                });

                it("should support many values", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "+" }
                        ]
                    });
                    const { args } = await parse("1", "2", "3", "4", "5");
                    expect(args.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                });
            });

            describe("nargs = *", () => {
                it("should support 0 values", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "*" }
                        ]
                    });
                    const { args } = await parse();
                    expect(args.get("x")).to.be.deep.equal([]);
                });

                it("should support 1 value", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "*" }
                        ]
                    });
                    const { args } = await parse("1");
                    expect(args.get("x")).to.be.deep.equal(["1"]);
                });

                it("should support many values", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "*" }
                        ]
                    });
                    const { args } = await parse("1", "2", "3", "4", "5");
                    expect(args.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                });
            });

            describe("nargs = ?", () => {
                it("should support 0 values", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "?" }
                        ]
                    });
                    const { args } = await parse();
                    expect(args.get("x")).to.be.deep.equal("");
                });

                it("should support 1 value", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "?" }
                        ]
                    });
                    const { args } = await parse("1");
                    expect(args.get("x")).to.be.equal("1");
                });
            });

            describe("combining", () => {
                it("+ -> 5", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "+" },
                            { name: "y", nargs: 5 }
                        ]
                    });
                    const { args } = await parse("1", "2", "3", "4", "5", "6");
                    expect(args.get("x")).to.be.deep.equal(["1"]);
                    expect(args.get("y")).to.be.deep.equal(["2", "3", "4", "5", "6"]);
                });

                it("5 -> +", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 5 },
                            { name: "y", nargs: "+" }
                        ]
                    });
                    const { args } = await parse("1", "2", "3", "4", "5", "6", "7", "8", "9", "10");
                    expect(args.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                    expect(args.get("y")).to.be.deep.equal(["6", "7", "8", "9", "10"]);
                });

                it("2 -> 2", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 2 },
                            { name: "y", nargs: 2 }
                        ]
                    });
                    const { args } = await parse("1", "2", "3", "4");
                    expect(args.get("x")).to.be.deep.equal(["1", "2"]);
                    expect(args.get("y")).to.be.deep.equal(["3", "4"]);
                });

                it("1 -> ?", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 1 },
                            { name: "y", nargs: "?" }
                        ]
                    });
                    {
                        const { args } = await parse("1");
                        expect(args.get("x")).to.be.deep.equal("1");
                        expect(args.get("y")).to.be.deep.equal("");
                    }
                    {
                        const { args } = await parse("1", "2");
                        expect(args.get("x")).to.be.deep.equal("1");
                        expect(args.get("y")).to.be.deep.equal("2");
                    }
                });

                it("1 -> + -> 1", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 1 },
                            { name: "y", nargs: "+" },
                            { name: "z", nargs: 1 }
                        ]
                    });
                    const { args } = await parse("1", "2", "3", "4");
                    expect(args.get("x")).to.be.deep.equal("1");
                    expect(args.get("y")).to.be.deep.equal(["2", "3"]);
                    expect(args.get("z")).to.be.deep.equal("4");
                });
            });
        });

        describe("actions", () => {
            describe("set", () => {
                describe("defaultFalse", () => {
                    it("should create a map of false values for not present values", async () => {
                        app.defineArguments({
                            arguments: [{
                                name: "x",
                                action: "set",
                                set: "defaultFalse",
                                choices: ["a", "b", "c"]
                            }]
                        });

                        const { args } = await parse("a", "c");
                        expect(args.get("x")).to.be.deep.equal({
                            a: true,
                            b: false,
                            c: true
                        });
                    });
                });

                describe("defaultTrue", () => {
                    it("should create a map with true values for not present values", async () => {
                        app.defineArguments({
                            arguments: [{
                                name: "x",
                                action: "set",
                                set: "defaultTrue",
                                choices: ["a", "b", "c"]
                            }]
                        });

                        const { args } = await parse("a", "c");
                        expect(args.get("x")).to.be.deep.equal({
                            a: false,
                            b: true,
                            c: false
                        });
                    });
                });

                describe("defaultUndefined", () => {
                    it("should create a map with undefined values for not present values", async () => {
                        app.defineArguments({
                            arguments: [{
                                name: "x",
                                action: "set",
                                set: "defaultUndefined",
                                choices: ["a", "b", "c"]
                            }]
                        });

                        const { args } = await parse("a", "c");
                        expect(args.get("x")).to.be.deep.equal({
                            a: true,
                            b: undefined,
                            c: true
                        });
                    });
                });

                it("should create a map with undefined values for not present values by default", async () => {
                    app.defineArguments({
                        arguments: [{
                            name: "x",
                            action: "set",
                            choices: ["a", "b", "c"]
                        }]
                    });

                    const { args } = await parse("a", "c");
                    expect(args.get("x")).to.be.deep.equal({
                        a: true,
                        b: undefined,
                        c: true
                    });
                });

                it("should support a custom set function", async () => {
                    const set = stub().callsFake((isSpecified, name) => {
                        if (name === "b") {
                            return isSpecified;
                        }
                        return !isSpecified;
                    });
                    app.defineArguments({
                        arguments: [{
                            name: "x",
                            action: "set",
                            set,
                            choices: ["a", "b", "c"]
                        }]
                    });

                    const { args } = await parse("a", "b");
                    expect(args.get("x")).to.be.deep.equal({
                        a: false,
                        b: true,
                        c: true
                    });

                    expect(set).to.have.been.calledThrice();
                    expect(set.getCall(0)).to.have.been.calledWith(true, "a", 2);
                    expect(set.getCall(1)).to.have.been.calledWith(true, "b", 2);
                    expect(set.getCall(2)).to.have.been.calledWith(false, "c", 2);
                });

                describe("trueOnEmpty", () => {
                    it("should create a map with all true values if there are no args", async () => {
                        app.defineArguments({
                            arguments: [{
                                name: "x",
                                action: "set",
                                set: "trueOnEmpty",
                                choices: ["a", "b", "c"]
                            }]
                        });
                        const { args } = await parse();
                        expect(await args.get("x")).to.be.deep.equal({
                            a: true,
                            b: true,
                            c: true
                        });
                    });

                    it("should create a map with true values for present keys and undefined values for not present", async () => {
                        app.defineArguments({
                            arguments: [{
                                name: "x",
                                action: "set",
                                set: "trueOnEmpty",
                                choices: ["a", "b", "c"]
                            }]
                        });
                        const { args } = await parse("a", "c");
                        expect(await args.get("x")).to.be.deep.equal({
                            a: true,
                            b: undefined,
                            c: true
                        });
                    });
                });
            });

            describe("falseOnEmpty", () => {
                it("should create a map with all false values if there are no args", async () => {
                    app.defineArguments({
                        arguments: [{
                            name: "x",
                            action: "set",
                            set: "falseOnEmpty",
                            choices: ["a", "b", "c"]
                        }]
                    });
                    const { args } = await parse();
                    expect(await args.get("x")).to.be.deep.equal({
                        a: false,
                        b: false,
                        c: false
                    });
                });

                it("should create a map with true values for present keys and undefined values for not present", async () => {
                    app.defineArguments({
                        arguments: [{
                            name: "x",
                            action: "set",
                            set: "falseOnEmpty",
                            choices: ["a", "b", "c"]
                        }]
                    });
                    const { args } = await parse("a", "c");
                    expect(await args.get("x")).to.be.deep.equal({
                        a: true,
                        b: undefined,
                        c: true
                    });
                });
            });

            describe("undefinedOnEmpty", () => {
                it("should create a map with all undefined values if there are no args", async () => {
                    app.defineArguments({
                        arguments: [{
                            name: "x",
                            action: "set",
                            set: "undefinedOnEmpty",
                            choices: ["a", "b", "c"]
                        }]
                    });
                    const { args } = await parse();
                    expect(await args.get("x")).to.be.deep.equal({
                        a: undefined,
                        b: undefined,
                        c: undefined
                    });
                });

                it("should create a map with true values for present keys and undefined values for not present", async () => {
                    app.defineArguments({
                        arguments: [{
                            name: "x",
                            action: "set",
                            set: "undefinedOnEmpty",
                            choices: ["a", "b", "c"]
                        }]
                    });
                    const { args } = await parse("a", "c");
                    expect(await args.get("x")).to.be.deep.equal({
                        a: true,
                        b: undefined,
                        c: true
                    });
                });
            });
        });

        describe("enabled flag", () => {
            it("should not add disabled argument", async () => {
                app.defineArguments({
                    arguments: [{
                        name: "x"
                    }, {
                        name: "y",
                        enabled: true
                    }, {
                        name: "z",
                        enabled: false
                    }]
                });

                const { args, errors } = await parse("1", "2", "3");
                expect(args.get("x")).to.be.equal("1");
                expect(args.get("y")).to.be.equal("2");
                assert.throws(() => {
                    args.get("z");
                }, "No such argument: z");
                expect(errors).to.have.length(1);
                expect(errors[0]).to.be.instanceof(error.IllegalStateException);
                expect(errors[0].message).to.be.equal("unknown parameter: 3");
            });
        });
    });

    describe("options", () => {
        describe("actions", () => {
            describe("store_true", () => {
                it("should store true if is passed", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "store_true" }
                        ]
                    });
                    const { opts } = await parse("--x");
                    expect(opts.get("x")).to.be.true();
                });

                it("should store true if is not passed", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "store_true" }
                        ]
                    });
                    const { opts } = await parse();
                    expect(opts.get("x")).to.be.false();
                });
            });

            describe("store_false", () => {
                it("should store false if is passed", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "store_false" }
                        ]
                    });
                    const { opts } = await parse("--x");
                    expect(opts.get("x")).to.be.false();
                });

                it("should store true if is not passed", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "store_false" }
                        ]
                    });
                    const { opts } = await parse();
                    expect(opts.get("x")).to.be.true();
                });
            });

            describe("store_const", () => {
                it("should store const value if is passed", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "store_const", const: 42 }
                        ]
                    });
                    const { opts } = await parse("--x");
                    expect(opts.get("x")).to.be.equal(42);
                });
            });

            describe("store", () => {
                it("should store a value", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "store" }
                        ]
                    });
                    const { opts } = await parse("--x", "1");
                    expect(opts.get("x")).to.be.equal("1");
                });
            });

            describe("append", () => {
                it("should store passed values", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "append" }
                        ]
                    });
                    const { opts } = await parse("--x", "1", "--x", "2", "--x", "3");
                    expect(opts.get("x")).to.be.deep.equal(["1", "2", "3"]);
                });

                it("should be [] by default", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", action: "append" },
                            { name: "--a" }
                        ]
                    });
                    const { opts } = await parse("--a");
                    expect(opts.get("x")).to.be.deep.equal([]);
                });
            });

            describe("count", () => {
                it("should count the number of occurencies", async () => {
                    app.defineArguments({
                        options: [
                            { name: "-x", action: "count" }
                        ]
                    });
                    const { opts } = await parse("-x", "-x", "-x");
                    expect(opts.get("x")).to.be.equal(3);
                });

                it("should be 0 by default", async () => {
                    app.defineArguments({
                        options: [
                            { name: "-x", action: "count" }
                        ]
                    });
                    const { opts } = await parse();
                    expect(opts.get("x")).to.be.equal(0);
                });
            });
        });

        describe("type", () => {
            it("should be a string by default", async () => {
                app.defineArguments({
                    options: [
                        { name: "--x", nargs: 1 }
                    ]
                });
                const { opts } = await parse("--x", "hello world");
                expect(opts.get("x")).to.be.equal("hello world");
            });

            it("should return a number", async () => {
                app.defineArguments({
                    options: [
                        { name: "--x", type: Number }
                    ]
                });
                const { opts } = await parse("--x", "1");
                expect(opts.get("x")).to.be.equal(1);
            });

            it("should return a list of numbers", async () => {
                app.defineArguments({
                    options: [
                        { name: "--x", type: Number, nargs: "+" }
                    ]
                });
                const { opts } = await parse("--x", "1", "2", "3", "4", "5");
                expect(opts.get("x")).to.be.deep.equal([1, 2, 3, 4, 5]);
            });

            it("should call a function", async () => {
                app.defineArguments({
                    options: [
                        { name: "--x", type: () => null },
                        { name: "--y", type: JSON.parse }
                    ]
                });
                const { opts } = await parse("--x", "1", "--y", '{"a":[1,2,3]}');
                expect(opts.get("x")).to.be.null();
                expect(opts.get("y")).to.be.deep.equal({ a: [1, 2, 3] });
            });

            it("should pass an argument index to the function in case of variadic params", async () => {
                app.defineArguments({
                    options: [
                        { name: "--x", type: (x, i) => [x, i], nargs: "+" },
                        { name: "--y", type: (x, i) => [x, i], nargs: "+" }
                    ]
                });
                const { opts } = await parse("--x", "1", "2", "--y", "3", "4");
                expect(opts.get("x")).to.be.deep.equal([["1", 0], ["2", 1]]);
                expect(opts.get("y")).to.be.deep.equal([["3", 0], ["4", 1]]);
            });

            it("should create a class instance", async () => {
                class Wrapper {
                    constructor(a) {
                        this.value = a;
                    }
                }

                app.defineArguments({
                    options: [
                        { name: "--x", type: () => null },
                        { name: "--y", type: Wrapper }
                    ]
                });
                const { opts } = await parse("--x", "1", "--y", "hello");
                expect(opts.get("x")).to.be.null();
                const w = opts.get("y");
                expect(w).to.be.instanceOf(Wrapper);
                expect(w.value).to.be.equal("hello");
            });

            it("should support array of types", async () => {
                app.defineArguments({
                    options: [
                        { name: "--x", nargs: 2, type: [Number, String] },
                        { name: "--y" }
                    ]
                });
                const { opts } = await parse("--x", "1", "2", "--y");
                expect(opts.get("x")).to.be.deep.equal([1, "2"]);
                expect(opts.get("y")).to.be.true();
            });

            context("regexp", () => {
                it("should support regexps", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", type: /^\d+$/ },
                            { name: "--y", type: /^[a-z]+$/ },
                            { name: "--z", type: /^(\d+) (\d+)$/ }
                        ]
                    });
                    const { opts, errors } = await parse("--x", "1", "--y", "abcdef", "--z", "123 45");
                    expect(errors).to.be.empty();
                    expect(opts.get("x")).to.be.deep.equal("1".match(/^\d+$/));
                    expect(opts.get("y")).to.be.deep.equal("abcdef".match(/^[a-z]+$/));
                    expect(opts.get("z")).to.be.deep.equal("123 45".match(/^(\d+) (\d+)$/));
                });

                it("should throw a fatal error if mismatches", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", type: /^\d+$/ }
                        ]
                    });
                    const { errors } = await parse("--x", "hey");
                    expect(errors).to.have.lengthOf(1);
                    expect(errors[0].message).to.be.equal(`--x: Incorrect value, must match ${/^\d+$/}`);
                    expect(errors[0].fatal).to.be.true();
                });
            });
        });

        describe("nargs", () => {
            describe("nargs is an intgerer", () => {
                it("should be a value when = 1", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: 1 }
                        ]
                    });
                    const { opts } = await parse("--x", "1");
                    expect(opts.get("x")).to.be.equal("1");
                });

                it("should be an array when > 1", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: 2 }
                        ]
                    });
                    const { opts } = await parse("--x", "1", "2");
                    expect(opts.get("x")).to.be.deep.equal(["1", "2"]);
                });
            });

            describe("nargs = +", () => {
                it("should support 1 value", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "+" }
                        ]
                    });
                    const { opts } = await parse("--x", "1");
                    expect(opts.get("x")).to.be.deep.equal(["1"]);
                });

                it("should support many values", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "+" }
                        ]
                    });
                    const { opts } = await parse("--x", "1", "2", "3", "4", "5");
                    expect(opts.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                });
            });

            describe("nargs = *", () => {
                it("should support 0 values", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "*" }
                        ]
                    });
                    const { opts } = await parse("--x");
                    expect(opts.get("x")).to.be.deep.equal([]);
                });

                it("should support 1 value", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "*" }
                        ]
                    });
                    const { opts } = await parse("--x", "1");
                    expect(opts.get("x")).to.be.deep.equal(["1"]);
                });

                it("should support many values", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "*" }
                        ]
                    });
                    const { opts } = await parse("--x", "1", "2", "3", "4", "5");
                    expect(opts.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                });
            });

            describe("nargs = ?", () => {
                it("should support 0 values", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "?" }
                        ]
                    });
                    const { opts } = await parse("--x");
                    expect(opts.get("x")).to.be.deep.equal("");
                });

                it("should support 1 value", async () => {
                    app.defineArguments({
                        options: [
                            { name: "--x", nargs: "?" }
                        ]
                    });
                    const { opts } = await parse("--x", "1");
                    expect(opts.get("x")).to.be.equal("1");
                });
            });

            describe("combining with arguments", () => {
                specify("1 <-> bool", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x" }
                        ],
                        options: [
                            { name: "--y" }
                        ]
                    });
                    {
                        const { args, opts } = await parse("--y", "1");
                        expect(args.get("x")).to.be.equal("1");
                        expect(opts.get("y")).to.be.true();
                    }
                    {
                        const { args, opts } = await parse("1", "--y");
                        expect(args.get("x")).to.be.equal("1");
                        expect(opts.get("y")).to.be.true();
                    }
                });

                specify("1 <-> 1", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x" }
                        ],
                        options: [
                            { name: "--y", nargs: 1 }
                        ]
                    });
                    {
                        const { args, opts } = await parse("--y", "1", "2");
                        expect(args.get("x")).to.be.equal("2");
                        expect(opts.get("y")).to.be.equal("1");
                    }
                    {
                        const { args, opts } = await parse("1", "--y", "2");
                        expect(args.get("x")).to.be.equal("1");
                        expect(opts.get("y")).to.be.equal("2");
                    }
                });

                specify("+ <-> 2", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "+" }
                        ],
                        options: [
                            { name: "--y", nargs: 2 }
                        ]
                    });
                    {
                        const { args, opts } = await parse("--y", "1", "2", "1", "2", "3", "4", "5");
                        expect(args.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                        expect(opts.get("y")).to.be.deep.equal(["1", "2"]);
                    }
                    {
                        const { args, opts } = await parse("1", "2", "3", "4", "5", "--y", "1", "2");
                        expect(args.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                        expect(opts.get("y")).to.be.deep.equal(["1", "2"]);
                    }
                });

                specify("2 <-> +", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: 2 }
                        ],
                        options: [
                            { name: "--y", nargs: "+" }
                        ]
                    });
                    {
                        const { args, opts } = await parse("--y", "1", "2", "1", "2", "3", "4", "5");
                        expect(args.get("x")).to.be.deep.equal(["4", "5"]);
                        expect(opts.get("y")).to.be.deep.equal(["1", "2", "1", "2", "3"]);
                    }
                    {
                        const { args, opts } = await parse("1", "2", "--y", "1", "2", "3", "4", "5");
                        expect(args.get("x")).to.be.deep.equal(["1", "2"]);
                        expect(opts.get("y")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                    }
                });

                specify("+ <-> +", async () => {
                    app.defineArguments({
                        arguments: [
                            { name: "x", nargs: "+" }
                        ],
                        options: [
                            { name: "--y", nargs: "+" }
                        ]
                    });
                    {
                        const { args, opts } = await parse("--y", "1", "2", "1", "2", "3", "4", "5");
                        expect(args.get("x")).to.be.deep.equal(["5"]);
                        expect(opts.get("y")).to.be.deep.equal(["1", "2", "1", "2", "3", "4"]);
                    }
                    {
                        const { args, opts } = await parse("1", "2", "3", "4", "5", "--y", "1", "2");
                        expect(args.get("x")).to.be.deep.equal(["1", "2", "3", "4", "5"]);
                        expect(opts.get("y")).to.be.deep.equal(["1", "2"]);
                    }
                });

                specify("1 <-> ?", async () => {
                    app.defineArguments({
                        arguments: [
                            "x"
                        ],
                        options: [
                            { name: "--y", nargs: "?" }
                        ]
                    });
                    {
                        const { args, opts } = await parse("1", "--y");
                        expect(args.get("x")).to.be.equal("1");
                        expect(opts.get("y")).to.be.equal("");
                    }
                    {
                        const { args, opts } = await parse("1", "--y", "1");
                        expect(args.get("x")).to.be.equal("1");
                        expect(opts.get("y")).to.be.equal("1");
                    }
                    {
                        const { args, opts } = await parse("--y", "1", "2");
                        expect(args.get("x")).to.be.equal("2");
                        expect(opts.get("y")).to.be.equal("1");
                    }
                    {
                        const { args, opts } = await parse("--y", "2");
                        expect(args.get("x")).to.be.equal("2");
                        expect(opts.get("y")).to.be.equal("");
                    }
                });
            });
        });

        describe("composite options", () => {
            it("should split boolean options", async () => {
                app.defineArguments({
                    options: ["-a", "-b", "-c"]
                });
                const { opts } = await parse("-abc");
                expect(opts.get("a")).to.be.true();
                expect(opts.get("b")).to.be.true();
                expect(opts.get("c")).to.be.true();
            });

            it("should not split if there is an exact match", async () => {
                app.defineArguments({
                    options: ["-a", "-b", "-c", "-abc"]
                });
                const { opts } = await parse("-abc");
                expect(opts.get("a")).to.be.false();
                expect(opts.get("b")).to.be.false();
                expect(opts.get("c")).to.be.false();
                expect(opts.get("abc")).to.be.true();
            });

            it("should throw on an attempt to group an opt with args", async () => {
                app.defineArguments({
                    options: ["-a", "-b", "-c", { name: "-d", nargs: 1 }]
                });
                const { errors } = await parse("-abd", "--1");
                expect(errors).to.have.length(1);
                expect(errors[0]).to.be.instanceof(error.IllegalStateException);
                expect(errors[0].message).to.be.equal("Options with arguments cannot be grouped: -d");
            });

            it("should handle options with count action", async () => {
                app.defineArguments({
                    options: ["-a", "-b", "-c", "-d", { name: "-v", action: "count" }]
                });
                const { opts } = await parse("-a", "-cvv", "-vvvbvvv", "-v");
                expect(opts.get("a")).to.be.true();
                expect(opts.get("b")).to.be.true();
                expect(opts.get("c")).to.be.true();
                expect(opts.get("d")).to.be.false();
                expect(opts.get("v")).to.be.equal(9);
            });
        });

        describe("enabled flag", () => {
            it("should not add disabled option", async () => {
                app.defineArguments({
                    options: [{
                        name: "-a"
                    }, {
                        name: "--hello",
                        enabled: true
                    }, {
                        name: "--world",
                        nargs: 1,
                        enabled: false
                    }]
                });

                const { opts, errors } = await parse("--hello", "-a", "--world", "2");
                expect(opts.get("hello")).to.be.true();
                expect(opts.get("a")).to.be.true();
                assert.throws(() => {
                    opts.get("world");
                }, "No such argument: world");
                expect(errors).to.have.length(2);
                expect(errors[0]).to.be.instanceof(error.IllegalStateException);
                expect(errors[0].message).to.be.equal("unknown option: --world");
                expect(errors[1]).to.be.instanceof(error.IllegalStateException);
                expect(errors[1].message).to.be.equal("unknown parameter: 2");
            });

            it("should not add disabled option via defineOption", async () => {
                app.defineArguments({
                    options: [{
                        name: "--hello"
                    }, {
                        name: "--world",
                        enabled: true
                    }]
                });

                app.defineOption({
                    name: "--c",
                    nargs: 1,
                    enabled: false
                });

                app.defineOption({
                    name: "--d",
                    nargs: 1,
                    enabled: true
                });

                const { opts, errors } = await parse("--hello", "--world", "--d", "1", "--c", "2");
                expect(opts.get("hello")).to.be.true();
                expect(opts.get("world")).to.be.true();
                expect(opts.get("d")).to.be.equal("1");
                assert.throws(() => {
                    opts.get("c");
                }, "No such argument: c");
                expect(errors).to.have.length(2);
                expect(errors[0]).to.be.instanceof(error.IllegalStateException);
                expect(errors[0].message).to.be.equal("unknown option: --c");
                expect(errors[1]).to.be.instanceof(error.IllegalStateException);
                expect(errors[1].message).to.be.equal("unknown parameter: 2");
            });
        });
    });
});
