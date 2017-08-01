describe("shani", "util", "__", "collection", () => {
    const { __: { Collection }, spy: sspy, stub: sstub } = adone.shani.util;

    it("creates fake collection", () => {
        const collection = new Collection();

        assert.isFunction(collection.verify);
        assert.isFunction(collection.restore);
        assert.isFunction(collection.verifyAndRestore);
        assert.isFunction(collection.stub);
        assert.isFunction(collection.mock);
    });

    describe(".stub", () => {
        beforeEach(function () {
            this.collection = new Collection();
        });

        it("fails if stubbing property on null", function () {
            const collection = this.collection;

            assert.throws(
                () => {
                    collection.stub(null, "prop");
                },
                "Trying to stub property 'prop' of null"
            );
        });

        it("fails if stubbing symbol on null", function () {
            if (typeof Symbol === "function") {
                const collection = this.collection;

                assert.throws(
                    () => {
                        collection.stub(null, Symbol());
                    },
                    "Trying to stub property 'Symbol()' of null"
                );
            }
        });

        it("creates a stub", function () {
            const object = { method() { } };

            this.collection.stub(object, "method");

            assert.equal(typeof object.method.restore, "function");
        });

        it("adds stub to fake array", function () {
            const object = { method() { } };

            this.collection.stub(object, "method");

            assert.deepEqual(this.collection.fakes, [object.method]);
        });

        it("appends stubs to fake array", function () {
            this.collection.stub({ method() { } }, "method");
            this.collection.stub({ method() { } }, "method");

            assert.equal(this.collection.fakes.length, 2);
        });

        it("adds all object methods to fake array", function () {
            const object = {
                method() { },
                method2() { },
                method3() { }
            };

            Object.defineProperty(object, "method3", {
                enumerable: false
            });

            this.collection.stub(object);

            assert.include(this.collection.fakes, object.method);
            assert.include(this.collection.fakes, object.method2);
            assert.include(this.collection.fakes, object.method3);
            assert.equal(this.collection.fakes.length, 3);
        });

        it("returns a stubbed object", function () {
            const object = { method() { } };
            assert.equal(this.collection.stub(object), object);
        });

        it("returns a stubbed method", function () {
            const object = { method() { } };
            assert.equal(this.collection.stub(object, "method"), object.method);
        });

        if (typeof process !== "undefined") {
            describe("on node", () => {
                beforeEach(() => {
                    process.env.HELL = "Ain't too bad";
                });

                it("stubs environment property", function () {
                    this.collection.stub(process.env, "HELL").value("froze over");
                    assert.equal(process.env.HELL, "froze over");

                });
            });
        }
    });

    describe("stub anything", () => {
        beforeEach(function () {
            this.object = { property: 42 };
            this.collection = new Collection();
        });

        it("stubs number property", function () {
            this.collection.stub(this.object, "property").value(1);

            assert.equal(this.object.property, 1);
        });

        it("restores number property", function () {
            this.collection.stub(this.object, "property").value(1);
            this.collection.restore();

            assert.equal(this.object.property, 42);
        });

        it("fails if property does not exist", function () {
            const collection = this.collection;
            const object = {};

            assert.throws(() => {
                collection.stub(object, "prop", 1);
            });
        });

        it("fails if Symbol does not exist", function () {
            if (typeof Symbol === "function") {
                const collection = this.collection;
                const object = {};

                assert.throws(() => {
                    collection.stub(object, Symbol());
                }, "Cannot stub non-existent own property Symbol()");
            }
        });
    });

    describe(".mock", () => {
        beforeEach(function () {
            this.collection = new Collection();
        });

        it("returns a mock", function () {
            const object = { method() { } };

            const actual = this.collection.mock(object);
            actual.expects("method");

            assert.equal(typeof actual.verify, "function");
            assert.equal(typeof object.method.restore, "function");
        });

        it("adds mock to fake array", function () {
            const object = { method() { } };

            const expected = this.collection.mock(object);

            assert.deepEqual(this.collection.fakes, [expected]);
        });

        it("appends mocks to fake array", function () {
            this.collection.mock({});
            this.collection.mock({});

            assert.equal(this.collection.fakes.length, 2);
        });
    });

    describe("stub and mock test", () => {
        beforeEach(function () {
            this.collection = new Collection();
        });

        it("appends mocks and stubs to fake array", function () {
            this.collection.mock({ method() { } }, "method");
            this.collection.stub({ method() { } }, "method");

            assert.equal(this.collection.fakes.length, 2);
        });
    });

    describe(".verify", () => {
        beforeEach(function () {
            this.collection = new Collection();
        });

        it("calls verify on all fakes", function () {
            this.collection.fakes = [{
                verify: sspy()
            }, {
                verify: sspy()
            }];

            this.collection.verify();

            assert(this.collection.fakes[0].verify.called);
            assert(this.collection.fakes[1].verify.called);
        });
    });

    describe(".restore", () => {
        beforeEach(function () {
            this.collection = new Collection();
            this.collection.fakes = [{
                restore: sspy()
            }, {
                restore: sspy()
            }];
        });

        it("calls restore on all fakes", function () {
            const fake0 = this.collection.fakes[0];
            const fake1 = this.collection.fakes[1];

            this.collection.restore();

            assert(fake0.restore.called);
            assert(fake1.restore.called);
        });

        it("removes from collection when restored", function () {
            this.collection.restore();
            assert(this.collection.fakes.length === 0);
        });

        it("restores functions when stubbing entire object", function () {
            const a = function () { };
            const b = function () { };
            const obj = { a, b };
            this.collection.stub(obj);

            this.collection.restore();

            assert.equal(obj.a, a);
            assert.equal(obj.b, b);
        });
    });

    describe("verify and restore", () => {
        beforeEach(function () {
            this.collection = new Collection();
        });

        it("calls verify and restore", function () {
            this.collection.verify = sspy();
            this.collection.restore = sspy();

            this.collection.verifyAndRestore();

            assert(this.collection.verify.called);
            assert(this.collection.restore.called);
        });

        it("throws when restore throws", function () {
            this.collection.verify = sspy();
            this.collection.restore = sstub().throws();

            assert.throws(function () {
                this.collection.verifyAndRestore();
            });
        });

        it("calls restore when restore throws", function () {
            const collection = this.collection;

            collection.verify = sspy();
            collection.restore = sstub().throws();

            assert.throws(() => {
                collection.verifyAndRestore();
            });

            assert(collection.restore.called);
        });
    });

    describe(".reset", () => {
        beforeEach(function () {
            this.collection = new Collection();
            this.collection.fakes = [{
                reset: sspy()
            }, {
                reset: sspy()
            }];
        });

        it("calls reset on all fakes", function () {
            const fake0 = this.collection.fakes[0];
            const fake1 = this.collection.fakes[1];

            this.collection.reset();

            assert(fake0.reset.called);
            assert(fake1.reset.called);
        });
    });

    describe(".resetBehavior", () => {
        beforeEach(function () {
            this.collection = new Collection();
            this.collection.fakes = [{
                resetBehavior: sspy()
            }, {
                resetBehavior: sspy()
            }];
        });

        it("calls resetBehavior on all fakes", function () {
            const fake0 = this.collection.fakes[0];
            const fake1 = this.collection.fakes[1];

            this.collection.resetBehavior();

            assert(fake0.resetBehavior.called);
            assert(fake1.resetBehavior.called);
        });
    });

    describe(".resetHistory", () => {
        beforeEach(function () {
            this.collection = new Collection();
            this.collection.fakes = [{
                resetHistory: sspy()
            }, {
                resetHistory: sspy()
            }, {
                // this fake pretends to be a spy, which does not have resetHistory method
                // but has a reset method
                reset: sspy()
            }];
        });

        it("resets the history on all fakes", function () {
            const fake0 = this.collection.fakes[0];
            const fake1 = this.collection.fakes[1];
            const fake2 = this.collection.fakes[2];

            this.collection.resetHistory();

            assert(fake0.resetHistory.called);
            assert(fake1.resetHistory.called);
            assert(fake2.reset.called);
        });
    });

    describe("inject test", () => {
        beforeEach(function () {
            this.collection = new Collection();
        });

        it("injects fakes into object", function () {
            const obj = {};
            this.collection.inject(obj);

            assert.isFunction(obj.spy);
            assert.isFunction(obj.stub);
            assert.isFunction(obj.mock);
        });

        it("returns argument", function () {
            const obj = {};

            assert.equal(this.collection.inject(obj), obj);
        });

        it("injects spy, stub, mock bound to collection", function () {
            const obj = {};
            this.collection.inject(obj);
            sstub(this.collection, "spy");
            sstub(this.collection, "stub");
            sstub(this.collection, "mock");

            obj.spy();
            let fn = obj.spy;
            fn();

            obj.stub();
            fn = obj.stub;
            fn();

            obj.mock();
            fn = obj.mock;
            fn();

            assert(this.collection.spy.calledTwice);
            assert(this.collection.stub.calledTwice);
            assert(this.collection.mock.calledTwice);
        });
    });
});
