describe("shani", "util", "stub", () => {
    const { is, error } = adone;
    const {
        stub: createStub,
        spy: createSpy,
        match,
        __: {
            util: {
                getPropertyDescriptor
            }
        }
    } = adone.shani.util;
    const { createStubInstance } = createStub;

    it("is spy", () => {
        const stub = createStub.create();

        assert.isFalse(stub.called);
        assert.isFunction(stub.calledWith);
        assert.isFunction(stub.calledOn);
    });

    it("fails if stubbing property on null", () => {
        assert.throws(
            () => {
                createStub(null, "prop");
            },
            "Trying to stub property 'prop' of null"
        );
    });

    it("throws a readable error if stubbing Symbol on null", () => {
        if (is.function(Symbol)) {
            assert.throws(
                () => {
                    createStub(null, Symbol());
                },
                "Trying to stub property 'Symbol()' of null"
            );
        }
    });

    it("should contain asynchronous versions of callsArg*, and yields* methods", () => {
        const stub = createStub.create();

        let syncVersions = 0;
        let asyncVersions = 0;

        for (const method in stub) {
            if (stub.hasOwnProperty(method) && method.match(/^(callsArg|yields)/)) {
                if (!method.match(/Async/)) {
                    syncVersions++;
                } else if (method.match(/Async/)) {
                    asyncVersions++;
                }
            }
        }

        assert.equal(syncVersions, asyncVersions, "Stub prototype should contain same amount of synchronous and asynchronous methods");
    });

    it("should allow overriding async behavior with sync behavior", () => {
        const stub = createStub();
        const callback = createSpy();

        stub.callsArgAsync(1);
        stub.callsArg(1);
        stub(1, callback);

        assert(callback.called);
    });

    it("should works with combination of withArgs arguments", () => {
        const stub = createStub();
        stub.returns(0);
        stub.withArgs(1, 1).returns(2);
        stub.withArgs(1).returns(1);

        assert.equal(stub(), 0);
        assert.equal(stub(1), 1);
        assert.equal(stub(1, 1), 2);
        assert.equal(stub(1, 1, 1), 2);
        assert.equal(stub(2), 0);
    });

    it("should work with combination of withArgs arguments", () => {
        const stub = createStub();

        stub.withArgs(1).returns(42);
        stub(1);

        assert.isNotNull(stub.withArgs(1).firstCall);
    });

    describe(".returns", () => {
        it("returns specified value", () => {
            const stub = createStub.create();
            const object = {};
            stub.returns(object);

            assert.equal(stub(), object);
        });

        it("returns should return stub", () => {
            const stub = createStub.create();

            assert.equal(stub.returns(""), stub);
        });

        it("returns undefined", () => {
            const stub = createStub.create();

            assert.isUndefined(stub());
        });

        it("supersedes previous throws", () => {
            const stub = createStub.create();
            stub.throws().returns(1);

            assert.doesNotThrow(() => {
                stub();
            });
        });

        it("throws only on the first call", () => {
            const stub = createStub.create();
            stub.returns("no error");
            stub.onFirstCall().throws();

            assert.throws(() => {
                stub();
            });

            // on the second call there is no error
            assert.equal(stub(), "no error");
        });
    });

    describe(".resolves", () => {
        afterEach(() => {
            if (Promise.resolve.restore) {
                Promise.resolve.restore();
            }
        });

        it("returns a promise to the specified value", () => {
            const stub = createStub.create();
            const object = {};
            stub.resolves(object);

            return stub().then((actual) => {
                assert.equal(actual, object);
            });
        });

        it("should return the same stub", () => {
            const stub = createStub.create();

            assert.equal(stub.resolves(""), stub);
        });

        it("supersedes previous throws", () => {
            const stub = createStub.create();
            stub.throws().resolves(1);

            assert.doesNotThrow(() => {
                stub();
            });
        });

        it("supersedes previous rejects", () => {
            const stub = createStub.create();
            stub.rejects(Error("should be superseeded")).resolves(1);

            return stub().then();
        });

        it("can be superseded by returns", () => {
            const stub = createStub.create();
            stub.resolves(2).returns(1);

            assert.equal(stub(), 1);
        });

        it("does not invoke Promise.resolve when the behavior is added to the stub", () => {
            const resolveSpy = createSpy(Promise, "resolve");
            const stub = createStub.create();
            stub.resolves(2);

            assert.equal(resolveSpy.callCount, 0);
        });
    });

    describe(".rejects", () => {
        afterEach(() => {
            if (Promise.reject.restore) {
                Promise.reject.restore();
            }
        });

        it("returns a promise which rejects for the specified reason", () => {
            const stub = createStub.create();
            const reason = new Error();
            stub.rejects(reason);

            return stub().then(() => {
                assert.fail("this should not resolve");
            }).catch((actual) => {
                assert.equal(actual, reason);
            });
        });

        it("should return the same stub", () => {
            const stub = createStub.create();

            assert.equal(stub.rejects({}), stub);
        });

        it("specifies error message", () => {
            const stub = createStub.create();
            const message = "Oh no!";
            stub.rejects("Error", message);

            return stub().then(() => {
                assert.fail("Expected stub to reject");
            }).catch((reason) => {
                assert.equal(reason.message, message);
            });
        });

        it("does not specify error message if not provided", () => {
            const stub = createStub.create();
            stub.rejects("Error");

            return stub().then(() => {
                assert.fail("Expected stub to reject");
            }).catch((reason) => {
                assert.equal(reason.message, "");
            });
        });

        it("rejects for a generic reason", () => {
            const stub = createStub.create();
            stub.rejects();

            return stub().then(() => {
                assert.fail("Expected stub to reject");
            }).catch((reason) => {
                assert.equal(reason.name, "Exception");
            });
        });

        it("can be superseded by returns", () => {
            const stub = createStub.create();
            stub.rejects(2).returns(1);

            assert.equal(stub(), 1);
        });

        it("does not invoke Promise.reject when the behavior is added to the stub", () => {
            const rejectSpy = createSpy(Promise, "reject");
            const stub = createStub.create();
            stub.rejects(2);

            assert.equal(rejectSpy.callCount, 0);
        });
    });

    describe(".resolvesThis", () => {
        afterEach(() => {
            if (Promise.resolve.restore) {
                Promise.resolve.restore();
            }
        });

        it("returns a promise resolved with this", () => {
            const instance = {};
            instance.stub = createStub.create();
            instance.stub.resolvesThis();

            return instance.stub().then((actual) => {
                assert.equal(actual, instance);
            });
        });

        it("returns a promise resolved with the context bound with stub#call", () => {
            const stub = createStub.create();
            stub.resolvesThis();
            const object = {};

            return stub.call(object).then((actual) => {
                assert.equal(actual, object);
            });
        });

        it("returns a promise resolved with the context bound with stub#apply", () => {
            const stub = createStub.create();
            stub.resolvesThis();
            const object = {};

            return stub.apply(object).then((actual) => {
                assert.equal(actual, object);
            });
        });

        it("returns the stub itself, allowing to chain function calls", () => {
            const stub = createStub.create();

            assert.equal(stub.resolvesThis(), stub);
        });

        it("overrides throws behavior for error objects", () => {
            const instance = {};
            instance.stub = createStub.create().throws(new Error()).resolvesThis();

            return instance.stub().then((actual) => {
                assert.equal(actual, instance);
            });
        });

        it("overrides throws behavior for dynamically created errors", () => {
            const instance = {};
            instance.stub = createStub.create().throws().resolvesThis();

            return instance.stub().then((actual) => {
                assert.equal(actual, instance);
            });
        });
    });

    describe(".returnsArg", () => {
        it("returns argument at specified index", () => {
            const stub = createStub.create();
            stub.returnsArg(0);
            const object = {};

            assert.equal(stub(object), object);
        });

        it("returns stub", () => {
            const stub = createStub.create();

            assert.equal(stub.returnsArg(0), stub);
        });

        it("throws if no index is specified", () => {
            const stub = createStub.create();

            assert.throws(() => {
                stub.returnsArg();
            }, error.InvalidArgumentException);
        });
    });

    describe(".throwsArg", () => {
        it("throws argument at specified index", () => {
            const stub = createStub.create();
            stub.throwsArg(0);
            const expectedError = new Error("The expected error message");

            assert.throws(() => {
                stub(expectedError);
            }, expectedError);
        });

        it("returns stub", () => {
            const stub = createStub.create();

            assert.equal(stub.throwsArg(0), stub);
        });

        it("throws TypeError if no index is specified", () => {
            const stub = createStub.create();

            assert.throws(() => {
                stub.throwsArg();
            }, error.InvalidArgumentException);
        });

        it("should throw without enough arguments", () => {
            const stub = createStub.create();
            stub.throwsArg(3);

            assert.throws(
                () => {
                    stub("only", "two arguments");
                },
                error.InvalidArgumentException,
                "throwArgs failed: 3 arguments required but only 2 present"
            );

        });

        it("should work with call-based behavior", () => {
            const stub = createStub.create();
            const expectedError = new Error("catpants");

            stub.returns(1);
            stub.onSecondCall().throwsArg(1);

            assert.doesNotThrow(() => {
                assert.equal(1, stub(null, expectedError));
            });

            assert.throws(
                () => {
                    stub(null, expectedError);
                },
                expectedError.message
            );
        });

        it("should be reset by .resetBeahvior", () => {
            const stub = createStub.create();

            stub.throwsArg(0);
            stub.resetBehavior();

            assert.doesNotThrow(() => {
                stub(new Error("catpants"));
            });
        });
    });

    describe(".returnsThis", () => {
        it("stub returns this", () => {
            const instance = {};
            instance.stub = createStub.create();
            instance.stub.returnsThis();

            assert.equal(instance.stub(), instance);
        });

        const strictMode = is.undefined(function () {
            return this;
        }());
        if (strictMode) {
            it("stub returns undefined when detached", () => {
                const stub = createStub.create();
                stub.returnsThis();

                // Due to strict mode, would be `global` otherwise
                assert.equal(stub(), undefined);
            });
        }

        it("stub respects call/apply", () => {
            const stub = createStub.create();
            stub.returnsThis();
            const object = {};

            assert.equal(stub.call(object), object);
            assert.equal(stub.apply(object), object);
        });

        it("returns stub", () => {
            const stub = createStub.create();

            assert.equal(stub.returnsThis(), stub);
        });
    });

    describe(".usingPromise", () => {
        it("should exist and be a function", () => {
            const stub = createStub.create();

            assert(stub.usingPromise);
            assert.isFunction(stub.usingPromise);
        });

        it("should return the current stub", () => {
            const stub = createStub.create();

            assert.equal(stub.usingPromise(Promise), stub);
        });

        it("should set the promise used by resolve", () => {
            const stub = createStub.create();
            const promise = {
                resolve: createStub.create().callsFake((value) => {
                    return Promise.resolve(value);
                })
            };
            const object = {};

            stub.usingPromise(promise).resolves(object);

            return stub().then((actual) => {
                assert.equal(actual, object, "Same object resolved");
                assert.isTrue(promise.resolve.calledOnce, "Custom promise resolve called once");
                assert.isTrue(promise.resolve.calledWith(object), "Custom promise resolve called once with expected");
            });
        });

        it("should set the promise used by reject", () => {
            const stub = createStub.create();
            const promise = {
                reject: createStub.create().callsFake((err) => {
                    return Promise.reject(err);
                })
            };
            const reason = new Error();

            stub.usingPromise(promise).rejects(reason);

            return stub().then(() => {
                assert.fail("this should not resolve");
            }).catch((actual) => {
                assert.equal(actual, reason, "Same object resolved");
                assert.isTrue(promise.reject.calledOnce, "Custom promise reject called once");
                assert.isTrue(promise.reject.calledWith(reason), "Custom promise reject called once with expected");
            });
        });
    });

    describe(".throws", () => {
        it("throws specified error", () => {
            const stub = createStub.create();
            const error = new Error();
            stub.throws(error);

            assert.throws(stub, error);
        });

        it("returns stub", () => {
            const stub = createStub.create();

            assert.equal(stub.throws({}), stub);
        });

        it("sets type of error to throw", () => {
            const stub = createStub.create();
            stub.throws(TypeError);

            assert.throws(() => {
                stub();
            }, TypeError);
        });

        it("specifies error message", () => {
            const stub = createStub.create();
            const message = "Oh no!";
            stub.throws("Error", message);

            assert.throws(stub, message);
        });

        it("does not specify error message if not provided", () => {
            const stub = createStub.create();
            stub.throws("Error");

            assert.throws(stub, "");
        });

        it("throws generic error", () => {
            const stub = createStub.create();
            stub.throws();

            assert.throws(stub, "Error");
        });

        it("resets 'invoking' flag", () => {
            const stub = createStub.create();
            stub.throws();

            assert.throws(stub);

            assert.isUndefined(stub.invoking);
        });

        it("throws an error created using a function", () => {
            const stub = createStub.create();

            stub.throws(() => {
                return new Error("not implemented");
            });

            assert.throws(stub, "not implemented");
            assert.equal(stub.firstCall.error.message, "not implemented");
            assert.include(stub.firstCall.toString(), "not implemented");
        });

        describe("lazy instantiation of exceptions", () => {
            let errorSpy;
            beforeEach(function () {
                this.originalError = global.Error;
                errorSpy = createSpy(global, "Error");
                // errorSpy starts with a call already made, not sure why
                errorSpy.resetHistory();
            });

            afterEach(function () {
                errorSpy.restore();
                global.Error = this.originalError;
            });

            it("uses a lazily created error for the generic error", () => {
                const stub = createStub.create();
                stub.throws();

                assert.isFalse(errorSpy.called);
                assert.throws(stub, "Error");
                assert.isTrue(errorSpy.called);
            });

            it("uses a lazily created error for the named error", () => {
                const stub = createStub.create();
                stub.throws("TypeError", "typeerror message");

                assert.isFalse(errorSpy.called);
                assert.throws(stub, "typeerror message");
                assert.isTrue(errorSpy.called);
            });

            it("uses a lazily created error provided by a function", () => {
                const stub = createStub.create();

                stub.throws(() => {
                    return new Error("not implemented");
                });

                assert.isFalse(errorSpy.called);
                assert.throws(stub, "not implemented");
                assert.isTrue(errorSpy.called);
            });

            it("does not use a lazily created error if the error object is provided", () => {
                const stub = createStub.create();
                const error = new Error();
                stub.throws(error);

                assert.equal(errorSpy.callCount, 1);
                assert.throws(stub, error);
                assert.equal(errorSpy.callCount, 1);
            });
        });
    });

    describe(".callsArg", () => {
        beforeEach(function () {
            this.stub = createStub.create();
        });

        it("calls argument at specified index", function () {
            this.stub.callsArg(2);
            const callback = createStub.create();

            this.stub(1, 2, callback);

            assert(callback.called);
        });

        it("returns stub", function () {
            assert.isFunction(this.stub.callsArg(2));
        });

        it("throws if argument at specified index is not callable", function () {
            this.stub.callsArg(0);

            assert.throws(() => {
                this.stub(1);
            }, error.InvalidArgumentException, "argument at index 0 is not a function: 1");
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArg();
            }, error.InvalidArgumentException);
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArg({});
            }, error.InvalidArgumentException);
        });
    });

    describe(".callsArgWith", () => {
        beforeEach(function () {
            this.stub = createStub.create();
        });

        it("calls argument at specified index with provided args", function () {
            const object = {};
            this.stub.callsArgWith(1, object);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object));
        });

        it("returns function", function () {
            const stub = this.stub.callsArgWith(2, 3);

            assert.isFunction(stub);
        });

        it("calls callback without args", function () {
            this.stub.callsArgWith(1);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith());
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            this.stub.callsArgWith(1, object, array);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object, array));
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArgWith();
            }, error.InvalidArgumentException);
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArgWith({});
            }, error.InvalidArgumentException);
        });
    });

    describe(".callsArgOn", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = {
                foo: "bar"
            };
        });

        it("calls argument at specified index", function () {
            this.stub.callsArgOn(2, this.fakeContext);
            const callback = createStub.create();

            this.stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(this.fakeContext));
        });

        it("calls argument at specified index with undefined context", function () {
            this.stub.callsArgOn(2, undefined);
            const callback = createStub.create();

            this.stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with number context", function () {
            this.stub.callsArgOn(2, 5);
            const callback = createStub.create();

            this.stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(5));
        });

        it("returns stub", function () {
            const stub = this.stub.callsArgOn(2, this.fakeContext);

            assert.isFunction(stub);
        });

        it("throws if argument at specified index is not callable", function () {
            this.stub.callsArgOn(0, this.fakeContext);

            assert.throws(() => {
                this.stub(1);
            }, error.InvalidArgumentException);
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArgOn();
            }, error.InvalidArgumentException);
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArgOn(this.fakeContext, 2);
            }, error.InvalidArgumentException);
        });
    });

    describe(".callsArgOnWith", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = { foo: "bar" };
        });

        it("calls argument at specified index with provided args", function () {
            const object = {};
            this.stub.callsArgOnWith(1, this.fakeContext, object);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(this.fakeContext));
        });

        it("calls argument at specified index with provided args and undefined context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, undefined, object);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with provided args and number context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, 5, object);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(5));
        });

        it("calls argument at specified index with provided args with undefined context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, undefined, object);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with provided args with number context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, 5, object);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(5));
        });

        it("returns function", function () {
            const stub = this.stub.callsArgOnWith(2, this.fakeContext, 3);

            assert.isFunction(stub);
        });

        it("calls callback without args", function () {
            this.stub.callsArgOnWith(1, this.fakeContext);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith());
            assert(callback.calledOn(this.fakeContext));
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            this.stub.callsArgOnWith(1, this.fakeContext, object, array);
            const callback = createStub.create();

            this.stub(1, callback);

            assert(callback.calledWith(object, array));
            assert(callback.calledOn(this.fakeContext));
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArgOnWith();
            }, error.InvalidArgumentException);
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.throws(() => {
                stub.callsArgOnWith({});
            }, error.InvalidArgumentException);
        });
    });

    describe(".callsFake", () => {
        beforeEach(function () {
            this.method = function () {
                throw new Error("Should be stubbed");
            };
            this.object = { method: this.method };
        });

        it("uses provided function as stub", function () {
            const fakeFn = createStub.create();
            this.stub = createStub(this.object, "method");

            this.stub.callsFake(fakeFn);
            this.object.method(1, 2);

            assert(fakeFn.calledWith(1, 2));
            assert(fakeFn.calledOn(this.object));
        });

        it("is overwritten by subsequent stub behavior", function () {
            const fakeFn = createStub.create();
            this.stub = createStub(this.object, "method");

            this.stub.callsFake(fakeFn).returns(3);
            const returned = this.object.method(1, 2);

            assert(!fakeFn.called);
            assert(returned === 3);
        });
    });

    describe(".objectMethod", () => {
        beforeEach(function () {
            this.method = function () { };
            this.object = { method: this.method };
        });

        afterEach(() => {
            if (global.console.info.restore) {
                global.console.info.restore();
            }
        });

        it("throws if third argument is provided", function () {
            const object = this.object;

            assert.throws(() => {
                createStub(object, "method", 1);
            });
        });

        it("stubbed method should be proper stub", function () {
            const stub = createStub(this.object, "method");

            assert.isFunction(stub.returns);
            assert.isFunction(stub.throws);
        });

        it("stub should be spy", function () {
            const stub = createStub(this.object, "method");
            this.object.method();

            assert(stub.called);
            assert(stub.calledOn(this.object));
        });

        it("stub should affect spy", function () {
            const stub = createStub(this.object, "method");
            stub.throws("TypeError");

            assert.throws(this.object.method);

            assert(stub.threw("TypeError"));
        });

        it("handles threw properly for lazily instantiated Errors", function () {
            const stub = createStub(this.object, "method");
            stub.throws(() => {
                return new TypeError();
            });

            assert.throws(this.object.method);

            assert(stub.threw("TypeError"));
        });

        it("returns standalone stub without arguments", () => {
            const stub = createStub();

            assert.isFunction(stub);
            assert.isFalse(stub.called);
        });

        it("successfully stubs falsey properties", () => {
            const obj = { 0() { } };

            createStub(obj, 0).callsFake(() => {
                return "stubbed value";
            });

            assert.equal(obj[0](), "stubbed value");
        });

        it("does not stub function object", () => {
            assert.throws(() => {
                createStub(() => { });
            });
        });
    });

    describe("everything", () => {
        it("stubs all methods of object without property", () => {
            const obj = {
                func1() { },
                func2() { },
                func3() { }
            };

            createStub(obj);

            assert.isFunction(obj.func1.restore);
            assert.isFunction(obj.func2.restore);
            assert.isFunction(obj.func3.restore);
        });

        it("stubs prototype methods", () => {
            const Obj = function () { };
            Obj.prototype.func1 = function () { };
            const obj = new Obj();

            createStub(obj);

            assert.isFunction(obj.func1.restore);
        });

        it("returns object", () => {
            const object = {};

            assert.equal(createStub(object), object);
        });

        it("only stubs functions", () => {
            const object = { foo: "bar" };
            createStub(object);

            assert.equal(object.foo, "bar");
        });

        it("handles non-enumerable properties", () => {
            const obj = {
                func1() { },
                func2() { }
            };

            Object.defineProperty(obj, "func3", {
                value() { },
                writable: true,
                configurable: true
            });

            createStub(obj);

            assert.isFunction(obj.func1.restore);
            assert.isFunction(obj.func2.restore);
            assert.isFunction(obj.func3.restore);
        });

        it("handles non-enumerable properties on prototypes", () => {
            const Obj = function () { };
            Object.defineProperty(Obj.prototype, "func1", {
                value() { },
                writable: true,
                configurable: true
            });

            const obj = new Obj();

            createStub(obj);

            assert.isFunction(obj.func1.restore);
        });

        it("does not stub non-enumerable properties from Object.prototype", () => {
            const obj = {};

            createStub(obj);

            assert.notFunction(obj.toString.restore);
            assert.notFunction(obj.toLocaleString.restore);
            assert.notFunction(obj.propertyIsEnumerable.restore);
        });

        it("does not fail on overrides", () => {
            const parent = {
                func() { }
            };
            const child = Object.create(parent);
            child.func = function () { };

            assert.doesNotThrow(() => {
                createStub(child);
            });
        });

        it("does not call getter during restore", () => {
            const obj = {
                get prop() {
                    assert.fail("should not call getter");
                }
            };

            const stub = createStub(obj, "prop").get(() => {
                return 43;
            });

            assert.equal(obj.prop, 43);

            stub.restore();
        });

        it("throws if stubbing non-existent property", () => {
            const myObj = {};

            assert.throws(() => {
                createStub(myObj, "ouch");
            });

            assert.isUndefined(myObj.ouch);
        });
    });

    describe("stubbed function", () => {
        it("has toString method", () => {
            const obj = { meth() { } };
            createStub(obj, "meth");

            assert.equal(obj.meth.toString(), "meth");
        });

        it("toString should say 'stub' when unable to infer name", () => {
            const stub = createStub();

            assert.equal(stub.toString(), "stub");
        });

        it("toString should prefer property name if possible", () => {
            const obj = {};
            obj.meth = createStub();
            obj.meth();

            assert.equal(obj.meth.toString(), "meth");
        });
    });

    describe(".yields", () => {
        it("invokes only argument as callback", () => {
            const stub = createStub().yields();
            const spy = createSpy();
            stub(spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", () => {
            const stub = createStub().yields();

            assert.throws(stub, "stub expected to yield, but no callback was passed.");
        });

        it("includes stub name and actual arguments in error", () => {
            const myObj = { somethingAwesome() { } };
            const stub = createStub(myObj, "somethingAwesome").yields();

            assert.throws(
                () => {
                    stub(23, 42);
                },
                "somethingAwesome expected to yield, but no callback was passed. Received [23, 42]"
            );
        });

        it("invokes last argument as callback", () => {
            const stub = createStub().yields();
            const spy = createSpy();
            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", () => {
            const stub = createStub().yields();
            const spy = createSpy();
            const spy2 = createSpy();
            stub(24, {}, spy, spy2);

            assert(spy.calledOnce);
            assert(!spy2.called);
        });

        it("invokes callback with arguments", () => {
            const obj = { id: 42 };
            const stub = createStub().yields(obj, "Crazy");
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", () => {
            const obj = { id: 42 };
            const stub = createStub().yields(obj, "Crazy");
            const callback = createStub().throws();

            assert.throws(() => {
                stub(callback);
            });
        });

        it("plays nice with throws", () => {
            const stub = createStub().throws().yields();
            const spy = createSpy();
            assert.throws(() => {
                stub(spy);
            });
            assert(spy.calledOnce);
        });

        it("plays nice with returns", () => {
            const obj = {};
            const stub = createStub().returns(obj).yields();
            const spy = createSpy();
            assert.equal(stub(spy), obj);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsArg", () => {
            const stub = createStub().returnsArg(0).yields();
            const spy = createSpy();
            assert.equal(stub(spy), spy);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsThis", () => {
            const obj = {};
            const stub = createStub().returnsThis().yields();
            const spy = createSpy();
            assert.equal(stub.call(obj, spy), obj);
            assert(spy.calledOnce);
        });
    });

    describe(".yieldsRight", () => {
        it("invokes only argument as callback", () => {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            stub(spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", () => {
            const stub = createStub().yieldsRight();

            assert.throws(stub, "stub expected to yield, but no callback was passed.");
        });

        it("includes stub name and actual arguments in error", () => {
            const myObj = { somethingAwesome() { } };
            const stub = createStub(myObj, "somethingAwesome").yieldsRight();

            assert.throws(
                () => {
                    stub(23, 42);
                },
                "somethingAwesome expected to yield, but no callback was passed. Received [23, 42]"
            );
        });

        it("invokes last argument as callback", () => {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes the last of two callbacks", () => {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            const spy2 = createSpy();
            stub(24, {}, spy, spy2);

            assert(!spy.called);
            assert(spy2.calledOnce);
        });

        it("invokes callback with arguments", () => {
            const obj = { id: 42 };
            const stub = createStub().yieldsRight(obj, "Crazy");
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", () => {
            const obj = { id: 42 };
            const stub = createStub().yieldsRight(obj, "Crazy");
            const callback = createStub().throws();

            assert.throws(() => {
                stub(callback);
            });
        });

        it("plays nice with throws", () => {
            const stub = createStub().throws().yieldsRight();
            const spy = createSpy();
            assert.throws(() => {
                stub(spy);
            });
            assert(spy.calledOnce);
        });

        it("plays nice with returns", () => {
            const obj = {};
            const stub = createStub().returns(obj).yieldsRight();
            const spy = createSpy();
            assert.equal(stub(spy), obj);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsArg", () => {
            const stub = createStub().returnsArg(0).yieldsRight();
            const spy = createSpy();
            assert.equal(stub(spy), spy);
            assert(spy.calledOnce);
        });

        it("plays nice with returnsThis", () => {
            const obj = {};
            const stub = createStub().returnsThis().yieldsRight();
            const spy = createSpy();
            assert.equal(stub.call(obj, spy), obj);
            assert(spy.calledOnce);
        });
    });

    describe(".yieldsOn", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = { foo: "bar" };
        });

        it("invokes only argument as callback", function () {
            const spy = createSpy();

            this.stub.yieldsOn(this.fakeContext);
            this.stub(spy);

            assert(spy.calledOnce);
            assert(spy.calledOn(this.fakeContext));
            assert.equal(spy.args[0].length, 0);
        });

        it("throws if no context is specified", function () {
            assert.throws(() => {
                this.stub.yieldsOn();
            }, error.InvalidArgumentException);
        });

        it("throws understandable error if no callback is passed", function () {
            this.stub.yieldsOn(this.fakeContext);

            assert.throws(this.stub, "stub expected to yield, but no callback was passed.");
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome() { } };
            const stub = createStub(myObj, "somethingAwesome").yieldsOn(this.fakeContext);

            assert.throws(
                () => {
                    stub(23, 42);
                },
                "somethingAwesome expected to yield, but no callback was passed. Received [23, 42]"
            );
        });

        it("invokes last argument as callback", function () {
            const spy = createSpy();
            this.stub.yieldsOn(this.fakeContext);

            this.stub(24, {}, spy);

            assert(spy.calledOnce);
            assert(spy.calledOn(this.fakeContext));
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const spy = createSpy();
            const spy2 = createSpy();

            this.stub.yieldsOn(this.fakeContext);
            this.stub(24, {}, spy, spy2);

            assert(spy.calledOnce);
            assert(spy.calledOn(this.fakeContext));
            assert(!spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = createSpy();

            this.stub.yieldsOn(this.fakeContext, obj, "Crazy");
            this.stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(this.fakeContext));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const callback = createStub().throws();

            this.stub.yieldsOn(this.fakeContext, obj, "Crazy");

            assert.throws(function () {
                this.stub(callback);
            });
        });
    });

    describe(".yieldsTo", () => {
        it("yields to property of object argument", () => {
            const stub = createStub().yieldsTo("success");
            const callback = createSpy();

            stub({ success: callback });

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no object with callback is passed", () => {
            const stub = createStub().yieldsTo("success");

            assert.throws(stub, "stub expected to yield to 'success', but no object with such a property was passed.");
        });

        it("throws understandable error if failing to yield callback by symbol", () => {
            if (is.function(Symbol)) {
                const symbol = Symbol();

                const stub = createStub().yieldsTo(symbol);

                assert.throws(stub, "stub expected to yield to 'Symbol()', but no object with such a property was passed.");
            }
        });

        it("includes stub name and actual arguments in error", () => {
            const myObj = { somethingAwesome() { } };
            const stub = createStub(myObj, "somethingAwesome").yieldsTo("success");

            assert.throws(
                () => {
                    stub(23, 42);
                },
                "somethingAwesome expected to yield to 'success', but no object with such a property was passed. Received [23, 42]"
            );
        });

        it("invokes property on last argument as callback", () => {
            const stub = createStub().yieldsTo("success");
            const callback = createSpy();
            stub(24, {}, { success: callback });

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", () => {
            const stub = createStub().yieldsTo("error");
            const callback = createSpy();
            const callback2 = createSpy();
            stub(24, {}, { error: callback }, { error: callback2 });

            assert(callback.calledOnce);
            assert(!callback2.called);
        });

        it("invokes callback with arguments", () => {
            const obj = { id: 42 };
            const stub = createStub().yieldsTo("success", obj, "Crazy");
            const callback = createSpy();
            stub({ success: callback });

            assert(callback.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", () => {
            const obj = { id: 42 };
            const stub = createStub().yieldsTo("error", obj, "Crazy");
            const callback = createStub().throws();

            assert.throws(() => {
                stub({ error: callback });
            });
        });
    });

    describe(".yieldsToOn", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = { foo: "bar" };
        });

        it("yields to property of object argument", function () {
            this.stub.yieldsToOn("success", this.fakeContext);
            const callback = createSpy();

            this.stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
            assert.equal(callback.args[0].length, 0);
        });

        it("yields to property of object argument with undefined context", function () {
            this.stub.yieldsToOn("success", undefined);
            const callback = createSpy();

            this.stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(undefined));
            assert.equal(callback.args[0].length, 0);
        });

        it("yields to property of object argument with number context", function () {
            this.stub.yieldsToOn("success", 5);
            const callback = createSpy();

            this.stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(5));
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no object with callback is passed", function () {
            this.stub.yieldsToOn("success", this.fakeContext);

            assert.throws(this.stub, "stub expected to yield to 'success', but no object with such a property was passed.");
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = { somethingAwesome() { } };
            const stub = createStub(myObj, "somethingAwesome").yieldsToOn("success", this.fakeContext);

            assert.throws(
                () => {
                    stub(23, 42);
                },
                "somethingAwesome expected to yield to 'success', but no object with such a property was passed. Received [23, 42]"
            );
        });

        it("invokes property on last argument as callback", function () {
            const callback = createSpy();

            this.stub.yieldsToOn("success", this.fakeContext);
            this.stub(24, {}, { success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
            assert.equal(callback.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const callback = createSpy();
            const callback2 = createSpy();

            this.stub.yieldsToOn("error", this.fakeContext);
            this.stub(24, {}, { error: callback }, { error: callback2 });

            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
            assert(!callback2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const callback = createSpy();

            this.stub.yieldsToOn("success", this.fakeContext, obj, "Crazy");
            this.stub({ success: callback });

            assert(callback.calledOn(this.fakeContext));
            assert(callback.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const callback = createStub().throws();

            this.stub.yieldsToOn("error", this.fakeContext, obj, "Crazy");

            assert.throws(function () {
                this.stub({ error: callback });
            });
        });
    });

    describe(".withArgs", () => {
        it("defines withArgs method", () => {
            const stub = createStub();

            assert.isFunction(stub.withArgs);
        });

        it("creates filtered stub", () => {
            const stub = createStub();
            const other = stub.withArgs(23);

            assert.notEqual(other, stub);
            assert.isFunction(stub.returns);
            assert.isFunction(other.returns);
        });

        it("filters return values based on arguments", () => {
            const stub = createStub().returns(23);
            stub.withArgs(42).returns(99);

            assert.equal(stub(), 23);
            assert.equal(stub(42), 99);
        });

        it("filters exceptions based on arguments", () => {
            const stub = createStub().returns(23);
            stub.withArgs(42).throws();

            assert.doesNotThrow(stub);
            assert.throws(() => {
                stub(42);
            });
        });

        it("ensure stub recognizes match fuzzy arguments", () => {
            const stub = createStub().returns(23);
            stub.withArgs(match({ foo: "bar" })).returns(99);

            assert.equal(stub(), 23);
            assert.equal(stub({ foo: "bar", bar: "foo" }), 99);
        });

        it("ensure stub uses last matching arguments", () => {
            const unmatchedValue = "d3ada6a0-8dac-4136-956d-033b5f23eadf";
            const firstMatchedValue = "68128619-a639-4b32-a4a0-6519165bf301";
            const secondMatchedValue = "4ac2dc8f-3f3f-4648-9838-a2825fd94c9a";
            const expectedArgument = "3e1ed1ec-c377-4432-a33e-3c937f1406d1";

            const stub = createStub().returns(unmatchedValue);

            stub.withArgs(expectedArgument).returns(firstMatchedValue);
            stub.withArgs(expectedArgument).returns(secondMatchedValue);

            assert.equal(stub(), unmatchedValue);
            assert.equal(stub(expectedArgument), secondMatchedValue);
        });

        it("ensure stub uses last matching match arguments", () => {
            const unmatchedValue = "0aa66a7d-3c50-49ef-8365-bdcab637b2dd";
            const firstMatchedValue = "1ab2c601-7602-4658-9377-3346f6814caa";
            const secondMatchedValue = "e2e31518-c4c4-4012-a61f-31942f603ffa";
            const expectedArgument = "90dc4a22-ef53-4c62-8e05-4cf4b4bf42fa";

            const stub = createStub().returns(unmatchedValue);
            stub.withArgs(expectedArgument).returns(firstMatchedValue);
            stub.withArgs(match(expectedArgument)).returns(secondMatchedValue);

            assert.equal(stub(), unmatchedValue);
            assert.equal(stub(expectedArgument), secondMatchedValue);
        });
    });

    describe(".callsArgAsync", () => {
        beforeEach(function () {
            this.stub = createStub.create();
        });

        it("asynchronously calls argument at specified index", function (done) {
            this.stub.callsArgAsync(2);
            const callback = createSpy(done);

            this.stub(1, 2, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgWithAsync", () => {
        beforeEach(function () {
            this.stub = createStub.create();
        });

        it("asynchronously calls callback at specified index with multiple args", function (done) {
            const object = {};
            const array = [];
            this.stub.callsArgWithAsync(1, object, array);

            const callback = createSpy(() => {
                assert(callback.calledWith(object, array));
                done();
            });

            this.stub(1, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgOnAsync", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = {
                foo: "bar"
            };
        });

        it("asynchronously calls argument at specified index with specified context", function (done) {
            const context = this.fakeContext;
            this.stub.callsArgOnAsync(2, context);

            const callback = createSpy(() => {
                assert(callback.calledOn(context));
                done();
            });

            this.stub(1, 2, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgOnWithAsync", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = { foo: "bar" };
        });

        it("asynchronously calls argument at specified index with provided context and args", function (done) {
            const object = {};
            const context = this.fakeContext;
            this.stub.callsArgOnWithAsync(1, context, object);

            const callback = createSpy(() => {
                assert(callback.calledOn(context));
                assert(callback.calledWith(object));
                done();
            });

            this.stub(1, callback);

            assert(!callback.called);
        });
    });

    describe(".yieldsAsync", () => {
        it("asynchronously invokes only argument as callback", (done) => {
            const stub = createStub().yieldsAsync();

            const spy = createSpy(done);

            stub(spy);

            assert(!spy.called);
        });
    });

    describe(".yieldsOnAsync", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = { foo: "bar" };
        });

        it("asynchronously invokes only argument as callback with given context", function (done) {
            const context = this.fakeContext;
            this.stub.yieldsOnAsync(context);

            const spy = createSpy(() => {
                assert(spy.calledOnce);
                assert(spy.calledOn(context));
                assert.equal(spy.args[0].length, 0);
                done();
            });

            this.stub(spy);

            assert(!spy.called);
        });
    });

    describe(".yieldsToAsync", () => {
        it("asynchronously yields to property of object argument", (done) => {
            const stub = createStub().yieldsToAsync("success");

            const callback = createSpy(() => {
                assert(callback.calledOnce);
                assert.equal(callback.args[0].length, 0);
                done();
            });

            stub({ success: callback });

            assert(!callback.called);
        });
    });

    describe(".yieldsToOnAsync", () => {
        beforeEach(function () {
            this.stub = createStub.create();
            this.fakeContext = { foo: "bar" };
        });

        it("asynchronously yields to property of object argument with given context", function (done) {
            const context = this.fakeContext;
            this.stub.yieldsToOnAsync("success", context);

            const callback = createSpy(() => {
                assert(callback.calledOnce);
                assert(callback.calledOn(context));
                assert.equal(callback.args[0].length, 0);
                done();
            });

            this.stub({ success: callback });
            assert(!callback.called);
        });
    });

    describe(".onCall", () => {
        it("can be used with returns to produce sequence", () => {
            const stub = createStub().returns(3);
            stub.onFirstCall().returns(1)
                .onCall(2).returns(2);

            assert.equal(stub(), 1);
            assert.equal(stub(), 3);
            assert.equal(stub(), 2);
            assert.equal(stub(), 3);
        });

        it("can be used with returnsArg to produce sequence", () => {
            const stub = createStub().returns("default");
            stub.onSecondCall().returnsArg(0);

            assert.equal(stub(1), "default");
            assert.equal(stub(2), 2);
            assert.equal(stub(3), "default");
        });

        it("can be used with returnsThis to produce sequence", () => {
            const instance = {};
            instance.stub = createStub().returns("default");
            instance.stub.onSecondCall().returnsThis();

            assert.equal(instance.stub(), "default");
            assert.equal(instance.stub(), instance);
            assert.equal(instance.stub(), "default");
        });

        it("can be used with throwsException to produce sequence", () => {
            const stub = createStub();
            const error = new Error();
            stub.onSecondCall().throwsException(error);

            stub();

            const e = assert.throws(stub);
            assert.equal(e, error);
        });

        it("supports chained declaration of behavior", () => {
            const stub = createStub()
                .onCall(0).returns(1)
                .onCall(1).returns(2)
                .onCall(2).returns(3);

            assert.equal(stub(), 1);
            assert.equal(stub(), 2);
            assert.equal(stub(), 3);
        });

        describe("in combination with withArgs", () => {
            it("can produce a sequence for a fake", () => {
                const stub = createStub().returns(0);
                stub.withArgs(5).returns(-1)
                    .onFirstCall().returns(1)
                    .onSecondCall().returns(2);

                assert.equal(stub(0), 0);
                assert.equal(stub(5), 1);
                assert.equal(stub(0), 0);
                assert.equal(stub(5), 2);
                assert.equal(stub(5), -1);
            });

            it("falls back to stub default behaviour if fake does not have its own default behaviour", () => {
                const stub = createStub().returns(0);
                stub.withArgs(5)
                    .onFirstCall().returns(1);

                assert.equal(stub(5), 1);
                assert.equal(stub(5), 0);
            });

            it("falls back to stub behaviour for call if fake does not have its own behaviour for call", () => {
                const stub = createStub().returns(0);
                stub.withArgs(5).onFirstCall().returns(1);
                stub.onSecondCall().returns(2);

                assert.equal(stub(5), 1);
                assert.equal(stub(5), 2);
                assert.equal(stub(4), 0);
            });

            it("defaults to undefined behaviour once no more calls have been defined", () => {
                const stub = createStub();
                stub.withArgs(5).onFirstCall().returns(1)
                    .onSecondCall().returns(2);

                assert.equal(stub(5), 1);
                assert.equal(stub(5), 2);
                assert.isUndefined(stub(5));
            });

            it("does not create undefined behaviour just by calling onCall", () => {
                const stub = createStub().returns(2);
                stub.onFirstCall();

                assert.equal(stub(6), 2);
            });

            it("works with fakes and reset", () => {
                const stub = createStub();
                stub.withArgs(5).onFirstCall().returns(1);
                stub.withArgs(5).onSecondCall().returns(2);

                assert.equal(stub(5), 1);
                assert.equal(stub(5), 2);
                assert.isUndefined(stub(5));

                stub.reset();

                assert.equal(stub(5), undefined);
                assert.equal(stub(5), undefined);
                assert.isUndefined(stub(5));
            });

            it("throws an understandable error when trying to use withArgs on behavior", () => {
                assert.throws(
                    () => {
                        createStub().onFirstCall().withArgs(1);
                    },
                    /not supported/
                );
            });
        });

        it("can be used with yields* to produce a sequence", () => {
            const context = { foo: "bar" };
            const obj = { method1: createSpy(), method2: createSpy() };
            const obj2 = { method2: createSpy() };
            const stub = createStub().yieldsToOn("method2", context, 7, 8);
            stub.onFirstCall().yields(1, 2)
                .onSecondCall().yieldsOn(context, 3, 4)
                .onThirdCall().yieldsTo("method1", 5, 6)
                .onCall(3).yieldsToOn("method2", context, 7, 8);

            const spy1 = createSpy();
            const spy2 = createSpy();

            stub(spy1);
            stub(spy2);
            stub(obj);
            stub(obj);
            stub(obj2); // should continue with default behavior

            assert(spy1.calledOnce);
            assert(spy1.calledWithExactly(1, 2));

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));
            assert(spy2.calledOn(context));
            assert(spy2.calledWithExactly(3, 4));

            assert(obj.method1.calledOnce);
            assert(obj.method1.calledAfter(spy2));
            assert(obj.method1.calledWithExactly(5, 6));

            assert(obj.method2.calledOnce);
            assert(obj.method2.calledAfter(obj.method1));
            assert(obj.method2.calledOn(context));
            assert(obj.method2.calledWithExactly(7, 8));

            assert(obj2.method2.calledOnce);
            assert(obj2.method2.calledAfter(obj.method2));
            assert(obj2.method2.calledOn(context));
            assert(obj2.method2.calledWithExactly(7, 8));
        });

        it("can be used with callsArg* to produce a sequence", () => {
            const spy1 = createSpy();
            const spy2 = createSpy();
            const spy3 = createSpy();
            const spy4 = createSpy();
            const spy5 = createSpy();
            const decoy = createSpy();
            const context = { foo: "bar" };

            const stub = createStub().callsArgOnWith(3, context, "c", "d");
            stub.onFirstCall().callsArg(0)
                .onSecondCall().callsArgWith(1, "a", "b")
                .onThirdCall().callsArgOn(2, context)
                .onCall(3).callsArgOnWith(3, context, "c", "d");

            stub(spy1);
            stub(decoy, spy2);
            stub(decoy, decoy, spy3);
            stub(decoy, decoy, decoy, spy4);
            stub(decoy, decoy, decoy, spy5); // should continue with default behavior

            assert(spy1.calledOnce);

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));
            assert(spy2.calledWithExactly("a", "b"));

            assert(spy3.calledOnce);
            assert(spy3.calledAfter(spy2));
            assert(spy3.calledOn(context));

            assert(spy4.calledOnce);
            assert(spy4.calledAfter(spy3));
            assert(spy4.calledOn(context));
            assert(spy4.calledWithExactly("c", "d"));

            assert(spy5.calledOnce);
            assert(spy5.calledAfter(spy4));
            assert(spy5.calledOn(context));
            assert(spy5.calledWithExactly("c", "d"));

            assert(decoy.notCalled);
        });

        it("can be used with yields* and callsArg* in combination to produce a sequence", () => {
            const stub = createStub().yields(1, 2);
            stub.onSecondCall().callsArg(1)
                .onThirdCall().yieldsTo("method")
                .onCall(3).callsArgWith(2, "a", "b");

            const obj = { method: createSpy() };
            const spy1 = createSpy();
            const spy2 = createSpy();
            const spy3 = createSpy();
            const decoy = createSpy();

            stub(spy1);
            stub(decoy, spy2);
            stub(obj);
            stub(decoy, decoy, spy3);

            assert(spy1.calledOnce);

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));

            assert(obj.method.calledOnce);
            assert(obj.method.calledAfter(spy2));

            assert(spy3.calledOnce);
            assert(spy3.calledAfter(obj.method));
            assert(spy3.calledWithExactly("a", "b"));

            assert(decoy.notCalled);
        });

        it("should interact correctly with assertions (GH-231)", () => {
            const stub = createStub();
            const spy = createSpy();

            stub.callsArgWith(0, "a");

            stub(spy);
            assert(spy.calledWith("a"));

            stub(spy);
            assert(spy.calledWith("a"));

            stub.onThirdCall().callsArgWith(0, "b");

            stub(spy);
            assert(spy.calledWith("b"));
        });
    });

    describe(".reset", () => {
        it("resets behavior", () => {
            const obj = { a() { } };
            const spy = createSpy();
            createStub(obj, "a").callsArg(1);

            obj.a(null, spy);
            obj.a.reset();
            obj.a(null, spy);

            assert(spy.calledOnce);
        });

        it("resets call history", () => {
            const stub = createStub();

            stub(1);
            stub.reset();
            stub(2);

            assert(stub.calledOnce);
            assert.equal(stub.getCall(0).args[0], 2);
        });
    });

    describe(".resetHistory", () => {
        it("resets history", () => {
            const stub = createStub();

            stub(1);
            stub.reset();
            stub(2);

            assert(stub.calledOnce);
            assert.equal(stub.getCall(0).args[0], 2);
        });

        it("doesn't reset behavior defined using withArgs", () => {
            const stub = createStub();
            stub.withArgs("test").returns(10);

            stub.resetHistory();

            assert.equal(stub("test"), 10);
        });

        it("doesn't reset behavior", () => {
            const stub = createStub();
            stub.returns(10);

            stub.resetHistory();

            assert.equal(stub("test"), 10);
        });
    });

    describe(".resetBehavior", () => {
        it("clears yields* and callsArg* sequence", () => {
            const stub = createStub().yields(1);
            stub.onFirstCall().callsArg(1);
            stub.resetBehavior();
            stub.yields(3);
            const spyWanted = createSpy();
            const spyNotWanted = createSpy();

            stub(spyWanted, spyNotWanted);

            assert(spyNotWanted.notCalled);
            assert(spyWanted.calledOnce);
            assert(spyWanted.calledWithExactly(3));
        });

        it("cleans 'returns' behavior", () => {
            const stub = createStub().returns(1);

            stub.resetBehavior();

            assert.isUndefined(stub());
        });

        it("cleans behavior of fakes returned by withArgs", () => {
            const stub = createStub();
            stub.withArgs("lolz").returns(2);

            stub.resetBehavior();

            assert.isUndefined(stub("lolz"));
        });

        it("does not clean parents' behavior when called on a fake returned by withArgs", () => {
            const parentStub = createStub().returns(false);
            const childStub = parentStub.withArgs("lolz").returns(true);

            childStub.resetBehavior();

            assert.equal(parentStub("lolz"), false);
            assert.equal(parentStub(), false);
        });

        it("cleans 'returnsArg' behavior", () => {
            const stub = createStub().returnsArg(0);

            stub.resetBehavior();

            assert.isUndefined(stub("defined"));
        });

        it("cleans 'returnsThis' behavior", () => {
            const instance = {};
            instance.stub = createStub.create();
            instance.stub.returnsThis();

            instance.stub.resetBehavior();

            assert.isUndefined(instance.stub());
        });

        it("cleans 'resolvesThis' behavior, so the stub does not resolve nor returns anything", () => {
            const instance = {};
            instance.stub = createStub.create();
            instance.stub.resolvesThis();

            instance.stub.resetBehavior();

            expect(instance.stub()).to.be.undefined();
        });

        describe("does not touch properties that are reset by 'reset'", () => {
            it(".calledOnce", () => {
                const stub = createStub();
                stub(1);

                stub.resetBehavior();

                assert(stub.calledOnce);
            });

            it("called multiple times", () => {
                const stub = createStub();
                stub(1);
                stub(2);
                stub(3);

                stub.resetBehavior();

                assert(stub.called);
                assert.equal(stub.args.length, 3);
                assert.equal(stub.returnValues.length, 3);
                assert.equal(stub.exceptions.length, 3);
                assert.equal(stub.thisValues.length, 3);
                assert.exists(stub.firstCall);
                assert.exists(stub.secondCall);
                assert.exists(stub.thirdCall);
                assert.exists(stub.lastCall);
            });

            it("call order state", () => {
                const stubs = [createStub(), createStub()];
                stubs[0]();
                stubs[1]();

                stubs[0].resetBehavior();

                assert(stubs[0].calledBefore(stubs[1]));
            });

            it("fakes returned by withArgs", () => {
                const stub = createStub();
                const fakeA = stub.withArgs("a");
                const fakeB = stub.withArgs("b");
                stub("a");
                stub("b");
                stub("c");
                const fakeC = stub.withArgs("c");

                stub.resetBehavior();

                assert(fakeA.calledOnce);
                assert(fakeB.calledOnce);
                assert(fakeC.calledOnce);
            });
        });
    });

    describe(".length", () => {
        it("is zero by default", () => {
            const stub = createStub();

            assert.equal(stub.length, 0);
        });

        it("matches the function length", () => {
            const api = { someMethod(a, b, c) { } }; // eslint-disable-line no-unused-vars
            const stub = createStub(api, "someMethod");

            assert.equal(stub.length, 3);
        });
    });

    describe(".createStubInstance", () => {
        it("stubs existing methods", () => {
            const Class = function () { };
            Class.prototype.method = function () { };

            const stub = createStubInstance(Class);
            stub.method.returns(3);
            assert.equal(3, stub.method());
        });

        it("doesn't stub fake methods", () => {
            const Class = function () { };

            const stub = createStubInstance(Class);
            assert.throws(() => {
                stub.method.returns(3);
            });
        });

        it("doesn't call the constructor", () => {
            const Class = function (a, b) {
                const c = a + b;
                throw c;
            };
            Class.prototype.method = function () { };

            const stub = createStubInstance(Class);
            assert.doesNotThrow(() => {
                stub.method(3);
            });
        });

        it("retains non function values", () => {
            const TYPE = "some-value";
            const Class = function () { };
            Class.prototype.type = TYPE;

            const stub = createStubInstance(Class);
            assert.equal(TYPE, stub.type);
        });

        it("has no side effects on the prototype", () => {
            const proto = {
                method() {
                    throw new Error("error");
                }
            };
            const Class = function () { };
            Class.prototype = proto;

            const stub = createStubInstance(Class);
            assert.doesNotThrow(stub.method);
            assert.throws(proto.method);
        });

        it("throws error for non function params", () => {
            const types = [{}, 3, "hi!"];

            for (let i = 0; i < types.length; i++) {
                // yes, it's silly to create functions in a loop, it's also a test
                assert.throws(() => { // eslint-disable-line no-loop-func
                    createStubInstance(types[i]);
                });
            }
        });
    });

    describe(".callThrough", () => {
        it("does not call original function when arguments match conditional stub", () => {
            // We need a function here because we can't wrap properties that are already stubs
            let callCount = 0;
            const originalFunc = function () {
                callCount++;
            };

            const myObj = {
                prop: originalFunc
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough();

            const result = myObj.prop("foo");

            assert.equal(result, "bar");
            assert.equal(callCount, 0);
        });

        it("calls original function when arguments do not match conditional stub", () => {
            // We need a function here because we can't wrap properties that are already stubs
            let callCount = 0;

            const originalFunc = function () {
                callCount++;
                return 1337;
            };

            const myObj = {
                prop: originalFunc
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough(propStub);

            const result = myObj.prop("not foo");

            assert.equal(result, 1337);
            assert.equal(callCount, 1);
        });

        it("calls original function with same arguments when call does not match conditional stub", () => {
            // We need a function here because we can't wrap properties that are already stubs
            let callArgs = [];

            const originalFunc = function () {
                callArgs = arguments; // eslint-disable-line prefer-rest-params
            };

            const myObj = {
                prop: originalFunc
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough();

            myObj.prop("not foo");

            assert.equal(callArgs.length, 1);
            assert.equal(callArgs[0], "not foo");
        });

        it("calls original function with same `this` reference when call does not match conditional stub", () => {
            // We need a function here because we can't wrap properties that are already stubs
            let reference = {};

            const originalFunc = function () {
                reference = this;
            };

            const myObj = {
                prop: originalFunc
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough();

            myObj.prop("not foo");

            assert.equal(reference, myObj);
        });
    });

    describe(".get", () => {
        it("allows users to stub getter functions for properties", () => {
            const myObj = {
                prop: "foo"
            };

            createStub(myObj, "prop").get(function getterFn() {
                return "bar";
            });

            assert.equal(myObj.prop, "bar");
        });

        it("allows users to stub getter functions for functions", () => {
            const myObj = {
                prop() {
                    return "foo";
                }
            };

            createStub(myObj, "prop").get(function getterFn() {
                return "bar";
            });

            assert.equal(myObj.prop, "bar");
        });

        it("replaces old getters", () => {
            const myObj = {
                get prop() {
                    assert.fail("should not call the old getter");
                }
            };

            createStub(myObj, "prop").get(function getterFn() {
                return "bar";
            });

            assert.equal(myObj.prop, "bar");
        });

        it("can restore stubbed setters for functions", () => {
            const propFn = function propFn() {
                return "bar";
            };

            const myObj = {
                prop: propFn
            };

            const stub = createStub(myObj, "prop");

            stub.get(function getterFn() {
                return "baz";
            });

            stub.restore();

            assert.equal(myObj.prop, propFn);
        });

        it("can restore stubbed getters for properties", () => {
            const myObj = {
                get prop() {
                    return "bar";
                }
            };

            const stub = createStub(myObj, "prop");

            stub.get(function getterFn() {
                return "baz";
            });

            stub.restore();

            assert.equal(myObj.prop, "bar");
        });
    });

    describe(".set", () => {
        it("allows users to stub setter functions for properties", () => {
            const myObj = {
                prop: "foo"
            };

            createStub(myObj, "prop").set(function setterFn() {
                myObj.example = "bar";
            });

            myObj.prop = "baz";

            assert.equal(myObj.example, "bar");
        });

        it("allows users to stub setter functions for functions", () => {
            const myObj = {
                prop() {
                    return "foo";
                }
            };

            createStub(myObj, "prop").set(function setterFn() {
                myObj.example = "bar";
            });

            myObj.prop = "baz";

            assert.equal(myObj.example, "bar");
        });

        it("replaces old setters", () => {
            const myObj = { // eslint-disable-line accessor-pairs
                set prop(val) {
                    assert.fail("should not call the old setter");
                }
            };

            createStub(myObj, "prop").set(function setterFn() {
                myObj.example = "bar";
            });

            myObj.prop = "foo";

            assert.equal(myObj.example, "bar");
        });

        it("can restore stubbed setters for functions", () => {
            const propFn = function propFn() {
                return "bar";
            };

            const myObj = {
                prop: propFn
            };

            const stub = createStub(myObj, "prop");

            stub.set(function setterFn() {
                myObj.otherProp = "baz";
            });

            stub.restore();

            assert.equal(myObj.prop, propFn);
        });

        it("can restore stubbed setters for properties", () => {
            const myObj = { // eslint-disable-line accessor-pairs
                set prop(val) {
                    this.otherProp = "bar";
                    return "bar";
                }
            };

            const stub = createStub(myObj, "prop");

            stub.set(function setterFn() {
                myObj.otherProp = "baz";
            });

            stub.restore();

            myObj.prop = "foo";
            assert.equal(myObj.otherProp, "bar");
        });
    });

    describe(".value", () => {
        it("allows stubbing property descriptor values", () => {
            const myObj = {
                prop: "rawString"
            };

            createStub(myObj, "prop").value("newString");
            assert.equal(myObj.prop, "newString");
        });

        it("allows restoring stubbed property descriptor values", () => {
            const myObj = {
                prop: "rawString"
            };

            const stub = createStub(myObj, "prop").value("newString");
            stub.restore();

            assert.equal(myObj.prop, "rawString");
        });

        it("allows stubbing function static properties", () => {
            const myFunc = function () { };
            myFunc.prop = "rawString";

            createStub(myFunc, "prop").value("newString");
            assert.equal(myFunc.prop, "newString");
        });

        it("allows restoring function static properties", () => {
            const myFunc = function () { };
            myFunc.prop = "rawString";

            const stub = createStub(myFunc, "prop").value("newString");
            stub.restore();

            assert.equal(myFunc.prop, "rawString");
        });

        it("allows stubbing object props with configurable false", () => {
            const myObj = {};
            Object.defineProperty(myObj, "prop", {
                configurable: false,
                enumerable: true,
                writable: true,
                value: "static"
            });

            createStub(myObj, "prop").value("newString");
            assert.equal(myObj.prop, "newString");
        });
    });
});
