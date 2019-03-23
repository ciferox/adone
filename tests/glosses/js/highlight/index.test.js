const {
    cli: { chalk, stats },
    js: { highlight },
    text: { stripAnsi }
} = adone;

describe("js", "highlight", () => {
    const stubColorSupport = function (supported) {
        let originalSupportsColor;
        beforeEach(() => {
            originalSupportsColor = chalk.supportsColor;
            stats.stdout = supported;
        });

        afterEach(() => {
            stats.stdout = originalSupportsColor;
        });
    };

    describe("highlight", () => {
        describe("when colors are supported", () => {
            stubColorSupport(true);

            it("highlights code", () => {
                const code = "console.log('hi')";
                const result = highlight(code);
                const stripped = stripAnsi(result);
                expect(result.length).to.be.greaterThan(stripped.length);
                expect(stripped).to.be.equal(code);
            });
        });

        describe("when colors are not supported", () => {
            stubColorSupport(false);

            it("does not attempt to highlight code", () => {
                const code = "console.log('hi')";
                const result = highlight(code);
                const stripped = stripAnsi(result);
                expect(result.length).to.be.equal(stripped.length);
                expect(result).to.be.equal(code);
            });

            describe("and the forceColor option is passed", () => {
                it("highlights the code anyway", () => {
                    const code = "console.log('hi')";
                    const result = highlight(code, { forceColor: true });
                    const stripped = stripAnsi(result);
                    expect(result.length).to.be.greaterThan(stripped.length);
                    expect(stripped).to.be.equal(code);
                });
            });
        });
    });

    describe("shouldHighlight", () => {
        describe("when colors are supported", () => {
            stubColorSupport(true);

            it("returns true", () => {
                expect(highlight.shouldHighlight({})).to.be.ok;
            });
        });

        describe("when colors are not supported", () => {
            stubColorSupport(false);

            it("returns false", () => {
                assert.notOk(highlight.shouldHighlight({}));
            });

            describe("and the forceColor option is passed", () => {
                it("returns true", () => {
                    expect(highlight.shouldHighlight({ forceColor: true })).to.be.ok;
                });
            });
        });
    });

    describe("getChalk", () => {
        describe("when colors are supported", () => {
            stubColorSupport(true);

            describe("when forceColor is not passed", () => {
                it("returns a Chalk instance", () => {
                    expect(highlight.getChalk({}).constructor).to.be.equal(chalk.constructor);
                });
            });

            describe("when forceColor is passed", () => {
                it("returns a Chalk instance", () => {
                    expect(highlight.getChalk({ forceColor: true }).Instance).to.eql(
                        chalk.Instance,
                    );
                });
            });
        });

        describe("when colors are supported", () => {
            stubColorSupport(true);

            describe("when forceColor is not passed", () => {
                it("returns a Chalk instance", () => {
                    expect(highlight.getChalk({}).Instance).to.eql(chalk.Instance);
                });
            });

            describe("when forceColor is passed", () => {
                it("returns a Chalk instance", () => {
                    expect(highlight.getChalk({ forceColor: true }).Instance).to.eql(
                        chalk.Instance,
                    );
                });
            });
        });
    });
});
