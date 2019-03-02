describe("shani", "util", "assert", () => {
    const { error } = adone;
    const suitil = adone.shani.util;
    const { __: { color } } = suitil;
    const { stub: sstub } = suitil;
    const { spy: sspy } = suitil;
    const { assert: sassert } = suitil;
    const { match: smatch } = suitil;

    beforeEach(function () {
        this.global = global;

        this.setUpStubs = function () {
            this.stub = sstub.create();
            sstub(sassert, "fail").throws();
            sstub(sassert, "pass");
        };

        this.tearDownStubs = function () {
            sassert.fail.restore();
            sassert.pass.restore();
        };
    });

    it("is object", () => {
        assert.isObject(sassert);
    });

    it("supports proxy property", () => {
        const api = { method() { } };
        api.method.proxy = function () { };
        sspy(api, "method");
        api.method();

        assert.doesNotThrow(() => {
            sassert.calledOnce(api.method);
        });
    });

    describe(".fail", () => {
        beforeEach(function () {
            this.exceptionName = sassert.failException;
        });

        afterEach(function () {
            sassert.failException = this.exceptionName;
        });

        it("throws error", () => {
            assert.throws(
                () => {
                    sassert.fail("Some message");
                },
                "Some message"
            );
        });

        it("throws configured error type", () => {
            sassert.failException = "RetardError";

            const e = assert.throws(() => {
                sassert.fail("Some message");
            });
            assert.equal(e.name, "RetardError");
        });
    });

    describe(".match", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when arguments to not match", () => {
            assert.throws(() => {
                sassert.match("foo", "bar");
            });

            assert(sassert.fail.calledOnce);
        });

        it("passes when argumens match", () => {
            sassert.match("foo", "foo");
            assert(sassert.pass.calledOnce);
        });
    });

    describe(".called", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method does not exist", () => {
            assert.throws(() => {
                sassert.called();
            });

            assert(sassert.fail.called);
        });

        it("fails when method is not stub", () => {
            assert.throws(() => {
                sassert.called(() => { });
            });

            assert(sassert.fail.called);
        });

        it("fails when method was not called", function () {
            const stub = this.stub;

            assert.throws(() => {
                sassert.called(stub);
            });

            assert(sassert.fail.called);
        });

        it("fails when called with more than one argument", function () {
            const stub = this.stub;
            stub();

            assert.throws(() => {
                sassert.called(stub, 1);
            });
        });

        it("does not fail when method was called", function () {
            const stub = this.stub;
            stub();

            assert.doesNotThrow(() => {
                sassert.called(stub);
            });

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            const stub = this.stub;
            stub();

            assert.doesNotThrow(() => {
                sassert.called(stub);
            });

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("called"));
        });
    });

    describe(".notCalled", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method does not exist", () => {
            assert.throws(() => {
                sassert.notCalled();
            });

            assert(sassert.fail.called);
        });

        it("fails when method is not stub", () => {
            assert.throws(() => {
                sassert.notCalled(() => { });
            });

            assert(sassert.fail.called);
        });

        it("fails when method was called", function () {
            const stub = this.stub;
            stub();

            assert.throws(() => {
                sassert.notCalled(stub);
            });

            assert(sassert.fail.called);
        });

        it("fails when called with more than one argument", function () {
            const stub = this.stub;

            assert.throws(() => {
                sassert.notCalled(stub, 1);
            });
        });

        it("passes when method was not called", function () {
            const stub = this.stub;

            assert.doesNotThrow(() => {
                sassert.notCalled(stub);
            });

            assert.isFalse(sassert.fail.called);
        });

        it("should call pass callback", function () {
            const stub = this.stub;
            sassert.notCalled(stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("notCalled"));
        });
    });

    describe(".calledOnce", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method does not exist", () => {
            assert.throws(() => {
                sassert.calledOnce();
            });

            assert(sassert.fail.called);
        });

        it("fails when method is not stub", () => {
            assert.throws(() => {
                sassert.calledOnce(() => { });
            });

            assert(sassert.fail.called);
        });

        it("fails when method was not called", function () {
            const stub = this.stub;

            assert.throws(() => {
                sassert.calledOnce(stub);
            });

            assert(sassert.fail.called);
        });

        it("fails when called with more than one argument", function () {
            const stub = this.stub;
            stub();

            assert.throws(() => {
                sassert.calledOnce(stub, 1);
            });
        });

        it("passes when method was called", function () {
            const stub = this.stub;
            stub();

            assert.doesNotThrow(() => {
                sassert.calledOnce(stub);
            });

            assert.isFalse(sassert.fail.called);
        });

        it("fails when method was called more than once", function () {
            const stub = this.stub;
            stub();
            stub();

            assert.throws(() => {
                sassert.calledOnce(stub);
            });

            assert(sassert.fail.called);
        });

        it("calls pass callback", function () {
            const stub = this.stub;
            stub();
            sassert.calledOnce(stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledOnce"));
        });
    });

    describe(".calledTwice", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails if called once", function () {
            const stub = this.stub;
            this.stub();

            assert.throws(() => {
                sassert.calledTwice(stub);
            });
        });

        it("fails when called with more than one argument", function () {
            const stub = this.stub;
            this.stub();
            this.stub();

            assert.throws(() => {
                sassert.calledTwice(stub, 1);
            });
        });

        it("passes if called twice", function () {
            const stub = this.stub;
            this.stub();
            this.stub();

            assert.doesNotThrow(() => {
                sassert.calledTwice(stub);
            });
        });

        it("calls pass callback", function () {
            const stub = this.stub;
            stub();
            stub();
            sassert.calledTwice(stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledTwice"));
        });
    });

    describe(".calledThrice", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails if called once", function () {
            const stub = this.stub;
            this.stub();

            assert.throws(() => {
                sassert.calledThrice(stub);
            });
        });

        it("fails when called with more than one argument", function () {
            const stub = this.stub;
            this.stub();
            this.stub();
            this.stub();

            assert.throws(() => {
                sassert.calledThrice(stub, 1);
            });
        });

        it("passes if called thrice", function () {
            const stub = this.stub;
            this.stub();
            this.stub();
            this.stub();

            assert.doesNotThrow(() => {
                sassert.calledThrice(stub);
            });
        });

        it("calls pass callback", function () {
            const stub = this.stub;
            stub();
            stub();
            stub();
            sassert.calledThrice(stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledThrice"));
        });
    });

    describe(".callOrder", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("passes when calls were done in right order", () => {
            const spy1 = sspy();
            const spy2 = sspy();
            spy1();
            spy2();

            assert.doesNotThrow(() => {
                sassert.callOrder(spy1, spy2);
            });
        });

        it("fails when calls were done in wrong order", () => {
            const spy1 = sspy();
            const spy2 = sspy();
            spy2();
            spy1();

            assert.throws(() => {
                sassert.callOrder(spy1, spy2);
            });

            assert(sassert.fail.called);
        });

        it("passes when many calls were done in right order", () => {
            const spy1 = sspy();
            const spy2 = sspy();
            const spy3 = sspy();
            const spy4 = sspy();
            spy1();
            spy2();
            spy3();
            spy4();

            assert.doesNotThrow(() => {
                sassert.callOrder(spy1, spy2, spy3, spy4);
            });
        });

        it("fails when one of many calls were done in wrong order", () => {
            const spy1 = sspy();
            const spy2 = sspy();
            const spy3 = sspy();
            const spy4 = sspy();
            spy1();
            spy2();
            spy4();
            spy3();

            assert.throws(() => {
                sassert.callOrder(spy1, spy2, spy3, spy4);
            });

            assert(sassert.fail.called);
        });

        it("calls pass callback", () => {
            const stubs = [sspy(), sspy()];
            stubs[0]();
            stubs[1]();
            sassert.callOrder(stubs[0], stubs[1]);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("callOrder"));
        });

        it("passes for multiple calls to same spy", () => {
            const first = sspy();
            const second = sspy();

            first();
            second();
            first();

            assert.doesNotThrow(() => {
                sassert.callOrder(first, second, first);
            });
        });

        it("fails if first spy was not called", () => {
            const first = sspy();
            const second = sspy();

            second();

            assert.throws(() => {
                sassert.callOrder(first, second);
            });
        });

        it("fails if second spy was not called", () => {
            const first = sspy();
            const second = sspy();

            first();

            assert.throws(() => {
                sassert.callOrder(first, second);
            });
        });
    });

    describe(".calledOn", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method does not exist", function () {
            const object = {};
            sstub(this.stub, "calledOn");

            assert.throws(() => {
                sassert.calledOn(null, object);
            });

            assert.isFalse(this.stub.calledOn.calledWith(object));
            assert(sassert.fail.called);
        });

        it("fails when method is not stub", function () {
            const object = {};
            sstub(this.stub, "calledOn");

            assert.throws(() => {
                sassert.calledOn(() => { }, object);
            });

            assert.isFalse(this.stub.calledOn.calledWith(object));
            assert(sassert.fail.called);
        });

        it("fails when method fails", function () {
            const object = {};
            sstub(this.stub, "calledOn").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.calledOn(stub, object);
            });

            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            const object = {};
            sstub(this.stub, "calledOn").returns(true);
            const stub = this.stub;

            sassert.calledOn(stub, object);

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            const obj = {};
            this.stub.call(obj);
            sassert.calledOn(this.stub, obj);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledOn"));
        });
    });

    describe(".calledWithNew", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method does not exist", function () {
            sstub(this.stub, "calledWithNew");

            assert.throws(() => {
                sassert.calledWithNew(null);
            });

            assert.isFalse(this.stub.calledWithNew.called);
            assert(sassert.fail.called);
        });

        it("fails when method is not stub", function () {
            sstub(this.stub, "calledWithNew");

            assert.throws(() => {
                sassert.calledWithNew(() => { });
            });

            assert.isFalse(this.stub.calledWithNew.called);
            assert(sassert.fail.called);
        });

        it("fails when method fails", function () {
            sstub(this.stub, "calledWithNew").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.calledWithNew(stub);
            });

            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            sstub(this.stub, "calledWithNew").returns(true);
            const stub = this.stub;

            sassert.calledWithNew(stub);

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            new this.stub(); // eslint-disable-line no-new, new-cap
            sassert.calledWithNew(this.stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledWithNew"));
        });
    });

    describe(".alwaysCalledWithNew", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method does not exist", function () {
            sstub(this.stub, "alwaysCalledWithNew");

            assert.throws(() => {
                sassert.alwaysCalledWithNew(null);
            });

            assert.isFalse(this.stub.alwaysCalledWithNew.called);
            assert(sassert.fail.called);
        });

        it("fails when method is not stub", function () {
            sstub(this.stub, "alwaysCalledWithNew");

            assert.throws(() => {
                sassert.alwaysCalledWithNew(() => { });
            });

            assert.isFalse(this.stub.alwaysCalledWithNew.called);
            assert(sassert.fail.called);
        });

        it("fails when method fails", function () {
            sstub(this.stub, "alwaysCalledWithNew").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.alwaysCalledWithNew(stub);
            });

            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            sstub(this.stub, "alwaysCalledWithNew").returns(true);
            const stub = this.stub;

            sassert.alwaysCalledWithNew(stub);

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            new this.stub(); // eslint-disable-line no-new, new-cap
            sassert.alwaysCalledWithNew(this.stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("alwaysCalledWithNew"));
        });
    });

    describe(".calledWith", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method fails", function () {
            const object = {};
            sstub(this.stub, "calledWith").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.calledWith(stub, object, 1);
            });

            assert(this.stub.calledWith.calledWith(object, 1));
            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            const object = {};
            sstub(this.stub, "calledWith").returns(true);
            const stub = this.stub;

            assert.doesNotThrow(() => {
                sassert.calledWith(stub, object, 1);
            });

            assert(this.stub.calledWith.calledWith(object, 1));
            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            this.stub("yeah");
            sassert.calledWith(this.stub, "yeah");

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledWith"));
        });

        it("works with spyCall", () => {
            const spy = sspy();
            const object = {};
            spy();
            spy(object);

            sassert.calledWith(spy.lastCall, object);
            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledWith"));
        });

        it("fails when spyCall failed", () => {
            const spy = sspy();
            const object = {};
            spy();
            spy(object);

            assert.throws(() => {
                sassert.calledWith(spy.lastCall, 1);
            });

            assert(sassert.fail.called);
        });
    });

    describe(".calledWithExactly", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method fails", function () {
            const object = {};
            sstub(this.stub, "calledWithExactly").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.calledWithExactly(stub, object, 1);
            });

            assert(this.stub.calledWithExactly.calledWithExactly(object, 1));
            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            const object = {};
            sstub(this.stub, "calledWithExactly").returns(true);
            const stub = this.stub;

            assert.doesNotThrow(() => {
                sassert.calledWithExactly(stub, object, 1);
            });

            assert(this.stub.calledWithExactly.calledWithExactly(object, 1));
            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            this.stub("yeah");
            sassert.calledWithExactly(this.stub, "yeah");

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("calledWithExactly"));
        });
    });

    describe(".neverCalledWith", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method fails", function () {
            const object = {};
            sstub(this.stub, "neverCalledWith").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.neverCalledWith(stub, object, 1);
            });

            assert(this.stub.neverCalledWith.calledWith(object, 1));
            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            const object = {};
            sstub(this.stub, "neverCalledWith").returns(true);
            const stub = this.stub;

            assert.doesNotThrow(() => {
                sassert.neverCalledWith(stub, object, 1);
            });

            assert(this.stub.neverCalledWith.calledWith(object, 1));
            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            this.stub("yeah");
            sassert.neverCalledWith(this.stub, "nah!");

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("neverCalledWith"));
        });
    });

    describe(".threwTest", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method fails", function () {
            sstub(this.stub, "threw").returns(false);
            const stub = this.stub;

            assert.throws(() => {
                sassert.threw(stub, 1, 2);
            });

            assert(this.stub.threw.calledWithExactly(1, 2));
            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            sstub(this.stub, "threw").returns(true);
            const stub = this.stub;

            assert.doesNotThrow(() => {
                sassert.threw(stub, 1, 2);
            });

            assert(this.stub.threw.calledWithExactly(1, 2));
            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            sstub(this.stub, "threw").returns(true);
            this.stub();
            sassert.threw(this.stub);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("threw"));
        });
    });

    describe(".callCount", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails when method fails", function () {
            this.stub();
            this.stub();
            const stub = this.stub;

            assert.throws(() => {
                sassert.callCount(stub, 3);
            });

            assert(sassert.fail.called);
        });

        it("passes when method doesn't fail", function () {
            const stub = this.stub;
            this.stub.callCount = 3;

            assert.doesNotThrow(() => {
                sassert.callCount(stub, 3);
            });

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            this.stub();
            sassert.callCount(this.stub, 1);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("callCount"));
        });
    });

    describe(".alwaysCalledOn", () => {
        beforeEach(function () {
            this.setUpStubs();
        });
        afterEach(function () {
            this.tearDownStubs();
        });

        it("fails if method is missing", () => {
            assert.throws(() => {
                sassert.alwaysCalledOn();
            });
        });

        it("fails if method is not fake", () => {
            assert.throws(() => {
                sassert.alwaysCalledOn(() => { }, {});
            });
        });

        it("fails if stub returns false", () => {
            const stub = sstub();
            sstub(stub, "alwaysCalledOn").returns(false);

            assert.throws(() => {
                sassert.alwaysCalledOn(stub, {});
            });

            assert(sassert.fail.called);
        });

        it("passes if stub returns true", () => {
            const stub = sstub.create();
            sstub(stub, "alwaysCalledOn").returns(true);

            sassert.alwaysCalledOn(stub, {});

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", function () {
            this.stub();
            sassert.alwaysCalledOn(this.stub, this);

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("alwaysCalledOn"));
        });
    });

    describe(".alwaysCalledWith", () => {
        beforeEach(() => {
            sstub(sassert, "fail").throws();
            sstub(sassert, "pass");
        });

        afterEach(() => {
            sassert.fail.restore();
            sassert.pass.restore();
        });

        it("fails if method is missing", () => {
            assert.throws(() => {
                sassert.alwaysCalledWith();
            });
        });

        it("fails if method is not fake", () => {
            assert.throws(() => {
                sassert.alwaysCalledWith(() => { });
            });
        });

        it("fails if stub returns false", () => {
            const stub = sstub.create();
            sstub(stub, "alwaysCalledWith").returns(false);

            assert.throws(() => {
                sassert.alwaysCalledWith(stub, {}, []);
            });

            assert(sassert.fail.called);
        });

        it("passes if stub returns true", () => {
            const stub = sstub.create();
            sstub(stub, "alwaysCalledWith").returns(true);

            sassert.alwaysCalledWith(stub, {}, []);

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", () => {
            const spy = sspy();
            spy("Hello");
            sassert.alwaysCalledWith(spy, "Hello");

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("alwaysCalledWith"));
        });
    });

    describe(".alwaysCalledWithExactly", () => {
        beforeEach(() => {
            sstub(sassert, "fail");
            sstub(sassert, "pass");
        });

        afterEach(() => {
            sassert.fail.restore();
            sassert.pass.restore();
        });

        it("fails if stub returns false", () => {
            const stub = sstub.create();
            sstub(stub, "alwaysCalledWithExactly").returns(false);

            sassert.alwaysCalledWithExactly(stub, {}, []);

            assert(sassert.fail.called);
        });

        it("passes if stub returns true", () => {
            const stub = sstub.create();
            sstub(stub, "alwaysCalledWithExactly").returns(true);

            sassert.alwaysCalledWithExactly(stub, {}, []);

            assert.isFalse(sassert.fail.called);
        });

        it("calls pass callback", () => {
            const spy = sspy();
            spy("Hello");
            sassert.alwaysCalledWithExactly(spy, "Hello");

            assert(sassert.pass.calledOnce);
            assert(sassert.pass.calledWith("alwaysCalledWithExactly"));
        });
    });

    describe(".expose", () => {
        it("exposes asserts into object", () => {
            const test = {};
            sassert.expose(test);

            assert.isFunction(test.fail);
            assert.isString(test.failException);
            assert.isFunction(test.assertCalled);
            assert.isFunction(test.assertCalledOn);
            assert.isFunction(test.assertCalledWith);
            assert.isFunction(test.assertCalledWithExactly);
            assert.isFunction(test.assertThrew);
            assert.isFunction(test.assertCallCount);
        });

        it("exposes asserts into global", function () {
            sassert.expose(this.global, {
                includeFail: false
            });

            assert.equal(typeof failException, "undefined");
            /**
             * eslint-disable no-undef
             */
            assert.isFunction(assertCalled);
            assert.isFunction(assertCalledOn);
            assert.isFunction(assertCalledWith);
            assert.isFunction(assertCalledWithExactly);
            assert.isFunction(assertThrew);
            assert.isFunction(assertCallCount);
            /*eslint-enable no-undef*/
        });

        it("fails exposed asserts without errors", function () {
            sassert.expose(this.global, {
                includeFail: false
            });

            assert.throws(
                () => {
                    assertCalled(sspy()); // eslint-disable-line no-undef
                },
                "expected spy to have been called at least once but was never called"
            );
        });

        it("exposes asserts into object without prefixes", () => {
            const test = {};

            sassert.expose(test, { prefix: "" });

            assert.isFunction(test.fail);
            assert.isString(test.failException);
            assert.isFunction(test.called);
            assert.isFunction(test.calledOn);
            assert.isFunction(test.calledWith);
            assert.isFunction(test.calledWithExactly);
            assert.isFunction(test.threw);
            assert.isFunction(test.callCount);
        });

        it("does not expose 'expose'", () => {
            const test = {};

            sassert.expose(test, { prefix: "" });

            assert(!test.expose, "Expose should not be exposed");
        });

        it("throws if target is undefined", () => {
            assert.throws(() => {
                sassert.expose();
            }, error.InvalidArgumentException);
        });

        it("throws if target is null", () => {
            assert.throws(() => {
                sassert.expose(null);
            }, error.InvalidArgumentException);
        });
    });

    describe("message", () => {
        beforeEach(function () {
            this.obj = {
                doSomething() { }
            };

            sspy(this.obj, "doSomething");

            /**
             * eslint consistent-return: "off"
             */
            this.message = function (method) {
                try { // eslint-disable-line no-restricted-syntax
                    sassert[method].apply(sassert, [].slice.call(arguments, 1));
                } catch (e) {
                    return e.message;
                }
            };
        });

        it("assert.called error message", function () {
            assert.equal(this.message("called", this.obj.doSomething),
                "expected doSomething to have been called at " +
                "least once but was never called");
        });

        it("assert.notCalled error message one call", function () {
            this.obj.doSomething();

            assert.equal(this.message("notCalled", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to not have been called " +
                "but was called once\n    doSomething()");
        });

        it("assert.notCalled error message four calls", function () {
            this.obj.doSomething();
            this.obj.doSomething();
            this.obj.doSomething();
            this.obj.doSomething();

            assert.equal(this.message("notCalled", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to not have been called " +
                "but was called 4 times\n    doSomething()\n    " +
                "doSomething()\n    doSomething()\n    doSomething()");
        });

        it("assert.notCalled error message with calls with arguments", function () {
            this.obj.doSomething();
            this.obj.doSomething(3);
            this.obj.doSomething(42, 1);
            this.obj.doSomething();

            assert.equal(this.message("notCalled", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to not have been called " +
                "but was called 4 times\n    doSomething()\n    " +
                "doSomething(3)\n    doSomething(42, 1)\n    doSomething()");
        });

        it("assert.callOrder error message", function () {
            const obj = { doop() { }, foo() { } };
            sspy(obj, "doop");
            sspy(obj, "foo");

            obj.doop();
            this.obj.doSomething();
            obj.foo();

            const message = this.message("callOrder", this.obj.doSomething, obj.doop, obj.foo);

            assert.equal(message,
                "expected doSomething, doop, foo to be called in " +
                "order but were called as doop, doSomething, foo");
        });

        it("assert.callOrder with missing first call error message", function () {
            const obj = { doop() { }, foo() { } };
            sspy(obj, "doop");
            sspy(obj, "foo");

            obj.foo();

            const message = this.message("callOrder", obj.doop, obj.foo);

            assert.equal(message,
                "expected doop, foo to be called in " +
                "order but were called as foo");
        });

        it("assert.callOrder with missing last call error message", function () {
            const obj = { doop() { }, foo() { } };
            sspy(obj, "doop");
            sspy(obj, "foo");

            obj.doop();

            const message = this.message("callOrder", obj.doop, obj.foo);

            assert.equal(message,
                "expected doop, foo to be called in " +
                "order but were called as doop");
        });

        it("assert.callCount error message", function () {
            this.obj.doSomething();

            assert.equal(this.message("callCount", this.obj.doSomething, 3).replace(/ at.*/g, ""),
                "expected doSomething to be called thrice but was called " +
                "once\n    doSomething()");
        });

        it("assert.calledOnce error message", function () {
            this.obj.doSomething();
            this.obj.doSomething();

            assert.equal(this.message("calledOnce", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to be called once but was called " +
                "twice\n    doSomething()\n    doSomething()");

            this.obj.doSomething();

            assert.equal(this.message("calledOnce", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to be called once but was called " +
                "thrice\n    doSomething()\n    doSomething()\n    doSomething()");
        });

        it("assert.calledTwice error message", function () {
            this.obj.doSomething();

            assert.equal(this.message("calledTwice", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to be called twice but was called " +
                "once\n    doSomething()");
        });

        it("assert.calledThrice error message", function () {
            this.obj.doSomething();
            this.obj.doSomething();
            this.obj.doSomething();
            this.obj.doSomething();

            assert.equal(
                this.message("calledThrice", this.obj.doSomething).replace(/ at.*/g, ""),
                "expected doSomething to be called thrice but was called 4 times\n" +
                "    doSomething()\n    doSomething()\n    doSomething()\n    doSomething()"
            );
        });

        it.skip("assert.calledOn error message", function () {
            this.obj.toString = function () {
                return "[Oh yeah]";
            };

            const obj = {
                toString() {
                    return "[Oh no]";
                }
            };
            const obj2 = {
                toString() {
                    return "[Oh well]";
                }
            };

            this.obj.doSomething.call(obj);
            this.obj.doSomething.call(obj2);
            assert.equal(
                this.message("calledOn", this.obj.doSomething, this.obj),
                "expected doSomething to be called with [Oh yeah] as this but was called with [Oh no], [Oh well]"
            );
        });

        it.skip("assert.alwaysCalledOn error message", function () {
            this.obj.toString = function () {
                return "[Oh yeah]";
            };

            const obj = {
                toString() {
                    return "[Oh no]";
                }
            };
            const obj2 = {
                toString() {
                    return "[Oh well]";
                }
            };

            this.obj.doSomething.call(obj);
            this.obj.doSomething.call(obj2);
            this.obj.doSomething();

            assert.equal(
                this.message("alwaysCalledOn", this.obj.doSomething, this.obj),
                "expected doSomething to always be called with [Oh yeah] as this but was called with " +
                "[Oh no], [Oh well], [Oh yeah]"
            );
        });

        it("assert.calledWithNew error message", function () {
            this.obj.doSomething();

            assert.equal(this.message("calledWithNew", this.obj.doSomething),
                "expected doSomething to be called with new");
        });

        it("assert.alwaysCalledWithNew error message", function () {
            new this.obj.doSomething(); // eslint-disable-line no-new, new-cap
            this.obj.doSomething();

            assert.equal(this.message("alwaysCalledWithNew", this.obj.doSomething),
                "expected doSomething to always be called with new");
        });

        it("assert.calledWith error message", function () {
            this.obj.doSomething(4, 3, "hey");

            assert.equal(this.message("calledWith", this.obj.doSomething, 1, 3, "hey").replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n${
                    color.red("4")} ${color.green("1")} \n` +
                "3\n" +
                "hey");
        });

        it("assert.calledWith error message with multiple calls", function () {
            this.obj.doSomething(4, 3, "hey");
            this.obj.doSomething(1, 3, "not");

            assert.equal(this.message("calledWith", this.obj.doSomething, 1, 3, "hey").replace(/ at.*/g, ""),
                `${"expected doSomething to be called with arguments " +
                "Call 1:\n"}${
                    color.red("4")} ${color.green("1")} \n` +
                "3\n" +
                "hey\n" +
                "Call 2:\n" +
                "1\n" +
                `3\n${
                    color.red("not")} ${color.green("hey")} `);
        });

        it("assert.calledWith error message with a missing argument", function () {
            this.obj.doSomething(4);

            assert.equal(this.message("calledWith", this.obj.doSomething, 1, 3).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n${
                    color.red("4")} ${color.green("1")} \n${
                    color.green("3")}`);
        });

        it("assert.calledWith error message with an excess argument", function () {
            this.obj.doSomething(4, 3);

            assert.equal(this.message("calledWith", this.obj.doSomething, 1).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n${
                    color.red("4")} ${color.green("1")} \n${
                    color.red("3")}`);
        });

        it("assert.calledWith match.any error message", function () {
            this.obj.doSomething(true, true);

            assert.equal(
                this.message("calledWith", this.obj.doSomething, smatch.any, false).replace(/ at.*/g, ""),
                `${"expected doSomething to be called with arguments \n" +
                "true any\n"}${
                    color.red("true")} ${color.green("false")} `);
        });

        it("assert.calledWith match.defined error message", function () {
            this.obj.doSomething();

            assert.equal(
                this.message("calledWith", this.obj.doSomething, smatch.defined).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("defined")}`);
        });

        it("assert.calledWith match.truthy error message", function () {
            this.obj.doSomething();

            assert.equal(
                this.message("calledWith", this.obj.doSomething, smatch.truthy).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("truthy")}`);
        });

        it("assert.calledWith match.falsy error message", function () {
            this.obj.doSomething(true);

            assert.equal(this.message("calledWith", this.obj.doSomething, smatch.falsy).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n${
                    color.green("true")} ${color.red("falsy")}`);
        });

        it("assert.calledWith match.same error message", function () {
            this.obj.doSomething();

            assert.equal(
                this.message("calledWith", this.obj.doSomething, smatch.same(1)).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("same(1)")}`);
        });

        it("assert.calledWith match.typeOf error message", function () {
            this.obj.doSomething();
            const matcher = smatch.typeOf("string");

            assert.equal(
                this.message("calledWith", this.obj.doSomething, matcher).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("typeOf(\"string\")")}`);
        });

        it("assert.calledWith match.instanceOf error message", function () {
            this.obj.doSomething();
            const matcher = smatch.instanceOf(function CustomType() { });

            assert.equal(
                this.message("calledWith", this.obj.doSomething, matcher).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("instanceOf(CustomType)")}`);
        });

        it("assert.calledWith match object error message", function () {
            this.obj.doSomething();
            const matcher = smatch({ some: "value", and: 123 });

            assert.equal(
                this.message("calledWith", this.obj.doSomething, matcher).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("match(some: value, and: 123)")}`);
        });

        it("assert.calledWith match boolean error message", function () {
            this.obj.doSomething();

            assert.equal(this.message("calledWith", this.obj.doSomething, smatch(true)).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("match(true)")}`);
        });

        it("assert.calledWith match number error message", function () {
            this.obj.doSomething();

            assert.equal(this.message("calledWith", this.obj.doSomething, smatch(123)).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("match(123)")}`);
        });

        it("assert.calledWith match string error message", function () {
            this.obj.doSomething();
            const matcher = smatch("Sinon");

            assert.equal(this.message("calledWith", this.obj.doSomething, matcher).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("match(\"Sinon\")")}`);
        });

        it("assert.calledWith match regexp error message", function () {
            this.obj.doSomething();

            assert.equal(
                this.message("calledWith", this.obj.doSomething, smatch(/[a-z]+/)).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("match(/[a-z]+/)")}`);
        });

        it("assert.calledWith match test function error message", function () {
            this.obj.doSomething();
            const matcher = smatch({ test: function custom() { } });

            assert.equal(
                this.message("calledWith", this.obj.doSomething, matcher).replace(/ at.*/g, ""),
                `expected doSomething to be called with arguments \n ${color.red("match(custom)")}`);
        });

        it("assert.calledWithMatch error message", function () {
            this.obj.doSomething(1, 3, "hey");

            assert.equal(this.message("calledWithMatch", this.obj.doSomething, 4, 3, "hey").replace(/ at.*/g, ""),
                `expected doSomething to be called with match \n${
                    color.red("1")} ${color.green("4")} \n` +
                "3\n" +
                "hey");
        });

        it("assert.alwaysCalledWith error message", function () {
            this.obj.doSomething(1, 3, "hey");
            this.obj.doSomething(1, "hey");

            assert.equal(this.message("alwaysCalledWith", this.obj.doSomething, 1, "hey").replace(/ at.*/g, ""),
                `${"expected doSomething to always be called with arguments Call 1:\n" +
                "1\n"}${
                    color.red("3")} ${color.green("hey")} \n${
                    color.red("hey")}\n` +
                "Call 2:\n" +
                "1\n" +
                "hey");
        });

        it("assert.alwaysCalledWithMatch error message", function () {
            this.obj.doSomething(1, 3, "hey");
            this.obj.doSomething(1, "hey");

            assert.equal(
                this.message("alwaysCalledWithMatch", this.obj.doSomething, 1, "hey").replace(/ at.*/g, ""),
                `${"expected doSomething to always be called with match Call 1:\n" +
                "1\n"}${
                    color.red("3")} ${color.green("hey")} \n${
                    color.red("hey")}\n` +
                "Call 2:\n" +
                "1\n" +
                "hey");
        });

        it("assert.calledWithExactly error message", function () {
            this.obj.doSomething(1, 3, "hey");

            assert.equal(this.message("calledWithExactly", this.obj.doSomething, 1, 3).replace(/ at.*/g, ""),
                `${"expected doSomething to be called with exact arguments \n" +
                "1\n" +
                "3\n"}${
                    color.red("hey")}`);
        });

        it("assert.alwaysCalledWithExactly error message", function () {
            this.obj.doSomething(1, 3, "hey");
            this.obj.doSomething(1, 3);

            assert.equal(this.message("alwaysCalledWithExactly", this.obj.doSomething, 1, 3).replace(/ at.*/g, ""),
                `${"expected doSomething to always be called with exact arguments Call 1:\n" +
                "1\n" +
                "3\n"}${
                    color.red("hey")}\n` +
                "Call 2:\n" +
                "1\n" +
                "3");
        });

        it("assert.neverCalledWith error message", function () {
            this.obj.doSomething(1, 2, 3);

            assert.equal(this.message("neverCalledWith", this.obj.doSomething, 1, 2).replace(/ at.*/g, ""),
                "expected doSomething to never be called with " +
                "arguments 1, 2\n    doSomething(1, 2, 3)");
        });

        it("assert.neverCalledWithMatch error message", function () {
            this.obj.doSomething(1, 2, 3);

            assert.equal(this.message("neverCalledWithMatch", this.obj.doSomething, 1, 2).replace(/ at.*/g, ""),
                "expected doSomething to never be called with match " +
                "1, 2\n    doSomething(1, 2, 3)");
        });

        it("assert.threw error message", function () {
            this.obj.doSomething(1, 3, "hey");
            this.obj.doSomething(1, 3);

            assert.equal(this.message("threw", this.obj.doSomething).replace(/ at.*/g, ""),
                "doSomething did not throw error\n" +
                "    doSomething(1, 3, hey)\n    doSomething(1, 3)");
        });

        it("assert.alwaysThrew error message", function () {
            this.obj.doSomething(1, 3, "hey");
            this.obj.doSomething(1, 3);

            assert.equal(this.message("alwaysThrew", this.obj.doSomething).replace(/ at.*/g, ""),
                "doSomething did not always throw error\n" +
                "    doSomething(1, 3, hey)\n    doSomething(1, 3)");
        });

        it("assert.match error message", function () {
            assert.equal(this.message("match", { foo: 1 }, [1, 3]),
                "expected value to match\n" +
                "    expected = [ 1, 3 ]\n" +
                "    actual = { foo: 1 }");
        });
    });

    describe("with symbol method names", () => {
        const obj = {};

        const setupSymbol = (symbol) => {
            obj[symbol] = function () {};
            sspy(obj, symbol);
        };

        const createExceptionMessage = (method, arg) => {
            try { // eslint-disable-line no-restricted-syntax
                sassert[method](arg);
            } catch (e) {
                return e.message;
            }
        };

        it("should use the symbol's description in error messages", () => {
            const symbol = Symbol("Something Symbolic");
            setupSymbol(symbol);

            assert.equal(createExceptionMessage("called", obj[symbol]),
                "expected Symbol(Something Symbolic) to have been " +
                "called at least once but was never called");
        });

        it("should indicate that an assertion failure with a symbol method name " +
           "occured in error messages, even if the symbol has no description", () => {
            const symbol = Symbol();
            setupSymbol(symbol);

            assert.equal(createExceptionMessage("called", obj[symbol]),
                "expected Symbol() to have been " +
                "called at least once but was never called");
        });
    });
});
