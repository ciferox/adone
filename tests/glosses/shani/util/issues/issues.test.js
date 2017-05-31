describe("shani", "util", "issues", () => {
    const { sandbox, stub, spy, match, assert: sassert } = adone.shani.util;

    beforeEach(function () {
        this.sandbox = sandbox.create();
    });

    afterEach(function () {
        this.sandbox.restore();
    });

    describe("#458", () => {
        if (typeof require("fs").readFileSync !== "undefined") {
            describe("on node", () => {
                it("stub out fs.readFileSync", function () {
                    const fs = require("fs");
                    const testCase = this;

                    assert.doesNotThrow(() => {
                        testCase.sandbox.stub(fs, "readFileSync");
                    });
                });
            });
        }
    });

    describe("#852 - createStubInstance on intherited constructors", () => {
        it("must not throw error", () => {
            const A = function () { };
            const B = function () { };

            B.prototype = Object.create(A.prototype);
            B.prototype.constructor = A;

            assert.doesNotThrow(() => {
                stub.createStubInstance(B);
            });
        });
    });

    describe("#852(2) - createStubInstance should on same constructor", () => {
        it("must be idempotent", () => {
            const A = function () { };
            assert.doesNotThrow(() => {
                stub.createStubInstance(A);
                stub.createStubInstance(A);
            });
        });
    });

    describe("#950 - first execution of a spy as a method renames that spy", () => {
        function bob() { }

        it("should not rename spies", () => {
            const expectedName = "proxy";
            const s = spy(bob);

            assert.equal(s.name, expectedName);

            const obj = { methodName: s };
            assert.equal(s.name, expectedName);

            s();
            assert.equal(s.name, expectedName);

            obj.methodName.call(null);
            assert.equal(s.name, expectedName);

            obj.methodName();
            assert.equal(s.name, expectedName);

            obj.otherProp = s;
            obj.otherProp();
            assert.equal(s.name, expectedName);
        });
    });

    describe("#1026", () => {
        it("should stub `watch` method on any Object", () => {
            // makes sure that Object.prototype.watch is set back to its old value
            function restore(oldWatch) {
                if (oldWatch) {
                    Object.prototype.watch = oldWatch;  // eslint-disable-line no-extend-native
                } else {
                    delete Object.prototype.watch;
                }
            }

            try { // eslint-disable-line no-restricted-syntax
                var oldWatch = Object.prototype.watch;

                if (typeof Object.prototype.watch !== "function") {
                    Object.prototype.watch = function rolex() { }; // eslint-disable-line no-extend-native
                }

                const stubbedObject = stub({
                    watch() { }
                });

                stubbedObject.watch();

                assert.isArray(stubbedObject.watch.args);
            } catch (error) {
                restore(oldWatch);
                throw error;
            }

            restore(oldWatch);
        });
    });

    describe("#1154", () => {
        it("Ensures different matchers will not be tested against each other", () => {
            const readFile = stub();

            function endsWith(str, suffix) {
                return str.indexOf(suffix) + suffix.length === str.length;
            }

            function suffixA(fileName) {
                return endsWith(fileName, "suffixa");
            }

            function suffixB(fileName) {
                return endsWith(fileName, "suffixb");
            }

            const argsA = match(suffixA);
            const argsB = match(suffixB);

            const firstFake = readFile
                .withArgs(argsA);

            const secondFake = readFile
                .withArgs(argsB);

            assert(firstFake !== secondFake);
        });
    });

    describe("#1398", () => {
        it("Call order takes into account both calledBefore and callCount", () => {
            const s1 = spy();
            const s2 = spy();

            s1();
            s2();
            s1();

            assert.throws(() => {
                sassert.callOrder(s2, s1, s2);
            });
        });
    });
});
