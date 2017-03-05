/* global it describe beforeEach assert */

import $collection from "adone/glosses/shani/mock/collection";
import $spy from "adone/glosses/shani/mock/spy";
import $stub from "adone/glosses/shani/mock/stub";
import createInstance from "adone/glosses/shani/mock/util/create";

describe("collection", function () {
    it("creates fake collection", function () {
        const collection = createInstance($collection);

        assert.isFunction(collection.verify);
        assert.isFunction(collection.restore);
        assert.isFunction(collection.verifyAndRestore);
        assert.isFunction(collection.stub);
        assert.isFunction(collection.mock);
    });

    let collection;

    describe(".stub", function () {
        beforeEach(function () {
            collection = createInstance($collection);
        });

        it("fails if stubbing property on null", function () {
            let error;

            try {
                collection.stub(null, "prop");
            } catch (e) {
                error = e;
            }

            assert.equal(error.message, "Trying to stub property 'prop' of null");
        });

        it("fails if stubbing symbol on null", function () {
            if (typeof Symbol === "function") {
                let error;

                try {
                    collection.stub(null, Symbol());
                } catch (e) {
                    error = e;
                }
                assert.equal(error.message, "Trying to stub property 'Symbol()' of null");
            }
        });

        it("creates a stub", function () {
            const object = { method() {} };

            collection.stub(object, "method");

            assert.equal(typeof object.method.restore, "function");
        });

        it("adds stub to fake array", function () {
            const object = { method() {} };

            collection.stub(object, "method");
            assert.deepEqual(collection.fakes, [object.method]);
        });

        it("appends stubs to fake array", function () {
            collection.stub({ method() {} }, "method");
            collection.stub({ method() {} }, "method");

            assert.equal(collection.fakes.length, 2);
        });

        it("adds all object methods to fake array", function () {
            const object = {
                method() {},
                method2() {},
                method3() {}
            };

            Object.defineProperty(object, "method3", {
                enumerable: false
            });

            collection.stub(object);

            assert.include(collection.fakes, object.method);
            assert.include(collection.fakes, object.method2);
            assert.include(collection.fakes, object.method3);
            assert.equal(collection.fakes.length, 3);
        });

        it("returns a stubbed object", function () {
            const object = { method() {} };
            assert.equal(collection.stub(object), object);
        });

        it("returns a stubbed method", function () {
            const object = { method() {} };
            assert.equal(collection.stub(object, "method"), object.method);
        });

        if (typeof process !== "undefined") {
            describe("on node", function () {
                beforeEach(function () {
                    process.env.HELL = "Ain't too bad";
                });

                it("stubs environment property", function () {
                    collection.stub(process.env, "HELL", "froze over");
                    assert.equal(process.env.HELL, "froze over");
                });
            });
        }
    });

    describe("stub anything", function () {
        let object;
        beforeEach(function () {
            object = { property: 42 };
            collection = createInstance($collection);
        });

        it("stubs number property", function () {
            collection.stub(object, "property", 1);

            assert.equal(object.property, 1);
        });

        it("restores number property", function () {
            collection.stub(object, "property", 1);
            collection.restore();

            assert.equal(object.property, 42);
        });

        it("fails if property does not exist", function () {
            const object = {};

            assert.throw(function () {
                collection.stub(object, "prop", 1);
            });
        });

        it("fails if Symbol does not exist", function () {
            if (typeof Symbol === "function") {
                const object = {};

                assert.throw(function () {
                    collection.stub(object, Symbol(), 1);
                }, "Cannot stub non-existent own property Symbol()");
            }
        });
    });

    describe(".mock", function () {
        beforeEach(function () {
            collection = createInstance($collection);
        });

        it("returns a mock", function () {
            const object = { method() { }};

            const actual = collection.mock(object);
            actual.expects("method");

            assert.equal(typeof actual.verify, "function");
            assert.equal(typeof object.method.restore, "function");
        });

        it("adds mock to fake array", function () {
            const object = { method() { }};

            const expected = collection.mock(object);

            assert.deepEqual(collection.fakes, [expected]);
        });

        it("appends mocks to fake array", function () {
            collection.mock({});
            collection.mock({});

            assert.equal(collection.fakes.length, 2);
        });
    });

    describe("stub and mock test", function () {
        beforeEach(function () {
            collection = createInstance($collection);
        });

        it("appends mocks and stubs to fake array", function () {
            collection.mock({ method() {} }, "method");
            collection.stub({ method() {} }, "method");

            assert.equal(collection.fakes.length, 2);
        });
    });

    describe(".verify", function () {
        beforeEach(function () {
            collection = createInstance($collection);
        });

        it("calls verify on all fakes", function () {
            collection.fakes = [{
                verify: $spy()
            }, {
                verify: $spy()
            }];

            collection.verify();

            assert(collection.fakes[0].verify.called);
            assert(collection.fakes[1].verify.called);
        });
    });

    describe(".restore", function () {
        beforeEach(function () {
            collection = createInstance($collection);
            collection.fakes = [{
                restore: $spy()
            }, {
                restore: $spy()
            }];
        });

        it("calls restore on all fakes", function () {
            const fake0 = collection.fakes[0];
            const fake1 = collection.fakes[1];

            collection.restore();

            assert(fake0.restore.called);
            assert(fake1.restore.called);
        });

        it("removes from collection when restored", function () {
            collection.restore();
            assert(collection.fakes.length === 0);
        });

        it("restores functions when stubbing entire object", function () {
            const a = function () {};
            const b = function () {};
            const obj = { a, b };
            collection.stub(obj);

            collection.restore();

            assert.deepEqual(obj.a, a);
            assert.deepEqual(obj.b, b);
        });
    });

    describe("verify and restore", function () {
        beforeEach(function () {
            collection = createInstance($collection);
        });

        it("calls verify and restore", function () {
            collection.verify = $spy();
            collection.restore = $spy();

            collection.verifyAndRestore();

            assert(collection.verify.called);
            assert(collection.restore.called);
        });

        it("throws when restore throws", function () {
            collection.verify = $spy();
            collection.restore = $stub().throws();

            assert.throw(function () {
                collection.verifyAndRestore();
            });
        });

        it("calls restore when restore throws", function () {
            collection.verify = $spy();
            collection.restore = $stub().throws();

            try {
                collection.verifyAndRestore();
            }            catch (e) {} // eslint-disable-line no-empty

            assert(collection.restore.called);
        });
    });

    describe(".reset", function () {
        beforeEach(function () {
            collection = createInstance($collection);
            collection.fakes = [{
                reset: $spy()
            }, {
                reset: $spy()
            }];
        });

        it("calls reset on all fakes", function () {
            const fake0 = collection.fakes[0];
            const fake1 = collection.fakes[1];

            collection.reset();

            assert(fake0.reset.called);
            assert(fake1.reset.called);
        });
    });

    describe(".resetBehavior", function () {
        beforeEach(function () {
            collection = createInstance($collection);
            collection.fakes = [{
                resetBehavior: $spy()
            }, {
                resetBehavior: $spy()
            }];
        });

        it("calls resetBehavior on all fakes", function () {
            const fake0 = collection.fakes[0];
            const fake1 = collection.fakes[1];

            collection.resetBehavior();

            assert(fake0.resetBehavior.called);
            assert(fake1.resetBehavior.called);
        });
    });

    describe(".resetHistory", function () {
        beforeEach(function () {
            collection = createInstance($collection);
            collection.fakes = [{
                resetHistory: $spy()
            }, {
                resetHistory: $spy()
            }];
        });

        it("calls resetHistory on all fakes", function () {
            const fake0 = collection.fakes[0];
            const fake1 = collection.fakes[1];

            collection.resetHistory();

            assert(fake0.resetHistory.called);
            assert(fake1.resetHistory.called);
        });
    });

    describe("inject test", function () {
        beforeEach(function () {
            collection = createInstance($collection);
        });

        it("injects fakes into object", function () {
            const obj = {};
            collection.inject(obj);

            assert.isFunction(obj.spy);
            assert.isFunction(obj.stub);
            assert.isFunction(obj.mock);
        });

        it("returns argument", function () {
            const obj = {};

            assert.deepEqual(collection.inject(obj), obj);
        });

        it("injects spy, stub, mock bound to collection", function () {
            const obj = {};
            collection.inject(obj);
            $stub(collection, "spy");
            $stub(collection, "stub");
            $stub(collection, "mock");

            obj.spy();
            let fn = obj.spy;
            fn();

            obj.stub();
            fn = obj.stub;
            fn();

            obj.mock();
            fn = obj.mock;
            fn();

            assert(collection.spy.calledTwice);
            assert(collection.stub.calledTwice);
            assert(collection.mock.calledTwice);
        });
    });
});
