import "./bootstrap";

const {
    is,
    assertion
} = adone;
const { expect, AssertionError } = assertion;

describe("assertion", "globalErr", () => {
    const noop = function () { };
    
    it("should pass if string val equals error message", () => {
        err(() => {
            expect("cat").to.equal("dog");
        }, "expected 'cat' to equal 'dog'");
    });

    it("should pass if regex val matches error message", () => {
        err(() => {
            expect("cat").to.equal("dog");
        }, /expected 'cat' to equal 'dog'/);
    });

    it("should pass if object val's props are included in error object", () => {
        err(() => {
            expect("cat").to.equal("dog");
        }, {
                message: "expected 'cat' to equal 'dog'",
                expected: "dog",
                actual: "cat"
            });

        err(() => {
            expect({ cat: "meow" }).to.equal({ dog: "woof" });
        }, {
                message: "expected { cat: 'meow' } to equal { dog: 'woof' }",
                expected: { dog: "woof" },
                actual: { cat: "meow" }
            });
    });

    it("should throw if string val does not equal error message", () => {
        err(() => {
            err(() => {
                throw new AssertionError("cat");
            }, "dog");
        }, {
                message: "expected 'cat' to equal 'dog'",
                expected: "dog",
                actual: "cat"
            });
    });

    it("should throw if regex val does not match error message", () => {
        err(() => {
            err(() => {
                throw new AssertionError("cat");
            }, /dog/);
        }, "expected 'cat' to match /dog/");
    });

    it.skip("should throw if object val's props are not included in error object", () => {
        err(() => {
            err(() => {
                throw new AssertionError("cat");
            }, { text: "cat" });
        }, /expected { Object \(message, showDiff(, \.\.\.)*\) } to have property \'text\'/);

        err(() => {
            err(() => {
                throw new AssertionError("cat");
            }, { message: "dog" });
        }, "expected 'cat' to deeply equal 'dog'", true);
    });

    it("should throw if fn does not throw", () => {
        err(() => {
            err(noop);
        }, "Expected an error");
    });

    it("should throw if fn is invalid", () => {
        const vals = [
            "cat",
            42,
            [],
            new RegExp(),
            new Date(),
            null,
            undefined
        ];

        if (is.function(Symbol)) {
            vals.push(Symbol());
        }
        if (is.function(Map)) {
            vals.push(new Map());
        }
        if (is.function(WeakMap)) {
            vals.push(new WeakMap());
        }
        if (is.function(Set)) {
            vals.push(new Set());
        }
        if (is.function(WeakSet)) {
            vals.push(new WeakSet());
        }
        if (is.function(Promise)) {
            vals.push(new Promise(noop));
        }

        vals.forEach((val) => {
            err(() => {
                err(val);
            }, "Invalid fn");
        });
    });

    it("should throw if val is invalid", () => {
        const vals = [
            42,
            [],
            new Date(),
            noop,
            null
        ];

        if (is.function(Symbol)) {
            vals.push(Symbol());
        }
        if (is.function(Map)) {
            vals.push(new Map());
        }
        if (is.function(WeakMap)) {
            vals.push(new WeakMap());
        }
        if (is.function(Set)) {
            vals.push(new Set());
        }
        if (is.function(WeakSet)) {
            vals.push(new WeakSet());
        }
        if (is.function(Promise)) {
            vals.push(new Promise(noop));
        }

        vals.forEach((val) => {
            err(() => {
                err(() => {
                    throw new AssertionError("Test error");
                }, val);
            }, "Invalid val");
        });
    });

    describe("skipStackTest", () => {
        // Skip tests if `Error.captureStackTrace` is unsupported
        if (is.undefined(Error.captureStackTrace)) {
            return;
        }

        try {
            throw Error();
        } catch (err) {
            // Skip tests if `err.stack` is unsupported
            if (is.undefined(err.stack)) {
                return;
            }
        }

        // Note: `.to.not.throw` isn't used for the assertions that aren't expected
        // to throw an error because it'll pollute the very same stack trace which
        // is being asserted on. Instead, if `err` throws an error, then Mocha will
        // use that error as the reason the test failed.
        describe("falsey", () => {
            it('should throw if "Getter" is in the stack trace', () => {
                err(() => {
                    err(function fakeGetter() {
                        throw Error("my stack trace contains a fake implementation frame");
                    });
                }, /implementation frames not properly filtered from stack trace/, true);
            });

            it('should throw if "Wrapper" is in the stack trace', () => {
                err(() => {
                    err(function fakeWrapper() {
                        throw Error("my stack trace contains a fake implementation frame");
                    });
                }, /implementation frames not properly filtered from stack trace/, true);
            });

            it('should throw if "assert" is in the stack trace', () => {
                err(() => {
                    err(function assertFake() {
                        throw Error("my stack trace contains a fake implementation frame");
                    });
                }, /implementation frames not properly filtered from stack trace/, true);
            });

            it('shouldn\'t throw if "Getter", "Wrapper", "assert" aren\'t in the stack trace', () => {
                err(function safeFnName() {
                    throw Error("my stack trace doesn't contain implementation frames");
                });
            });
        });

        describe("truthy", () => {
            it('shouldn\'t throw if "Getter" is in the stack trace', () => {
                err(function fakeGetter() {
                    throw Error("my stack trace contains a fake implementation frame");
                }, undefined, true);
            });

            it('shouldn\'t throw if "Wrapper" is in the stack trace', () => {
                err(function fakeWrapper() {
                    throw Error("my stack trace contains a fake implementation frame");
                }, undefined, true);
            });

            it('shouldn\'t throw if "assert" is in the stack trace', () => {
                err(function assertFake() {
                    throw Error("my stack trace contains a fake implementation frame");
                }, undefined, true);
            });

            it('shouldn\'t throw if "Getter", "Wrapper", "assert" aren\'t in the stack trace', () => {
                err(function safeFnName() {
                    throw Error("my stack trace doesn't contain implementation frames");
                }, undefined, true);
            });
        });
    });
});
