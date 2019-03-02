describe("shani", "util", "__", "SpyCall", () => {
    const { __: { SpyCall }, spy: sspy, stub: sstub } = adone.shani.util;

    const spyCallSetUp = function () {
        this.thisValue = {};
        this.args = [{}, [], new Error(), 3];
        this.returnValue = function () { };
        this.call = new SpyCall(() => { }, this.thisValue,
            this.args, this.returnValue, null, 0);
    };

    const spyCallCallSetup = function () {
        this.args = [];
        this.proxy = sspy();
        this.call = new SpyCall(this.proxy, {}, this.args, null, null, 0);
    };

    const spyCallCalledTests = (method) => () => {
        beforeEach(spyCallSetUp);

        it("returns true if all args match", function () {
            const args = this.args;

            assert(this.call[method](args[0], args[1], args[2]));
        });

        it("returns true if first args match", function () {
            const args = this.args;

            assert(this.call[method](args[0], args[1]));
        });

        it("returns true if first arg match", function () {
            const args = this.args;

            assert(this.call[method](args[0]));
        });

        it("returns true for no args", function () {
            assert(this.call[method]());
        });

        it("returns false for too many args", function () {
            const args = this.args;

            assert.isFalse(this.call[method](args[0], args[1], args[2], args[3], {}));
        });

        it("returns false for wrong arg", function () {
            const args = this.args;

            assert.isFalse(this.call[method](args[0], args[2]));
        });
    };

    const spyCallNotCalledTests = (method) => () => {
        beforeEach(spyCallSetUp);

        it("returns false if all args match", function () {
            const args = this.args;

            assert.isFalse(this.call[method](args[0], args[1], args[2]));
        });

        it("returns false if first args match", function () {
            const args = this.args;

            assert.isFalse(this.call[method](args[0], args[1]));
        });

        it("returns false if first arg match", function () {
            const args = this.args;

            assert.isFalse(this.call[method](args[0]));
        });

        it("returns false for no args", function () {
            assert.isFalse(this.call[method]());
        });

        it("returns true for too many args", function () {
            const args = this.args;

            assert(this.call[method](args[0], args[1], args[2], args[3], {}));
        });

        it("returns true for wrong arg", function () {
            const args = this.args;

            assert(this.call[method](args[0], args[2]));
        });
    };

    describe("call object", () => {
        beforeEach(spyCallSetUp);

        it("gets call object", () => {
            const spy = sspy.create();
            spy();
            const firstCall = spy.getCall(0);

            assert.isFunction(firstCall.calledOn);
            assert.isFunction(firstCall.calledWith);
            assert.isFunction(firstCall.returned);
        });

        it("stores given call id", () => {
            const call = new SpyCall(() => { }, {}, [], null, null, 42);

            assert.equal(call.callId, 42);
        });

        it("throws if callId is undefined", () => {
            assert.throws(() => {
                new SpyCall.create(() => { }, {}, []);
            });
        });

        // This is actually a spy test:
        it("records ascending call id's", function () {
            const spy = sspy();
            spy();

            assert(this.call.callId < spy.getCall(0).callId);
        });

        it("exposes thisValue property", () => {
            const spy = sspy();
            const obj = {};
            spy.call(obj);

            assert.equal(spy.getCall(0).thisValue, obj);
        });
    });

    describe("call calledOn", () => {
        beforeEach(spyCallSetUp);

        it("calledOn should return true", function () {
            assert(this.call.calledOn(this.thisValue));
        });

        it("calledOn should return false", function () {
            assert.isFalse(this.call.calledOn({}));
        });
    });

    describe("call.calledWith", spyCallCalledTests("calledWith"));
    describe("call.calledWithMatch", spyCallCalledTests("calledWithMatch"));
    describe("call.notCalledWith", spyCallNotCalledTests("notCalledWith"));
    describe("call.notCalledWithMatch", spyCallNotCalledTests("notCalledWithMatch"));

    describe("call.calledWithExactly", () => {
        beforeEach(spyCallSetUp);

        it("returns true when all args match", function () {
            const args = this.args;

            assert(this.call.calledWithExactly(args[0], args[1], args[2], args[3]));
        });

        it("returns false for too many args", function () {
            const args = this.args;

            assert.isFalse(this.call.calledWithExactly(args[0], args[1], args[2], args[3], {}));
        });

        it("returns false for too few args", function () {
            const args = this.args;

            assert.isFalse(this.call.calledWithExactly(args[0], args[1]));
        });

        it("returns false for unmatching args", function () {
            const args = this.args;

            assert.isFalse(this.call.calledWithExactly(args[0], args[1], args[1]));
        });

        it("returns true for no arguments", () => {
            const call = new SpyCall(() => { }, {}, [], null, null, 0);

            assert(call.calledWithExactly());
        });

        it("returns false when called with no args but matching one", () => {
            const call = new SpyCall(() => { }, {}, [], null, null, 0);

            assert.isFalse(call.calledWithExactly({}));
        });
    });

    describe("call.callArg", () => {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index", function () {
            const callback = sspy();
            this.args.push(1, 2, callback);

            this.call.callArg(2);

            assert(callback.called);
        });

        it("throws if argument at specified index is not callable", function () {
            this.args.push(1);
            const call = this.call;

            assert.throws(() => {
                call.callArg(0);
            }, TypeError);
        });

        it("throws if no index is specified", function () {
            const call = this.call;

            assert.throws(() => {
                call.callArg();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            const call = this.call;

            assert.throws(() => {
                call.callArg({});
            }, TypeError);
        });
    });

    describe("call.callArgOn", () => {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index", function () {
            const callback = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(1, 2, callback);

            this.call.callArgOn(2, thisObj);

            assert(callback.called);
            assert(callback.calledOn(thisObj));
        });

        it("throws if argument at specified index is not callable", function () {
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(1);
            const call = this.call;

            assert.throws(() => {
                call.callArgOn(0, thisObj);
            }, TypeError);
        });

        it("throws if index is not number", function () {
            const thisObj = { name1: "value1", name2: "value2" };
            const call = this.call;

            assert.throws(() => {
                call.callArgOn({}, thisObj);
            }, TypeError);
        });
    });

    describe("call.callArgWith", () => {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index with provided args", function () {
            const object = {};
            const callback = sspy();
            this.args.push(1, callback);

            this.call.callArgWith(1, object);

            assert(callback.calledWith(object));
        });

        it("calls callback without args", function () {
            const callback = sspy();
            this.args.push(1, callback);

            this.call.callArgWith(1);

            assert(callback.calledWith());
        });

        it("calls callback wit multiple args", function () {
            const object = {};
            const array = [];
            const callback = sspy();
            this.args.push(1, 2, callback);

            this.call.callArgWith(2, object, array);

            assert(callback.calledWith(object, array));
        });

        it("throws if no index is specified", function () {
            const call = this.call;

            assert.throws(() => {
                call.callArgWith();
            }, TypeError);
        });

        it("throws if index is not number", function () {
            const call = this.call;

            assert.throws(() => {
                call.callArgWith({});
            }, TypeError);
        });
    });

    describe("call.callArgOnWith", () => {
        beforeEach(spyCallCallSetup);

        it("calls argument at specified index with provided args", function () {
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            const callback = sspy();
            this.args.push(1, callback);

            this.call.callArgOnWith(1, thisObj, object);

            assert(callback.calledWith(object));
            assert(callback.calledOn(thisObj));
        });

        it("calls callback without args", function () {
            const callback = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(1, callback);

            this.call.callArgOnWith(1, thisObj);

            assert(callback.calledWith());
            assert(callback.calledOn(thisObj));
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            const thisObj = { name1: "value1", name2: "value2" };
            const callback = sspy();
            this.args.push(1, 2, callback);

            this.call.callArgOnWith(2, thisObj, object, array);

            assert(callback.calledWith(object, array));
            assert(callback.calledOn(thisObj));
        });

        it("throws if index is not number", function () {
            const thisObj = { name1: "value1", name2: "value2" };
            const call = this.call;

            assert.throws(() => {
                call.callArgOnWith({}, thisObj);
            }, TypeError);
        });
    });

    describe("call.yieldTest", () => {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = sspy();
            this.args.push(callback);

            this.call.yield();

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const call = this.call;

            assert.throws(
                () => {
                    call.yield();
                },
                "spy cannot yield since no callback was passed."
            );
        });

        it("includes stub name and actual arguments in error", function () {
            this.proxy.displayName = "somethingAwesome";
            this.args.push(23, 42);
            const call = this.call;

            assert.throws(
                () => {
                    call.yield();
                },
                "somethingAwesome cannot yield since no callback was passed. Received [23, 42]"
            );
        });

        it("invokes last argument as callback", function () {
            const spy = sspy();
            this.args.push(24, {}, spy);

            this.call.yield();

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const spy = sspy();
            const spy2 = sspy();
            this.args.push(24, {}, spy, spy2);

            this.call.yield();

            assert(spy.calledOnce);
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = sspy();
            this.args.push(spy);

            this.call.yield(obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            this.args.push(() => {
                throw new Error("d'oh!");
            });
            const call = this.call;

            assert.throws(() => {
                call.yield();
            });
        });
    });

    describe("call.invokeCallback", () => {

        it("is alias for yield", () => {
            const call = new SpyCall(() => { }, {}, [], null, null, 0);

            assert.equal(call.yield, call.invokeCallback);
        });

    });

    describe("call.yieldOnTest", () => {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(callback);

            this.call.yieldOn(thisObj);

            assert(callback.calledOnce);
            assert(callback.calledOn(thisObj));
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const call = this.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    call.yieldOn(thisObj);
                },
                "spy cannot yield since no callback was passed."
            );
        });

        it("includes stub name and actual arguments in error", function () {
            this.proxy.displayName = "somethingAwesome";
            this.args.push(23, 42);
            const call = this.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    call.yieldOn(thisObj);
                },
                "somethingAwesome cannot yield since no callback was passed. Received [23, 42]"
            );
        });

        it("invokes last argument as callback", function () {
            const spy = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(24, {}, spy);

            this.call.yieldOn(thisObj);

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
            assert(spy.calledOn(thisObj));
        });

        it("invokes first of two callbacks", function () {
            const spy = sspy();
            const spy2 = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(24, {}, spy, spy2);

            this.call.yieldOn(thisObj);

            assert(spy.calledOnce);
            assert(spy.calledOn(thisObj));
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(spy);

            this.call.yieldOn(thisObj, obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(thisObj));
        });

        it("throws if callback throws", function () {
            this.args.push(() => {
                throw new Error("d'oh!");
            });
            const call = this.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(() => {
                call.yieldOn(thisObj);
            });
        });
    });

    describe("call.yieldTo", () => {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = sspy();
            this.args.push({
                success: callback
            });

            this.call.yieldTo("success");

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const call = this.call;

            assert.throws(
                () => {
                    call.yieldTo("success");
                },
                "spy cannot yield to 'success' since no callback was passed."
            );
        });

        it("includes stub name and actual arguments in error", function () {
            this.proxy.displayName = "somethingAwesome";
            this.args.push(23, 42);
            const call = this.call;

            assert.throws(
                () => {
                    call.yieldTo("success");
                },
                "somethingAwesome cannot yield to 'success' since no callback was passed. Received [23, 42]"
            );
        });

        it("invokes property on last argument as callback", function () {
            const spy = sspy();
            this.args.push(24, {}, { success: spy });

            this.call.yieldTo("success");

            assert(spy.calledOnce);
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const spy = sspy();
            const spy2 = sspy();
            this.args.push(24, {}, { error: spy }, { error: spy2 });

            this.call.yieldTo("error");

            assert(spy.calledOnce);
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = sspy();
            this.args.push({ success: spy });

            this.call.yieldTo("success", obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            this.args.push({
                success() {
                    throw new Error("d'oh!");
                }
            });
            const call = this.call;

            assert.throws(() => {
                call.yieldTo("success");
            });
        });
    });

    describe("call.yieldToOn", () => {
        beforeEach(spyCallCallSetup);

        it("invokes only argument as callback", function () {
            const callback = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push({
                success: callback
            });

            this.call.yieldToOn("success", thisObj);

            assert(callback.calledOnce);
            assert.equal(callback.args[0].length, 0);
            assert(callback.calledOn(thisObj));
        });

        it("throws understandable error if no callback is passed", function () {
            const call = this.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    call.yieldToOn("success", thisObj);
                },
                "spy cannot yield to 'success' since no callback was passed."
            );
        });

        it("throws understandable error if symbol prop is not found", function () {
            const call = this.call;
            const symbol = Symbol();

            assert.throws(
                () => {
                    call.yieldToOn(symbol, {});
                },
                "spy cannot yield to 'Symbol()' since no callback was passed."
            );
        });

        it("includes stub name and actual arguments in error", function () {
            this.proxy.displayName = "somethingAwesome";
            this.args.push(23, 42);
            const call = this.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(
                () => {
                    call.yieldToOn("success", thisObj);
                },
                "somethingAwesome cannot yield to 'success' since no callback was passed. Received [23, 42]"
            );
        });

        it("invokes property on last argument as callback", function () {
            const spy = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(24, {}, { success: spy });

            this.call.yieldToOn("success", thisObj);

            assert(spy.calledOnce);
            assert(spy.calledOn(thisObj));
            assert.equal(spy.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const spy = sspy();
            const spy2 = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push(24, {}, { error: spy }, { error: spy2 });

            this.call.yieldToOn("error", thisObj);

            assert(spy.calledOnce);
            assert(spy.calledOn(thisObj));
            assert.isFalse(spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = sspy();
            const thisObj = { name1: "value1", name2: "value2" };
            this.args.push({ success: spy });

            this.call.yieldToOn("success", thisObj, obj, "Crazy");

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(thisObj));
        });

        it("throws if callback throws", function () {
            this.args.push({
                success() {
                    throw new Error("d'oh!");
                }
            });
            const call = this.call;
            const thisObj = { name1: "value1", name2: "value2" };

            assert.throws(() => {
                call.yieldToOn("success", thisObj);
            });
        });
    });

    describe("call.toString", () => {
        afterEach(function () {
            if (this.format) {
                this.format.restore();
            }
        });

        it("includes spy name", () => {
            const object = { doIt: sspy() };
            object.doIt();

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt()");
        });

        it("includes single argument", () => {
            const object = { doIt: sspy() };
            object.doIt(42);

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42)");
        });

        it("includes all arguments", () => {
            const object = { doIt: sspy() };
            object.doIt(42, "Hey");

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42, Hey)");
        });

        it("includes explicit return value", () => {
            const object = { doIt: sstub().returns(42) };
            object.doIt(42, "Hey");

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42, Hey) => 42");
        });

        it("includes empty string return value", () => {
            const object = { doIt: sstub().returns("") };
            object.doIt(42, "Hey");

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42, Hey) => (empty string)");
        });

        it("includes error", () => {
            const object = { doIt: sstub().throws("TypeError") };

            assert.throws(() => {
                object.doIt();
            });

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt() !TypeError");
        });

        it("includes error message if any", () => {
            const object = { doIt: sstub().throws("TypeError", "Oh noes!") };

            assert.throws(() => {
                object.doIt();
            });

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt() !TypeError(Oh noes!)");
        });

        // these tests are ensuring that call.toString is handled by format
        it("formats arguments with format", () => {
            const object = { doIt: sspy() };

            object.doIt(42);

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt(42)");
        });

        it("formats return value with format", () => {
            const object = { doIt: sstub().returns(42) };

            object.doIt();

            assert.equal(object.doIt.getCall(0).toString().replace(/ at.*/g, ""), "doIt() => 42");
        });

        it("does not throw when the call stack is empty", (done) => {
            const stub1 = sstub().resolves(1);
            const stub2 = sstub().returns(1);

            function run() {
                return stub1().then(stub2);
            }

            run()
                .then(() => {
                    assert.equal(stub2.getCall(0).toString().replace(/ at.*/g, ""), "stub(1) => 1");
                    done();
                })
                .catch(done);
        });
    });

    describe("constructor", () => {
        beforeEach(function () {
            this.CustomConstructor = function () { };
            this.customPrototype = this.CustomConstructor.prototype;
            sspy(this, "CustomConstructor");
        });

        it("creates original object", function () {
            const myInstance = new this.CustomConstructor();

            assert(this.customPrototype.isPrototypeOf(myInstance));
        });

        it("does not interfere with instanceof", function () {
            const myInstance = new this.CustomConstructor();

            assert(myInstance instanceof this.CustomConstructor);
        });

        it("records usage", function () {
            const myInstance = new this.CustomConstructor(); // eslint-disable-line no-unused-vars

            assert(this.CustomConstructor.called);
        });
    });

    describe("functions", () => {
        it("throws if spying on non-existent property", () => {
            const myObj = {};

            assert.throws(() => {
                sspy(myObj, "ouch");
            });

            assert.isUndefined(myObj.ouch);
        });

        it("throws if spying on non-existent object", () => {
            assert.throws(() => {
                sspy(undefined, "ouch");
            });
        });

        it("haves toString method", () => {
            const obj = { meth() { } };
            sspy(obj, "meth");

            assert.equal(obj.meth.toString(), "meth");
        });

        it("toString should say 'spy' when unable to infer name", () => {
            const spy = sspy();

            assert.equal(spy.toString(), "spy");
        });

        it("toString should report name of spied function", () => {
            function myTestFunc() { }
            const spy = sspy(myTestFunc);

            assert.equal(spy.toString(), "myTestFunc");
        });

        it("toString should prefer displayName property if available", () => {
            function myTestFunc() { }
            myTestFunc.displayName = "My custom method";
            const spy = sspy(myTestFunc);

            assert.equal(spy.toString(), "My custom method");
        });

        it("toString should prefer property name if possible", () => {
            const obj = {};
            obj.meth = sspy();
            obj.meth();

            assert.equal(obj.meth.toString(), "meth");
        });
    });

    describe(".reset", () => {
        const assertReset = (spy) => {
            assert(!spy.called);
            assert(!spy.calledOnce);
            assert.equal(spy.args.length, 0);
            assert.equal(spy.returnValues.length, 0);
            assert.equal(spy.exceptions.length, 0);
            assert.equal(spy.thisValues.length, 0);
            assert.isNull(spy.firstCall);
            assert.isNull(spy.secondCall);
            assert.isNull(spy.thirdCall);
            assert.isNull(spy.lastCall);
        };

        it("resets spy state", () => {
            const spy = sspy();
            spy();

            spy.resetHistory();

            assertReset(spy);
        });

        it("resets call order state", () => {
            const spies = [sspy(), sspy()];
            spies[0]();
            spies[1]();

            spies[0].resetHistory();

            assert(!spies[0].calledBefore(spies[1]));
        });

        it("resets fakes returned by withArgs", () => {
            const spy = sspy();
            const fakeA = spy.withArgs("a");
            const fakeB = spy.withArgs("b");
            spy("a");
            spy("b");
            spy("c");
            const fakeC = spy.withArgs("c");

            spy.resetHistory();

            assertReset(fakeA);
            assertReset(fakeB);
            assertReset(fakeC);
        });
    });

    describe(".withArgs", () => {
        it("defines withArgs method", () => {
            const spy = sspy();

            assert.isFunction(spy.withArgs);
        });

        it("records single call", () => {
            const spy = sspy().withArgs(1);
            spy(1);

            assert.equal(spy.callCount, 1);
        });

        it("records non-matching call on original spy", () => {
            const spy = sspy();
            const argSpy = spy.withArgs(1);
            spy(1);
            spy(2);

            assert.equal(spy.callCount, 2);
            assert.equal(argSpy.callCount, 1);
        });

        it("records non-matching call with several arguments separately", () => {
            const spy = sspy();
            const argSpy = spy.withArgs(1, "str", {});
            spy(1);
            spy(1, "str", {});

            assert.equal(spy.callCount, 2);
            assert.equal(argSpy.callCount, 1);
        });

        it("records for partial argument match", () => {
            const spy = sspy();
            const argSpy = spy.withArgs(1, "str", {});
            spy(1);
            spy(1, "str", {});
            spy(1, "str", {}, []);

            assert.equal(spy.callCount, 3);
            assert.equal(argSpy.callCount, 2);
        });

        it("records filtered spy when original throws", () => {
            const spy = sspy(() => {
                throw new Error("Oops");
            });

            const argSpy = spy.withArgs({}, []);

            assert.throws(() => {
                spy(1);
            });

            assert.throws(() => {
                spy({}, []);
            });

            assert.equal(spy.callCount, 2);
            assert.equal(argSpy.callCount, 1);
        });

        it("returns existing override for arguments", () => {
            const spy = sspy();
            const argSpy = spy.withArgs({}, []);
            const another = spy.withArgs({}, []);
            spy();
            spy({}, []);
            spy({}, [], 2);

            assert.equal(another, argSpy);
            assert.notEqual(another, spy);
            assert.equal(spy.callCount, 3);
            assert.equal(spy.withArgs({}, []).callCount, 2);
        });

        it("chains withArgs calls on original spy", () => {
            const spy = sspy();
            const numArgSpy = spy.withArgs({}, []).withArgs(3);
            spy();
            spy({}, []);
            spy(3);

            assert.equal(spy.callCount, 3);
            assert.equal(numArgSpy.callCount, 1);
            assert.equal(spy.withArgs({}, []).callCount, 1);
        });

        it("initializes filtered spy with callCount", () => {
            const spy = sspy();
            spy("a");
            spy("b");
            spy("b");
            spy("c");
            spy("c");
            spy("c");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");
            const argSpy3 = spy.withArgs("c");

            assert.equal(argSpy1.callCount, 1);
            assert.equal(argSpy2.callCount, 2);
            assert.equal(argSpy3.callCount, 3);
            assert(argSpy1.called);
            assert(argSpy2.called);
            assert(argSpy3.called);
            assert(argSpy1.calledOnce);
            assert(argSpy2.calledTwice);
            assert(argSpy3.calledThrice);
        });

        it("initializes filtered spy with first, second, third and last call", () => {
            const spy = sspy();
            spy("a", 1);
            spy("b", 2);
            spy("b", 3);
            spy("b", 4);

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.firstCall.calledWithExactly("a", 1));
            assert(argSpy1.lastCall.calledWithExactly("a", 1));
            assert(argSpy2.firstCall.calledWithExactly("b", 2));
            assert(argSpy2.secondCall.calledWithExactly("b", 3));
            assert(argSpy2.thirdCall.calledWithExactly("b", 4));
            assert(argSpy2.lastCall.calledWithExactly("b", 4));
        });

        it("initializes filtered spy with arguments", () => {
            const spy = sspy();
            spy("a");
            spy("b");
            spy("b", "c", "d");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).calledWithExactly("a"));
            assert(argSpy2.getCall(0).calledWithExactly("b"));
            assert(argSpy2.getCall(1).calledWithExactly("b", "c", "d"));
        });

        it("initializes filtered spy with thisValues", () => {
            const spy = sspy();
            const thisValue1 = {};
            const thisValue2 = {};
            const thisValue3 = {};
            spy.call(thisValue1, "a");
            spy.call(thisValue2, "b");
            spy.call(thisValue3, "b");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).calledOn(thisValue1));
            assert(argSpy2.getCall(0).calledOn(thisValue2));
            assert(argSpy2.getCall(1).calledOn(thisValue3));
        });

        it("initializes filtered spy with return values", () => {
            const spy = sspy((value) => {
                return value;
            });
            spy("a");
            spy("b");
            spy("b");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).returned("a"));
            assert(argSpy2.getCall(0).returned("b"));
            assert(argSpy2.getCall(1).returned("b"));
        });

        it("initializes filtered spy with call order", () => {
            const spy = sspy();
            spy("a");
            spy("b");
            spy("b");

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy2.getCall(0).calledAfter(argSpy1.getCall(0)));
            assert(argSpy2.getCall(1).calledAfter(argSpy1.getCall(0)));
        });

        it("initializes filtered spy with exceptions", () => {
            const spy = sspy((x, y) => {
                const error = new Error();
                error.name = y;
                throw error;
            });

            assert.throws(() => {
                spy("a", "1");
            });
            assert.throws(() => {
                spy("b", "2");
            });
            assert.throws(() => {
                spy("b", "3");
            });

            const argSpy1 = spy.withArgs("a");
            const argSpy2 = spy.withArgs("b");

            assert(argSpy1.getCall(0).threw("1"));
            assert(argSpy2.getCall(0).threw("2"));
            assert(argSpy2.getCall(1).threw("3"));
        });
    });

    describe(".printf", () => {
        describe("name", () => {
            it("named", () => {
                const named = sspy(function cool() { });
                assert.equal(named.printf("%n"), "cool");
            });
            it("anon", () => {
                const anon = sspy(() => { });
                assert.equal(anon.printf("%n"), "spy");

                const noFn = sspy();
                assert.equal(noFn.printf("%n"), "spy");
            });
        });

        it("count", () => {
            // Throwing just to make sure it has no effect.
            const spy = sspy(sstub().throws());
            function call() {
                assert.throws(() => {
                    spy();
                });
            }

            call();
            assert.equal(spy.printf("%c"), "once");
            call();
            assert.equal(spy.printf("%c"), "twice");
            call();
            assert.equal(spy.printf("%c"), "thrice");
            call();
            assert.equal(spy.printf("%c"), "4 times");
        });

        describe("calls", () => {
            it("oneLine", () => {
                const verify = (arg, expected) => {
                    const spy = sspy();
                    spy(arg);
                    assert.equal(spy.printf("%C").replace(/ at.*/g, ""), `\n    ${expected}`);
                };

                verify(true, "spy(true)");
                verify(false, "spy(false)");
                verify(undefined, "spy(undefined)");
                verify(1, "spy(1)");
                verify(0, "spy(0)");
                verify(-1, "spy(-1)");
                verify(-1.1, "spy(-1.1)");
                verify(Infinity, "spy(Infinity)");
                verify(["a"], "spy([ 'a' ])");
                verify({ a: "a" }, "spy({ a: 'a' })");
            });

            it.skip("multiline", () => {
                const str = "spy\ntest";
                const spy = sspy();

                spy(str);
                spy(str);
                spy(str);

                assert.equal(spy.printf("%C").replace(/ at.*/g, ""),
                    `\n    spy(${str})` +
                    `\n\n    spy(${str})` +
                    `\n\n    spy(${str})`);

                spy.resetHistory();

                spy("test");
                spy("spy\ntest");
                spy("spy\ntest");

                assert.equal(spy.printf("%C").replace(/ at.*/g, ""),
                    `${"\n    spy(test)" +
                    "\n    spy("}${str})` +
                    `\n\n    spy(${str})`);
            });
        });

        it("thisValues", () => {
            const spy = sspy();
            spy();
            assert.equal(spy.printf("%t"), "undefined");

            spy.resetHistory();
            spy.call(true);
            assert.equal(spy.printf("%t"), "true");
        });

        it("unmatched", () => {
            const spy = sspy();

            assert.equal(spy.printf("%λ"), "%λ");
        });

        it("*", () => {
            const spy = sspy();

            assert.equal(
                spy.printf("%*", 1.4567, "a", true, {}, [], undefined, null),
                "1.4567, a, true, {}, [], undefined, null"
            );
            assert.equal(spy.printf("%*", "a", "b", "c"), "a, b, c");
        });
    });

    it("captures a stack trace", () => {
        const spy = sspy();
        spy();
        assert.isString(spy.getCall(0).stack);
    });
});
