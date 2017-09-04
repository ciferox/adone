describe("terminal", "prompt", () => {
    const { promise: { delay }, terminal: { Terminal } } = adone;

    class TerminfoMock extends adone.Terminal.Terminfo {
        setup() {
            //
        }
    }

    class TerminalMock extends adone.Terminal {
        initialize() {
            this.cols = 120;
            this.rows = 120;
            this.input = new adone.std.stream.PassThrough();
            this.output = new adone.std.stream.PassThrough();
            this.terminfo = new TerminfoMock();
        }
    }

    class Collector {
        constructor(stream) {
            this.chunks = [];
            this.stream = stream;
            this.collector = (chunk) => {
                this.chunks.push(chunk);
            };
            this.stream.on("data", this.collector);
        }

        stop() {
            this.stream.removeListener("data", this.collector);
        }

        data() {
            return adone.text.ansi.stripEscapeCodes(this.chunks.reduce((x, y) => x + y));
        }
    }

    const getOutputCollector = () => new Collector(terminal.readline.output);

    let terminal;

    beforeEach(() => {
        terminal = new TerminalMock();
    });

    const emitKeypress = async (...args) => {
        terminal.readline.input.emit("keypress", ...args);
    };

    const emitLines = async (lines, _delay = 50) => {
        if (adone.is.number(lines)) {
            lines = adone.util.range(lines).fill("");
        }
        for (const s of lines) {
            terminal.input.write(`${s}\n`);
            await delay(_delay);
        }
    };

    const emitTab = () => emitKeypress("", { name: "tab" });
    const emitDown = () => emitKeypress("", { name: "down" });
    const emitUp = () => emitKeypress("", { name: "up" });
    const emitEnter = () => emitLines(1);
    const emitChars = async (word, _delay = 5) => {
        for (const ch of word) {
            // eslint-disable-next-line
            await emitKeypress(ch, _delay);
        }
    };
    const emitNonChar = () => emitKeypress("", { shift: true });


    describe("prompt", () => {
        it("should take a prompts array and return answers", async () => {
            const prompts = [{
                type: "confirm",
                name: "q1",
                message: "message"
            }, {
                type: "confirm",
                name: "q2",
                message: "message",
                default: false
            }];

            const promise = terminal.prompt().run(prompts);

            await emitLines(2);

            const answers = await promise;

            expect(answers.q1).to.be.true;
            expect(answers.q2).to.be.false;
        });

        it("should take a prompts array with nested names", async () => {
            const prompts = [{
                type: "confirm",
                name: "foo.bar.q1",
                message: "message"
            }, {
                type: "confirm",
                name: "foo.q2",
                message: "message",
                default: false
            }];

            const promise = terminal.prompt().run(prompts);

            await emitLines(2);

            const answers = await promise;

            expect(answers).to.deep.equal({
                foo: {
                    bar: {
                        q1: true
                    },
                    q2: false
                }
            });
        });

        it("should take a single prompt and return answer", async () => {
            const prompt = {
                type: "input",
                name: "q1",
                message: "message",
                default: "bar"
            };

            const promise = terminal.prompt().run(prompt);
            await emitLines(1);
            const answers = await promise;
            expect(answers.q1).to.equal("bar");
        });

        it("should parse `message` if passed as a function", async () => {
            const prompts = [{
                type: "input",
                name: "name1",
                message: "message",
                default: "bar"
            }, {
                type: "input",
                name: "name2",
                message: mock().withExactArgs({ name1: "bar" }).returns("name2 message"),
                default: "foo"
            }];
            const collector = getOutputCollector();
            const promise = terminal.prompt().run(prompts);
            await emitLines(2);
            const answers = await promise;
            collector.stop();
            expect(answers).to.be.deep.equal({
                name1: "bar",
                name2: "foo"
            });
            expect(prompts[1].message).to.have.been.calledOnce;
            expect(collector.data()).to.include("name2 message");
        });

        it("should run asynchronous `message`", async () => {
            const prompts = [{
                type: "input",
                name: "name1",
                message: "message",
                default: "bar"
            }, {
                type: "input",
                name: "name2",
                message: mock().withExactArgs({ name1: "bar" }).callsFake(async () => {
                    await delay(100);
                    return "name2 message";
                }),
                default: "foo"
            }];
            const collector = getOutputCollector();
            const promise = terminal.prompt().run(prompts);
            await emitLines(2, 300);
            const answers = await promise;
            collector.stop();
            expect(answers).to.be.deep.equal({ name1: "bar", name2: "foo" });
            expect(prompts[1].message).to.have.been.calledOnce;
            expect(collector.data()).to.include("name2 message");
        });

        it("should parse `default` if passed as a function", async () => {
            const prompts = [{
                type: "input",
                name: "name1",
                message: "message",
                default: "bar"
            }, {
                type: "input",
                name: "name2",
                message: "message",
                default: mock().withExactArgs({ name1: "bar" }).returns("foo")
            }];

            const promise = terminal.prompt().run(prompts);
            await emitLines(2);
            const answers = await promise;
            expect(prompts[1].default).to.have.been.calledOnce;
            expect(answers).to.be.deep.equal({ name1: "bar", name2: "foo" });
        });

        it("should run asynchronous `default`", async () => {
            const prompts = [{
                type: "input",
                name: "name1",
                message: "message",
                default: "bar"
            }, {
                type: "input",
                name: "name2",
                message: "message",
                default: mock().withExactArgs({ name1: "bar" }).callsFake(async () => {
                    await delay(10);
                    return "foo";
                })
            }];

            const promise = terminal.prompt().run(prompts);
            await emitLines(2);
            const answers = await promise;
            expect(prompts[1].default).to.have.been.calledOnce;
            expect(answers).to.be.deep.equal({
                name1: "bar",
                name2: "foo"
            });
        });

        it("should parse `choices` if passed as a function", async () => {
            const prompts = [{
                type: "input",
                name: "name1",
                message: "message"
            }, {
                type: "list",
                name: "name2",
                message: "message2",
                choices: mock().withExactArgs({ name1: "hello" }).returns(["foo", "bar"])
            }];

            const collector = getOutputCollector();
            const promise = terminal.prompt().run(prompts);
            await emitLines([
                "hello",
                "foo"
            ]);
            const answers = await promise;
            collector.stop();
            expect(answers).to.be.deep.equal({ name1: "hello", name2: "foo" });
            expect(prompts[1].choices).to.have.been.calledOnce;
            expect(collector.data()).to.match(/\(Use arrow keys\)\n. foo \n\s{2}bar/);
        });

        describe("hierarchical mode (`when`)", () => {
            it("should pass current answers to `when`", async () => {
                const prompts = [{
                    type: "confirm",
                    name: "q1",
                    message: "message"
                }, {
                    name: "q2",
                    message: "message",
                    when: mock().withExactArgs({ q1: true }).returns(false)
                }];

                const promise = terminal.prompt().run(prompts);
                await emitLines([
                    "Y"
                ]);
                const answers = await promise;
                expect(prompts[1].when).to.have.been.calledOnce;
                expect(answers).to.be.deep.equal({ q1: true });
            });

            it("should run prompt if `when` returns true", async () => {
                const prompts = [{
                    type: "confirm",
                    name: "q1",
                    message: "message"
                }, {
                    type: "input",
                    name: "q2",
                    message: "message",
                    default: "bar-var",
                    when: mock().withExactArgs({ q1: true }).returns(true)
                }];

                const promise = terminal.prompt().run(prompts);
                await emitLines([
                    "Y",
                    ""
                ]);
                const answers = await promise;
                expect(answers).to.be.deep.equal({ q1: true, q2: "bar-var" });
                expect(prompts[1].when).to.have.been.calledOnce;
            });

            it("should run prompt if `when` is true", async () => {
                const prompts = [{
                    type: "confirm",
                    name: "q1",
                    message: "message"
                }, {
                    type: "input",
                    name: "q2",
                    message: "message",
                    default: "bar-var",
                    when: true
                }];

                const promise = terminal.prompt().run(prompts);
                await emitLines([
                    "Y",
                    "hello"
                ]);
                const answers = await promise;
                expect(answers).to.be.deep.equal({ q1: true, q2: "hello" });
            });

            it("should not run prompt if `when` returns false", async () => {
                const prompts = [{
                    type: "confirm",
                    name: "q1",
                    message: "message"
                }, {
                    type: "confirm",
                    name: "q2",
                    message: "message",
                    when: stub().returns(false)
                }, {
                    type: "input",
                    name: "q3",
                    message: "message",
                    default: "foo"
                }];

                const promise = terminal.prompt().run(prompts);
                await emitLines([
                    "Y",
                    ""
                ]);
                const answers = await promise;
                expect(answers).to.be.deep.equal({ q1: true, q3: "foo" });
                expect(prompts[1].when).to.have.been.calledOnce;
            });

            it("should not run prompt if `when` is false", async () => {
                const prompts = [{
                    type: "confirm",
                    name: "q1",
                    message: "message"
                }, {
                    type: "confirm",
                    name: "q2",
                    message: "message",
                    when: false
                }, {
                    type: "input",
                    name: "q3",
                    message: "message",
                    default: "foo"
                }];

                const promise = terminal.prompt().run(prompts);
                await emitLines([
                    "Y",
                    "bar"
                ]);
                const answers = await promise;
                expect(answers).to.be.deep.equal({ q1: true, q3: "bar" });
            });

            it("should run asynchronous `when`", async () => {
                const prompts = [{
                    type: "confirm",
                    name: "q1",
                    message: "message"
                }, {
                    type: "input",
                    name: "q2",
                    message: "message",
                    default: "foo-bar",
                    when: mock().withExactArgs({ q1: true }).callsFake(async () => {
                        await delay(50);
                        return true;
                    })
                }];

                const promise = terminal.prompt().run(prompts);
                await emitLines([
                    "Y",
                    ""
                ], 100);
                const answers = await promise;
                expect(answers).to.be.deep.equal({ q1: true, q2: "foo-bar" });
                expect(prompts[1].when).to.have.been.calledOnce;
            });
        });
    });

    let fixtures;

    beforeEach(() => {
        fixtures = {
            input: {
                message: "message",
                name: "name"
            },

            confirm: {
                message: "message",
                name: "name"
            },

            password: {
                message: "message",
                name: "name"
            },

            list: {
                message: "message",
                name: "name",
                choices: ["foo", terminal.separator(), "bar", "bum"]
            },

            rawlist: {
                message: "message",
                name: "name",
                choices: ["foo", "bar", terminal.separator(), "bum"]
            },

            expand: {
                message: "message",
                name: "name",
                choices: [
                    { key: "a", name: "acab" },
                    terminal.separator(),
                    { key: "b", name: "bar" },
                    { key: "c", name: "chile" },
                    { key: "d", name: "d", value: false }
                ]
            },

            checkbox: {
                message: "message",
                name: "name",
                choices: [
                    "choice 1",
                    terminal.separator(),
                    "choice 2",
                    "choice 3"
                ]
            },

            editor: {
                message: "message",
                name: "name",
                default: "Inquirer"
            },
            autocomplete: {
                message: "message",
                name: "name",
                source: async () => ["foo", terminal.separator(), "bar", "bum"]
            }
        };
    });


    describe("api", () => {
        const prompts = [
            {
                name: "input",
                apis: [
                    "filter",
                    "validate",
                    "default",
                    "message",
                    "requiredValues"
                ]
            },
            {
                name: "confirm",
                apis: [
                    "message",
                    "requiredValues"
                ]
            },
            {
                name: "rawlist",
                apis: [
                    "filter",
                    "message",
                    "choices",
                    "requiredValues"
                ]
            },
            {
                name: "list",
                apis: [
                    "filter",
                    "message",
                    "choices",
                    "requiredValues"
                ]
            },
            {
                name: "expand",
                apis: [
                    "requiredValues",
                    "message"
                ]
            },
            {
                name: "checkbox",
                apis: [
                    "requiredValues",
                    "message",
                    "choices",
                    "filter",
                    "validate"
                ]
            },
            {
                name: "password",
                apis: [
                    "requiredValues",
                    "message",
                    "filter",
                    "validate",
                    "default"
                ]
            }
        ];

        const tests = {
            filter(type) {
                describe("filter API", () => {
                    it("should filter the user input", async function () {
                        this.fixture.filter = function () {
                            return "pass";
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        const answer = await promise;
                        expect(answer).to.be.equal("pass");
                    });

                    it("should allow filter function to be asynchronous", async function () {
                        this.fixture.filter = async () => {
                            await delay(50);
                            return "pass";
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        const answer = await promise;
                        expect(answer).to.be.equal("pass");
                    });

                    it("should handle errors produced in filters", {
                        skip: type === "list" // doesnt work well
                    }, async function () {
                        let called = 0;

                        this.fixture.filter = () => {
                            called++;

                            if (called === 2) {
                                return "pass";
                            }

                            emitLines(1);
                            throw new Error("fail");
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        const answer = await promise;
                        expect(answer).to.be.equal("pass");
                    });

                    it("should handle errors produced in async filters", {
                        skip: type === "list" // doesnt work well
                    }, async function () {
                        let called = 0;

                        this.fixture.filter = async () => {
                            called++;

                            if (called === 2) {
                                return "pass";
                            }

                            emitLines(1);
                            throw new Error("fail");
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        const answer = await promise;
                        expect(answer).to.be.equal("pass");
                    });

                    it("should pass previous answers to the prompt filter function", async () => {
                        const questions = [{
                            type: "confirm",
                            name: "q1",
                            message: "message"
                        }, {
                            type: "confirm",
                            name: "q2",
                            message: "message",
                            filter: mock().withArgs(match.any, { q1: true }).returnsArg(0),
                            default: false
                        }];

                        const promise = terminal.prompt().run(questions);
                        await emitLines([
                            "Y",
                            ""
                        ]);
                        const answers = await promise;
                        expect(answers).to.be.deep.equal({ q1: true, q2: false });
                    });
                });
            },

            validate() {
                describe("validate API", () => {
                    it("should reject input if boolean false is returned", async function () {
                        let called = 0;

                        this.fixture.validate = () => {
                            called++;
                            // Make sure returning false won't continue
                            if (called === 2) {
                                return true;
                            }

                            emitLines(1);
                            return false;
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        emitLines(1);
                        await promise;
                        expect(called).to.be.equal(2);
                    });

                    it("should reject input if a string is returned", async function () {
                        let called = 0;
                        const errorMessage = "uh oh, error!";

                        this.fixture.validate = function () {
                            called++;
                            // Make sure returning false won't continue
                            if (called === 2) {
                                return true;
                            }

                            emitLines(1);
                            return errorMessage;
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        await promise;
                        expect(called).to.be.equal(2);
                    });

                    it("should reject input if a Promise is returned which rejects", async function () {
                        let called = 0;
                        const errorMessage = "uh oh, error!";

                        this.fixture.validate = () => {
                            called++;
                            // Make sure returning false won't continue
                            if (called === 2) {
                                return true;
                            }

                            emitLines(1);
                            return Promise.reject(errorMessage);
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        await promise;
                        expect(called).to.be.equal(2);
                    });

                    it("should accept input if boolean true is returned", async function () {
                        const validate = this.fixture.validate = stub().returns(true);

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        await promise;
                        expect(validate).to.have.been.calledOnce;
                    });

                    it("should allow validate function to be asynchronous", async function () {
                        let called = 0;

                        this.fixture.validate = async () => {
                            ++called;
                            if (called === 2) {
                                return true;
                            }
                            emitLines(1);
                            return false;
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        await promise;
                        expect(called).to.be.equal(2);
                    });

                    it("should allow validate function to return a Promise", async function () {
                        this.fixture.validate = function () {
                            return Promise.resolve(true);
                        };

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const promise = prompt.run();
                        await emitLines(1);
                        await promise;
                    });

                    it("should pass previous answers to the prompt validation function", async () => {
                        const questions = [{
                            type: "confirm",
                            name: "q1",
                            message: "message"
                        }, {
                            type: "confirm",
                            name: "q2",
                            message: "message",
                            validate: mock().withExactArgs({ q1: true }).returns(true),
                            default: false
                        }];

                        const promise = terminal.prompt().run(questions);
                        await emitLines(2);
                        const answer = await promise;
                        expect(answer).to.be.deep.equal({ q1: true, q2: false });
                    });
                });
            },

            default() {
                describe("default API", () => {
                    it("should allow a default value", async function () {
                        this.fixture.default = "pass";

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const collector = getOutputCollector();
                        const promise = prompt.run();
                        await emitLines(1);
                        const answer = await promise;
                        collector.stop();
                        expect(answer).to.be.equal("pass");
                        expect(collector.data()).to.include("(pass)");
                    });

                    it("should allow a falsy default value", async function () {
                        this.fixture.default = 0;
                        const prompt = new this.Prompt(terminal, this.fixture);
                        const collector = getOutputCollector();
                        const promise = prompt.run();
                        await emitLines(1);
                        const answer = await promise;
                        collector.stop();
                        expect(answer).to.be.equal(0);
                        expect(collector.data()).to.include("(0)");
                    });
                });
            },

            message() {
                describe("message API", () => {
                    it("should print message on screen", async function () {
                        this.fixture.message = "Foo bar bar foo bar";

                        const prompt = new this.Prompt(terminal, this.fixture);
                        const collector = getOutputCollector();
                        prompt.run();
                        await delay(50);
                        collector.stop();
                        expect(collector.data()).to.include(this.fixture.message);
                    });
                });
            },

            choices() {
                describe("choices API", () => {
                    it("should print choices to screen", async function () {
                        const prompt = new this.Prompt(terminal, this.fixture);
                        const choices = prompt.opt.choices;
                        const collector = getOutputCollector();
                        prompt.run();
                        await delay(50);
                        for (const choice of choices.filter(Terminal.Separator.exclude)) {
                            expect(collector.data()).to.include(choice.name);
                        }
                    });
                });
            },

            requiredValues() {
                describe("Missing value", () => {
                    it("`message` should throw", function () {
                        const mkPrompt = () => {
                            delete this.fixture.message;
                            return new this.Prompt(terminal, this.fixture);
                        };
                        expect(mkPrompt).to.throw(/message/);
                    });

                    it("`name` should throw", function () {
                        const mkPrompt = () => {
                            delete this.fixture.name;
                            return new this.Prompt(terminal, this.fixture);
                        };
                        expect(mkPrompt).to.throw(/name/);
                    });
                });
            }
        };

        for (const detail of prompts) {
            // eslint-disable-next-line no-loop-func
            describe(`on ${detail.name} prompt`, () => {
                beforeEach(function () {
                    this.fixture = adone.util.clone(fixtures[detail.name]);
                    this.Prompt = adone.Terminal.Prompt.prompts[detail.name];
                });

                for (const apiName of detail.apis) {
                    tests[apiName](detail.name);
                }
            });
        }
    });

    describe("prompts", () => {
        describe("base", () => {
            it("should not point by reference to the entry `question` object", () => {
                const question = {
                    message: "foo bar",
                    name: "name"
                };
                const base = new Terminal.BasePrompt(terminal, question);
                expect(question).to.not.equal(base.opt);
                expect(question.name).to.equal(base.opt.name);
                expect(question.message).to.equal(base.opt.message);
            });
        });

        describe("checkbox", () => {
            const createCheckbox = (fixture, answers) => new Terminal.Prompt.prompts.checkbox(terminal, fixture, answers);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.checkbox);
                this.checkbox = createCheckbox(this.fixture);
            });

            it("should return a single selected choice in an array", async function () {
                const promise = this.checkbox.run();
                await emitKeypress(" ", { name: "space" });
                await emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 1"]);
            });

            it("should return multiples selected choices in an array", async function () {
                const promise = this.checkbox.run();
                await emitKeypress(" ", { name: "space" });
                await emitKeypress(null, { name: "down" });
                await emitKeypress(" ", { name: "space" });
                await emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 1", "choice 2"]);
            });

            it("should check defaults choices", async function () {
                this.fixture.choices = [
                    { name: "1", checked: true },
                    { name: "2", checked: false },
                    { name: "3", checked: false }
                ];
                this.checkbox = createCheckbox(this.fixture);
                const promise = this.checkbox.run();
                await emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["1"]);
            });

            it("provide an array of checked choice to validate", async function () {
                this.fixture.choices = [
                    { name: "1", checked: true },
                    { name: "2", checked: 1 },
                    { name: "3", checked: false }
                ];
                this.fixture.validate = stub().withArgs(["1", "2"]).returns(true);
                this.checkbox = createCheckbox(this.fixture);
                const promise = this.checkbox.run();
                await emitLines(1);
                await promise;
            });

            it("should check defaults choices if given as array of values", async function () {
                this.fixture.choices = [
                    { name: "1" },
                    { name: "2" },
                    { name: "3" }
                ];
                this.fixture.default = ["1", "3"];
                this.checkbox = createCheckbox(this.fixture);
                const promise = this.checkbox.run();
                await emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["1", "3"]);
            });

            it("should toggle choice when hitting space", async function () {
                const promise = this.checkbox.run();
                emitKeypress(" ", { name: "space" });
                emitKeypress(null, { name: "down" });
                emitKeypress(" ", { name: "space" });
                emitKeypress(" ", { name: "space" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 1"]);
            });

            it("should allow for arrow navigation", async function () {
                const promise = this.checkbox.run();
                emitKeypress(null, { name: "down" });
                emitKeypress(null, { name: "down" });
                emitKeypress(null, { name: "up" });
                emitKeypress(" ", { name: "space" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 2"]);
            });

            it("should allow for vi-style navigation", async function () {
                const promise = this.checkbox.run();
                emitKeypress("j", { name: "j" });
                emitKeypress("j", { name: "j" });
                emitKeypress("k", { name: "k" });
                emitKeypress(" ", { name: "space" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 2"]);
            });

            it("should allow for emacs-style navigation", async function () {
                const promise = this.checkbox.run();
                emitKeypress("n", { name: "n", ctrl: true });
                emitKeypress("n", { name: "n", ctrl: true });
                emitKeypress("p", { name: "p", ctrl: true });
                emitKeypress(" ", { name: "space" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 2"]);
            });

            it("should allow 1-9 shortcut key", async function () {
                const promise = this.checkbox.run();
                emitKeypress("2");
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.deep.equal(["choice 2"]);
            });

            it("should select all answers if <a> is pressed", async function () {
                const promise = this.checkbox.run();
                emitKeypress("a", { name: "a" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.have.lengthOf(3);
            });

            it("should select no answers if <a> is pressed a second time", async function () {
                const promise = this.checkbox.run();
                emitKeypress("a", { name: "a" });
                emitKeypress("a", { name: "a" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.empty;
            });

            it("should select the inverse of the current selection when <i> is pressed", async function () {
                const promise = this.checkbox.run();
                emitKeypress("i", { name: "i" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.have.lengthOf(3);
            });

            describe("with disabled choices", () => {
                beforeEach(function () {
                    this.fixture.choices.push({
                        name: "dis1",
                        disabled: true
                    });
                    this.fixture.choices.push({
                        name: "dis2",
                        disabled: "uh oh"
                    });
                    this.checkbox = createCheckbox(this.fixture);
                });

                it("output disabled choices and custom messages", async function () {
                    const collector = getOutputCollector();
                    const promise = this.checkbox.run();
                    emitLines(1);
                    await promise;
                    collector.stop();
                    expect(collector.data()).to.include("- dis1 (Disabled)").and.to.include("- dis2 (uh oh)");
                });

                it("skip disabled choices", async function () {
                    const promise = this.checkbox.run();
                    emitKeypress(null, { name: "down" });
                    emitKeypress(null, { name: "down" });
                    emitKeypress(null, { name: "down" });
                    emitKeypress(" ", { name: "space" });
                    emitLines(1);
                    const answer = await promise;
                    expect(answer).to.be.deep.equal(["choice 1"]);
                });

                it("uncheck defaults choices who're disabled", async function () {
                    this.fixture.choices = [
                        { name: "1", checked: true, disabled: true },
                        { name: "2" }
                    ];
                    this.checkbox = createCheckbox(this.fixture);
                    const promise = this.checkbox.run();
                    emitLines(1);
                    const answer = await promise;
                    expect(answer).to.be.empty;
                });

                it("disabled can be a function", async function () {
                    this.fixture.choices = [
                        {
                            name: "dis1",
                            disabled: stub().returns(true)
                        }
                    ];
                    this.checkbox = createCheckbox(this.fixture, { foo: "foo" });

                    const collector = getOutputCollector();
                    const promise = this.checkbox.run();
                    emitLines(1);
                    await promise;
                    collector.stop();
                    expect(this.fixture.choices[0].disabled).to.have.been.calledOnce;
                    expect(this.fixture.choices[0].disabled).to.have.been.calledWith({ foo: "foo" });
                    expect(collector.data()).to.include("- dis1 (Disabled)");
                });
            });
        });

        describe("confirm", () => {
            const createConfirm = (fixture) => new Terminal.Prompt.prompts.confirm(terminal, fixture);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.confirm);
                this.confirm = createConfirm(this.fixture);
            });

            it("should default to true", async function () {
                const collector = getOutputCollector();
                const promise = this.confirm.run();
                emitLines(1);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.true;
                expect(collector.data()).to.include("Y/n");
            });

            it("should allow a default `false` value", async function () {
                this.fixture.default = false;
                const falseConfirm = createConfirm(this.fixture);
                const collector = getOutputCollector();
                const promise = falseConfirm.run();
                collector.stop();
                emitLines(1);
                const answer = await promise;
                expect(collector.data()).to.include("y/N");
            });

            it("should allow a default `true` value", async function () {
                this.fixture.default = true;
                const falseConfirm = createConfirm(this.fixture);
                const collector = getOutputCollector();
                const promise = falseConfirm.run();
                emitLines(1);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.true;
                expect(collector.data()).to.include("Y/n");
            });

            it("should parse 'Y' value to boolean true", async function () {
                const promise = this.confirm.run();
                await emitLines(["Y"]);
                const answer = await promise;
                expect(answer).to.be.true;
            });

            it("should parse 'Yes' value to boolean true", async function () {
                const promise = this.confirm.run();
                emitLines(["Yes"]);
                const answer = await promise;
                expect(answer).to.be.true;
            });

            it("should parse 'No' value to boolean false", async function () {
                const promise = this.confirm.run();
                emitLines(["No"]);
                const answer = await promise;
                expect(answer).to.be.false;
            });

            it("should parse every other string value to boolean false", async function () {
                const promise = this.confirm.run();
                emitLines(["bla bla foo"]);
                const answer = await promise;
                expect(answer).to.be.false;
            });
        });

        describe("editor", () => {
            class EditorPrompt extends Terminal.Prompt.prompts.editor {
                async startExternalEditor() {
                    return "Hello world!";
                }
            }

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.editor);
            });

            it("should retrieve temporary files contents", async function () {
                const prompt = new EditorPrompt(terminal, this.fixture);
                const promise = prompt.run();
                emitLines(2);
                const answer = await promise;
                expect(answer).to.be.equal("Hello world!");
            });
        });

        describe("expand", () => {
            const createExpand = (fixture) => new Terminal.Prompt.prompts.expand(terminal, fixture);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.expand);
                this.expand = createExpand(this.fixture);
            });

            it("should throw if `key` is missing", function () {
                const mkPrompt = () => {
                    this.fixture.choices = ["a", "a"];
                    return createExpand(this.fixture);
                };

                expect(mkPrompt).to.throw(/Format error/);
            });

            it("should throw if `key` is duplicate", function () {
                const mkPrompt = () => {
                    this.fixture.choices = [
                        { key: "a", name: "foo" },
                        { key: "a", name: "foo" }
                    ];
                    return createExpand(this.fixture);
                };

                expect(mkPrompt).to.throw(/Duplicate key error/);
            });

            it("should throw if `key` is `h`", function () {
                const mkPrompt = () => {
                    this.fixture.choices = [
                        { key: "h", name: "foo" }
                    ];
                    return createExpand(this.fixture);
                };

                expect(mkPrompt).to.throw(/Reserved key error/);
            });

            it("should allow false as a value", async function () {
                const promise = this.expand.run();
                emitLines(["d"]);
                const answer = await promise;
                expect(answer).to.be.false;
            });

            it("pass the value as answer, and display short on the prompt", async function () {
                this.fixture.choices = [
                    { key: "a", name: "A Name", value: "a value", short: "ShortA" },
                    { key: "b", name: "B Name", value: "b value", short: "ShortB" }
                ];
                this.prompt = createExpand(this.fixture);
                const collector = getOutputCollector();
                const promise = this.prompt.run();
                emitLines(["b"]);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.equal("b value");
                expect(collector.data()).to.include("ShortB");
            });

            it("should use the `default` argument value", async function () {
                this.fixture.default = 1;
                this.expand = createExpand(this.fixture);
                const promise = this.expand.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should return the user input", async function () {
                const promise = this.expand.run();
                emitLines(["b"]);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should strip the user input", async function () {
                const promise = this.expand.run();
                emitLines([" b "]);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should have help option", async function () {
                const collector = getOutputCollector();
                const promise = this.expand.run();
                emitLines([
                    "h",
                    "c"
                ]);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.equal("chile");
                expect(collector.data()).to.include("a) acab").and.to.include("b) bar");
            });

            it("should not allow invalid command", async function () {
                const promise = this.expand.run();
                await emitLines(["blah"]);
                delay(10);
                await emitLines(["a"]);
                await promise;
            });

            it("should display and capitalize the default choice `key`", async function () {
                this.fixture.default = 1;
                this.expand = createExpand(this.fixture);
                const collector = getOutputCollector();
                this.expand.run();
                await delay(50);
                collector.stop();
                expect(collector.data()).to.include("(aBcdh)");
            });

            it("should display and capitalize the default choice H (Help) `key` if none provided", async function () {
                delete this.fixture.default;
                this.expand = createExpand(this.fixture);
                const collector = getOutputCollector();
                this.expand.run();
                await delay(50);
                collector.stop();
                expect(collector.data()).to.include("(abcdH)");
            });

            it("should 'autocomplete' the user input", async function () {
                this.expand = createExpand(this.fixture);
                const collector = getOutputCollector();
                this.expand.run();
                await emitKeypress("a");
                await delay(50);
                collector.stop();
                expect(collector.data()).to.include("acab");
            });
        });

        describe("input", () => {
            const createInput = (fixture) => new Terminal.Prompt.prompts.input(terminal, fixture);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.input);
            });

            it("should use raw value from the user", async function () {
                const input = createInput(this.fixture);
                const promise = input.run();
                emitLines(["Hello"]);
                const answer = await promise;
                expect(answer).to.be.equal("Hello");
            });

            it("should output filtered value", async function () {
                this.fixture.filter = function () {
                    return "pass";
                };

                const prompt = createInput(this.fixture);
                const collector = getOutputCollector();
                prompt.run();
                emitLines(1);
                await delay(50);
                collector.stop();
                expect(collector.data()).to.include("pass");
            });
        });

        describe("list", () => {
            const createList = (fixture) => new Terminal.Prompt.prompts.list(terminal, fixture);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.list);
                this.list = createList(this.fixture);
            });

            it("should default to first choice", async function () {
                const promise = this.list.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("foo");
            });

            it("should move selected cursor on keypress", async function () {
                const promise = this.list.run();
                emitKeypress("", { name: "down" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should allow for arrow navigation", async function () {
                const promise = this.list.run();
                emitKeypress("", { name: "down" });
                emitKeypress("", { name: "down" });
                emitKeypress("", { name: "up" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should allow for vi-style navigation", async function () {
                const promise = this.list.run();
                emitKeypress("j", { name: "j" });
                emitKeypress("j", { name: "j" });
                emitKeypress("k", { name: "k" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should allow for emacs-style navigation", async function () {
                const promise = this.list.run();
                emitKeypress("n", { name: "n", ctrl: true });
                emitKeypress("n", { name: "n", ctrl: true });
                emitKeypress("p", { name: "p", ctrl: true });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should loop the choices when going out of boundaries", async function () {
                const promise1 = this.list.run().then((answer) => {
                    expect(answer).to.equal("bar");
                });

                emitKeypress("", { name: "up" });
                emitKeypress("", { name: "up" });
                emitLines(1);
                await promise1;
                this.list.selected = 0; // reset
                const promise2 = this.list.run();
                emitKeypress("", { name: "down" });
                emitKeypress("", { name: "down" });
                emitKeypress("", { name: "down" });
                emitLines(1);
                const answer = await promise2;
                expect(answer).to.be.equal("foo");
            });

            it("should require a choices array", () => {
                const mkPrompt = () => {
                    return createList({ name: "foo", message: "bar" });
                };
                expect(mkPrompt).to.throw(/choices/);
            });

            it("should allow a numeric default", async function () {
                this.fixture.default = 1;
                const list = createList(this.fixture);
                const promise = list.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should work from a numeric default being the index", async function () {
                this.fixture.default = 1;
                const list = createList(this.fixture);
                const promise = list.run();
                emitKeypress("", { name: "down" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bum");
            });

            it("should allow a string default being the value", async function () {
                this.fixture.default = "bar";
                const list = createList(this.fixture);
                const promise = list.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should work from a string default", async function () {
                this.fixture.default = "bar";
                const list = createList(this.fixture);
                const promise = list.run();
                emitKeypress("", { name: "down" });
                emitLines(1);
                const answer = await promise;
                expect(answer).to.equal("bum");
            });

            it("shouldn't allow an invalid index as default", async function () {
                this.fixture.default = 4;
                const list = createList(this.fixture);
                const promise = list.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("foo");
            });

            it("should allow 1-9 shortcut key", async function () {
                const promise = this.list.run();
                emitKeypress("2");
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });
        });

        describe("password", () => {
            const createPassword = (fixture) => new Terminal.Prompt.prompts.password(terminal, fixture);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.password);
            });

            it("should use raw value from the user without masking", async function () {
                const password = createPassword(this.fixture);
                const collector = getOutputCollector();
                const promise = password.run();
                emitLines(["Hello"]);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.equal("Hello");
                expect(collector.data()).not.to.contain("*");
            });

            it('should mask the input with "*" if the `mask` option was provided by the user was `true`', async function () {
                this.fixture.mask = true;
                const password = createPassword(this.fixture);
                const collector = getOutputCollector();
                const promise = password.run();
                emitLines(["Hello"]);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.equal("Hello");
                expect(collector.data()).to.include("*****").not.to.include("Hello");
            });

            it("should mask the input if a `mask` string was provided by the user", async function () {
                this.fixture.mask = "#";
                const password = createPassword(this.fixture);
                const collector = getOutputCollector();
                const promise = password.run();
                emitLines(["Hello"]);
                const answer = await promise;
                collector.stop();
                expect(answer).to.be.equal("Hello");
                expect(collector.data()).to.include("#####").not.to.include("Hello");
            });
        });

        describe("rawlist", () => {
            const createRawlist = (fixture) => new Terminal.Prompt.prompts.rawlist(terminal, fixture);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.rawlist);
                this.rawlist = createRawlist(this.fixture);
            });

            it("should default to first choice", async function () {
                const promise = this.rawlist.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("foo");
            });

            it("should select given index", async function () {
                const promise = this.rawlist.run();
                emitLines(["2"]);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("should not allow invalid index", async function () {
                const promise = this.rawlist.run();
                await emitLines(["blah"]);
                await delay(10);
                await emitLines(["1"]);
                const answer = await promise;
                expect(answer).to.be.equal("foo");
            });

            it("should require a choices array", () => {
                const mkPrompt = () => {
                    return createRawlist({ name: "foo", message: "bar" });
                };
                expect(mkPrompt).to.throw(/choices/);
            });

            it("should allow a default index", async function () {
                this.fixture.default = 1;
                const list = createRawlist(this.fixture);
                const promise = list.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("bar");
            });

            it("shouldn't allow an invalid index as default", async function () {
                this.fixture.default = 4;
                const list = createRawlist(this.fixture);
                const promise = list.run();
                emitLines(1);
                const answer = await promise;
                expect(answer).to.be.equal("foo");
            });
        });

        describe("autocomplete", () => {
            const createAutocomplete = (fixture) => new Terminal.Prompt.prompts.autocomplete(terminal, fixture);

            const runAutocomplete = async (prompt) => {
                const promise = prompt.run();
                await delay(10); // output choices
                return promise;
            };

            const waitForChoices = () => delay(20);

            beforeEach(function () {
                this.fixture = adone.util.clone(fixtures.autocomplete);
                this.prompt = createAutocomplete(this.fixture);
            });

            describe("suggestOnly = true", () => {
                beforeEach(function () {
                    this.fixture.suggestOnly = true;
                    this.prompt = createAutocomplete(this.fixture);
                });

                it("applies filter", async function () {
                    this.fixture.filter = (val) => val.slice(0, 2);
                    this.prompt = createAutocomplete(this.fixture);
                    const promise = runAutocomplete(this.prompt);
                    emitLines(["banana"]);
                    const answer = await promise;
                    expect(answer).to.be.equal("ba");
                });

                it("applies filter async with promise", async function () {
                    this.fixture.filter = async (val) => val.slice(0, 2);
                    this.prompt = createAutocomplete(this.fixture);
                    const promise = this.prompt.run();
                    emitLines(["banana"]);
                    const answer = await promise;
                    expect(answer).to.be.equal("ba");
                });

                describe("when tab pressed", () => {
                    it("autocompletes the value selected in the list", async function () {
                        const promise = this.prompt.run();
                        await waitForChoices();
                        emitTab();
                        emitLines(1);
                        const answer = await promise;
                        expect(answer).to.be.equal("foo");
                    });

                    it("accepts any input", async function () {
                        const promise = this.prompt.run();
                        emitLines(["banana"]);
                        const answer = await promise;
                        expect(answer).to.be.equal("banana");
                    });

                });
            });

            describe("suggestOnly = false", () => {
                beforeEach(function () {
                    this.fixture.suggestOnly = false;
                    this.prompt = createAutocomplete(this.fixture);
                });

                it("applies filter", async function () {
                    this.fixture.filter = (val) => val.slice(0, 2);
                    this.prompt = createAutocomplete(this.fixture);
                    const promise = this.prompt.run();
                    await waitForChoices();
                    await emitDown();
                    await emitEnter();
                    const answer = await promise;
                    expect(answer).to.be.equal("ba");
                });

                it("applies filter async with promise", async function () {
                    this.fixture.filter = async (val) => val.slice(0, 2);
                    this.prompt = createAutocomplete(this.fixture);
                    const promise = this.prompt.run();
                    await waitForChoices();
                    await emitDown();
                    await emitEnter();
                    const answer = await promise;
                    expect(answer).to.be.equal("ba");
                });

                it("requires a name", () => {
                    expect(() => {
                        createAutocomplete({
                            message: "foo",
                            source: async () => []
                        });
                    }).to.throw(/name/);
                });

                it("requires a message", () => {
                    expect(() => {
                        createAutocomplete({
                            name: "foo",
                            source: async () => []
                        });
                    }).to.throw(/message/);
                });

                it("requires a source parameter", () => {
                    expect(() => {
                        createAutocomplete({
                            name: "foo",
                            message: "foo"
                        });
                    }).to.throw(/source/);
                });

                it("immediately calls source with null", async function () {
                    this.fixture.source = stub().returns(Promise.resolve(["foo"]));
                    this.prompt = createAutocomplete(this.fixture);
                    this.prompt.run();
                    await waitForChoices();
                    expect(this.fixture.source).to.have.been.calledOnce;
                    expect(this.fixture.source).to.have.been.calledWithExactly(undefined, null);
                });

                describe("when it has some results", () => {
                    it("should move selected cursor on keypress", async function () {
                        const promise = this.prompt.run();
                        await waitForChoices();
                        emitDown();
                        emitEnter();
                        const answer = await promise;
                        expect(answer).to.be.equal("bar");
                    });

                    it("moves up and down", async function () {
                        const promise = this.prompt.run();
                        await waitForChoices();
                        emitDown();
                        emitDown();
                        emitUp();
                        emitEnter();
                        const answer = await promise;
                        expect(answer).to.be.equal("bar");
                    });

                    it("loops choices going down", async function () {
                        const promise = this.prompt.run();
                        await waitForChoices();
                        emitDown();
                        emitDown();
                        emitDown();
                        emitEnter();
                        const answer = await promise;
                        expect(answer).to.be.equal("foo");
                    });

                    it("loops choices going up", async function () {
                        const promise = this.prompt.run();
                        await waitForChoices();
                        emitUp();
                        emitEnter();
                        const answer = await promise;
                        expect(answer).to.be.equal("bum");
                    });
                });


                describe("searching", () => {
                    let source;

                    beforeEach(function () {
                        source = this.fixture.source = stub().returns(["foo", "bar"]);
                        this.prompt = createAutocomplete(this.fixture);
                    });

                    it("searches after each char when user types", async function () {
                        this.prompt.run();
                        await waitForChoices();
                        expect(source).to.have.been.called.calledWithExactly(undefined, null);
                        await emitChars("a");
                        expect(source).to.have.been.called.calledWithExactly(undefined, "a");
                        await emitChars("bba");
                        expect(source).to.have.been.called.calledWithExactly(undefined, "ab");
                        expect(source).to.have.been.called.calledWithExactly(undefined, "abb");
                        expect(source).to.have.been.called.calledWithExactly(undefined, "abba");
                        expect(source).to.have.callCount(5);
                    });

                    it("does not search again if same searchterm (not input added)", async function () {
                        this.prompt.run();
                        await waitForChoices();
                        await emitChars("ice");
                        expect(source).to.have.callCount(4); // null + i + c + e
                        emitNonChar();
                        expect(source).to.have.callCount(4);
                    });
                });

                describe("submit", () => {
                    let source;

                    describe("without choices", () => {
                        beforeEach(function () {
                            source = this.fixture.source = stub().returns([]);
                            this.prompt = createAutocomplete(this.fixture);
                        });

                        it("searches again, since not possible to select something that does not exist", async function () {
                            this.prompt.run();
                            await waitForChoices;
                            expect(source).to.have.been.calledOnce;
                            await emitEnter();
                            expect(source).to.have.been.calledTwice;
                        });
                    });

                    describe("with suggestOnly", () => {
                        const answerValue = {};

                        beforeEach(function () {
                            this.fixture.suggestOnly = true;
                            source = this.fixture.source = stub().returns([{
                                name: "foo",
                                value: answerValue,
                                short: "short"
                            }]);
                            this.prompt = createAutocomplete(this.fixture);
                        });

                        it("selects the actual value typed", async function () {
                            const promise = this.prompt.run();
                            await emitChars("foo2");
                            await emitEnter();
                            const answer = await promise;
                            expect(answer).to.be.equal("foo2");
                        });
                    });

                    describe("with choices", () => {
                        let source;
                        const answerValue = {};

                        beforeEach(function () {
                            source = this.fixture.source = stub().returns([{
                                name: "foo",
                                value: answerValue,
                                short: "short"
                            }]);
                            this.prompt = createAutocomplete(this.fixture);
                        });

                        it("stores the value as the answer and status to answered", async function () {
                            const promise = this.prompt.run();
                            await waitForChoices();
                            await emitEnter();
                            const answer = await promise;
                            expect(answer).to.be.equal(answerValue);
                            expect(this.prompt.answer).to.be.equal(answerValue);
                            expect(this.prompt.shortAnswer).to.be.equal("short");
                            expect(this.prompt.answerName).to.be.equal("foo");
                            expect(this.prompt.status).to.be.equal("answered");
                        });

                        describe("after selecting", () => {
                            beforeEach(async function () {
                                this.prompt.run();
                                await waitForChoices();
                                await emitEnter();
                                source.reset();
                            });

                            it("stops searching on typing", async () => {
                                await emitChars("test");
                                expect(source).to.have.not.been.called;
                            });

                            it("does not change answer on enter", async function () {
                                await emitEnter();
                                expect(source).to.have.not.been.called;
                                expect(this.prompt.answer).to.be.equal(answerValue);
                                expect(this.prompt.status).to.be.equal("answered");
                            });
                        });
                    });

                });

            });
        });
    });

    describe("objects", () => {
        describe("Choice", () => {
            const { Choices: { Choice }, Separator } = Terminal;

            it("should normalize accept String as value", () => {
                const choice = new Choice("foo");
                expect(choice.name).to.equal("foo");
                expect(choice.value).to.equal("foo");
            });

            it("should use value|name as default if default property is missing", () => {
                const onlyName = new Choice({ name: "foo" });
                const onlyVal = new Choice({ value: "bar" });

                expect(onlyName.name).to.equal("foo");
                expect(onlyName.value).to.equal("foo");
                expect(onlyName.short).to.equal("foo");
                expect(onlyVal.name).to.equal("bar");
                expect(onlyVal.value).to.equal("bar");
                expect(onlyVal.short).to.equal("bar");
            });

            it("should keep extra keys", () => {
                const choice = new Choice({ name: "foo", extra: "1" });

                expect(choice.extra).to.equal("1");
                expect(choice.name).to.equal("foo");
                expect(choice.value).to.equal("foo");
            });

            it("shouldn't process Separator object", () => {
                const sep = new Choice(new Separator(terminal));
                expect(sep).to.be.instanceOf(Separator);
            });

            it("shouldn't process object with property type=separator", () => {
                const obj = { type: "separator" };
                const sep = new Choice(obj);
                expect(sep).to.equal(obj);
            });
        });

        describe("Choices", () => {
            const { Choices, Separator } = Terminal;
            const { Choice } = Choices;

            it("should create Choice object from array member", () => {
                const choices = new Choices(terminal, ["bar", { name: "foo" }]);
                expect(choices.getChoice(0)).to.be.instanceOf(Choice);
                expect(choices.getChoice(1)).to.be.instanceOf(Choice);
            });

            it("should not process Separator object", () => {
                const sep = new Separator(terminal);
                const choices = new Choices(terminal, ["Bar", sep]);
                expect(choices.get(0).name).to.equal("Bar");
                expect(choices.get(1)).to.equal(sep);
            });

            it("should provide access to length information", () => {
                const choices = new Choices(terminal, ["Bar", new Separator(terminal), "foo"]);
                expect(choices.length).to.equal(3);
                expect(choices.realLength).to.equal(2);

                choices.length = 1;
                expect(choices.length).to.equal(1);
                expect(choices.get(1)).to.not.exist;
                expect(() => {
                    choices.realLength = 0;
                }).to.throw;
            });

            it("should allow plucking choice content", () => {
                const choices = new Choices(terminal, [{ name: "n", key: "foo" }, { name: "a", key: "lab" }]);
                expect(choices.pluck("key")).to.eql(["foo", "lab"]);
            });

            it("should allow filtering value with where", () => {
                const choices = new Choices(terminal, [{ name: "n", key: "foo" }, { name: "a", key: "lab" }]);
                expect(choices.where({ key: "lab" })).to.eql([{
                    name: "a",
                    value: "a",
                    short: "a",
                    key: "lab",
                    disabled: undefined
                }]);
            });

            it("should façade forEach", () => {
                const raw = ["a", "b", "c"];
                const choices = new Choices(terminal, raw);
                choices.forEach((val, i) => {
                    expect(val.name).to.equal(raw[i]);
                });
            });

            it("should façade filter", () => {
                const choices = new Choices(terminal, ["a", "b", "c"]);
                const filtered = choices.filter((val) => {
                    return val.name === "a";
                });
                expect(filtered.length).to.equal(1);
                expect(filtered[0].name).to.equal("a");
            });

            it("should façade push and update the realChoices internally", () => {
                const choices = new Choices(terminal, ["a"]);
                choices.push("b", new Separator(terminal));
                expect(choices.length).to.equal(3);
                expect(choices.realLength).to.equal(2);
                expect(choices.getChoice(1)).to.be.instanceOf(Choice);
                expect(choices.get(2)).to.be.instanceOf(Separator);
            });
        });

        describe("Separator", () => {
            const { Separator } = Terminal;

            const { stripEscapeCodes } = adone.text.ansi;

            it("should set a default", () => {
                const sep = new Separator(terminal);
                expect(stripEscapeCodes(sep.toString())).to.equal("──────────────");
            });

            it("should set user input as separator", () => {
                const sep = new Separator(terminal, "foo bar");
                expect(stripEscapeCodes(sep.toString())).to.equal("foo bar");
            });

            it("instances should be stringified when appended to a string", () => {
                const sep = new Separator(terminal, "foo bar");
                expect(stripEscapeCodes(String(sep))).to.equal("foo bar");
            });

            it("should expose a helper function to check for separator", () => {
                expect(Separator.exclude({})).to.be.true;
                expect(Separator.exclude(new Separator(terminal))).to.be.false;
            });

            it("give the type 'separator' to its object", () => {
                const sep = new Separator(terminal);
                expect(sep.type).to.equal("separator");
            });
        });
    });
});
