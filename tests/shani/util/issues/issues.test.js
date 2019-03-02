describe("shani", "util", "issues", () => {
    const { is } = adone;
    const { sandbox, stub, spy, match, assert: sassert } = adone.shani.util;

    beforeEach(function () {
        this.sandbox = sandbox.create();
    });

    afterEach(function () {
        this.sandbox.restore();
    });

    describe("#458", () => {
        if (!is.undefined(require("fs").readFileSync)) {
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
                    Object.prototype.watch = oldWatch; // eslint-disable-line no-extend-native
                } else {
                    delete Object.prototype.watch;
                }
            }

            try { // eslint-disable-line no-restricted-syntax
                var oldWatch = Object.prototype.watch;

                if (!is.function(Object.prototype.watch)) {
                    Object.prototype.watch = function rolex() { }; // eslint-disable-line no-extend-native
                }

                const stubbedObject = stub({
                    watch() { }
                });

                stubbedObject.watch();

                assert.array(stubbedObject.watch.args);
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

    describe("#1372 - sandbox.resetHistory", () => {
        it("should reset spies", function () {
            const spy = this.sandbox.spy();

            spy();
            assert.equal(spy.callCount, 1);

            spy();
            assert.equal(spy.callCount, 2);

            this.sandbox.resetHistory();

            spy();
            assert.equal(spy.callCount, 1); // should not fail but fails
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

    describe("#1474 - promise library should be propagated through fakes and behaviors", () => {
        let s;

        const makeAssertions = (fake, expected) => {
            assert.isFunction(fake.then);
            assert.isFunction(fake.tap);

            assert.equal(fake.tap(), expected);
        };

        beforeEach(() => {
            const promiseLib = {
                resolve(value) {
                    const promise = Promise.resolve(value);
                    promise.tap = function () {
                        return `tap ${value}`;
                    };

                    return promise;
                }
            };

            s = stub().usingPromise(promiseLib);

            s.resolves("resolved");
        });

        it("stub.onCall", () => {
            s.onSecondCall().resolves("resolved again");

            makeAssertions(s(), "tap resolved");
            makeAssertions(s(), "tap resolved again");
        });

        it("stub.withArgs", () => {
            s.withArgs(42).resolves("resolved again");
            s.withArgs(true).resolves("okay");

            makeAssertions(s(), "tap resolved");
            makeAssertions(s(42), "tap resolved again");
            makeAssertions(s(true), "tap okay");
        });
    });

    describe("#1487 - withArgs() returnValue", () => {
        beforeEach(function () {
            this.stub = stub().throws("Nothing set");
            this.stub.withArgs("arg").returns("return value");
            this.stub("arg");
        });

        it("sets correct firstCall.returnValue", function () {
            assert.equal(this.stub.withArgs("arg").firstCall.returnValue, "return value");
        });

        it("sets correct lastCall.returnValue", function () {
            assert.equal(this.stub.withArgs("arg").lastCall.returnValue, "return value");
        });
    });

    describe("#1512 - sandbox.stub(obj,protoMethod)", () => {
        let s;

        beforeEach(() => {
            s = sandbox.create();
        });

        afterEach(() => {
            s.restore();
        });

        it("can stub methods on the prototype", () => {
            const proto = { someFunction() { } };
            const instance = Object.create(proto);

            const stub = s.stub(instance, "someFunction");
            instance.someFunction();
            assert(stub.called);
        });
    });

    describe("#1521 - stubbing Array.prototype.filter", () => {
        let orgFilter;

        before(() => {
            orgFilter = Array.prototype.filter;
        });

        afterEach(() => {
            /**
             * eslint-disable no-extend-native
             */
            Array.prototype.filter = orgFilter;
        });

        it("should be possible stub filter", () => {
            const s = stub(Array.prototype, "filter");
            [1, 2, 3].filter(() => {
                return false;
            });
            assert(s.calledOnce);
        });

    });

    describe("#1442 - callThrough with a mock expectation", () => {
        it("should call original method", function () {
            const foo = {
                bar() { }
            };

            const mock = this.sandbox.mock(foo);
            mock.expects("bar").callThrough();

            foo.bar();

            mock.verify();
        });
    });

    describe("#1648 - resetHistory ", () => {
        it("should reset property spies", () => {
            const obj = {
                func() {},
                get prop() {
                    return 1;
                }
            };

            const s = sandbox.create();
            const spyFunc = s.spy(obj, "func");
            const spyProp = s.spy(obj, "prop", ["get"]);

            assert.isFalse(spyFunc.called);
            assert.isFalse(spyProp.get.called);

            obj.func();
            //eslint-disable-next-line no-unused-expressions
            obj.prop;

            assert.isTrue(spyFunc.called);
            assert.isTrue(spyProp.get.called);

            s.resetHistory();

            assert.isFalse(spyFunc.called);
            assert.isFalse(spyProp.get.called);
        });
    });
});
