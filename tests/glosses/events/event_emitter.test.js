const {
    event: { EventEmitter }
} = adone;

describe("event", "EventEmitter", () => {
    describe("addListeners", () => {
        it("should add and call an \"on\" listener", () => {
            const ee = new EventEmitter();
            const events = [];
            const listeners = [];

            // Sanity check
            assert.strictEqual(ee.addListener, ee.on);

            ee.on("newListener", (event, listener) => {
                // Don't track newListener listeners.
                if (event === "newListener") {
                    return;
                }

                events.push(event);
                listeners.push(listener);
            });

            ee.once("newListener", function (name, listener) {
                expect(name).to.be.equal("hello");
                expect(listener).to.be.equal(hello);
                expect(this.listeners("hello")).to.be.empty;
            });

            const hello = spy();
            const foo = spy();

            ee.on("hello", hello);
            ee.once("foo", foo);

            ee.emit("hello", "a", "b");

            expect(hello.calledOnce).to.be.true;
            expect(hello.calledWith("a", "b")).to.be.true;
            expect(foo.called).to.be.false;
            expect(events).to.be.deep.equal(["hello", "foo"]);
            expect(listeners).to.be.deep.equal([hello, foo]);
        });

        it("setMaxListeners(0) shouldn't throw", () => {
            const f = new EventEmitter();
            f.setMaxListeners(0);
        });

        it("should correctly return listeners", () => {
            const listen1 = function listen1() { };
            const listen2 = function listen2() { };
            const ee = new EventEmitter();

            ee.once("newListener", () => {
                expect(ee.listeners("hello")).to.be.empty;
                ee.once("newListener", () => {
                    expect(ee.listeners("hello")).to.be.empty;
                });
                ee.on("hello", listen2);
            });
            ee.on("hello", listen1);
            // The order of listeners on an event is not always the order in which the
            // listeners were added.
            expect(ee.listeners("hello")).to.be.deep.equal([listen2, listen1]);
        });

        it("should throw if the listener is not a function", () => {
            const ee = new EventEmitter();
            expect(() => {
                ee.on("foo", null);
            }).to.throw(adone.x.InvalidArgument, "\"listener\" argument must be a function");
        });
    });

    describe("errors", () => {
        it("should throw", () => {
            const EE = new EventEmitter();
            expect(() => {
                EE.emit("error", "Accepts a string");
            }).to.throw(adone.x.Exception, /Accepts a string/);
        });

        it("should throw", () => {
            const EE = new EventEmitter();
            expect(() => {
                EE.emit("error", { message: "Error!" });
            }).to.throw(adone.x.Exception, /object Object/);
        });
    });

    describe("getMaxListeners", () => {
        it("should be equal to the defaultMaxListeners by default", () => {
            const emitter = new EventEmitter();
            expect(emitter.getMaxListeners()).to.be.equal(EventEmitter.defaultMaxListeners);
        });

        it("should set 0", () => {
            const emitter = new EventEmitter();
            emitter.setMaxListeners(0);
            expect(emitter.getMaxListeners()).to.be.equal(0);
        });

        it("should be equal 3", () => {
            const emitter = new EventEmitter();
            emitter.setMaxListeners(3);
            expect(emitter.getMaxListeners()).to.be.equal(3);
        });
    });

    describe("setMaxListeners", () => {
        it("should throw for invalid values", () => {
            const e = new EventEmitter();

            const throwsObjs = [NaN, -1, "and even this"];
            const maxError = /^"n" argument must be a positive number$/;
            const defError = /^"defaultMaxListeners" must be a positive number$/;

            for (const obj of throwsObjs) {
                assert.throws(() => e.setMaxListeners(obj), maxError);
                assert.throws(() => EventEmitter.defaultMaxListeners = obj, defError);
            }
        });
    });

    describe("listenerCount", () => {
        it("should be equal 2", () => {
            const emitter = new EventEmitter();
            emitter.on("foo", adone.noop);
            emitter.on("foo", adone.noop);

            expect(emitter.listenerCount("foo")).to.be.equal(2);
        });

        it("should be equal 1", () => {
            const emitter = new EventEmitter();
            emitter.on("baz", adone.noop);
            expect(emitter.listenerCount("baz")).to.be.equal(1);
        });

        it("should be zero", () => {
            const emitter = new EventEmitter();
            expect(emitter.listenerCount("bar")).to.be.equal(0);
        });

        it("should support any type", () => {
            const emitter = new EventEmitter();
            emitter.on(123, adone.noop);
            expect(emitter.listenerCount(123)).to.be.equal(1);
        });

        it("should work using the static method", () => {
            const emitter = new EventEmitter();
            emitter.on("foo", adone.noop);
            emitter.on("foo", adone.noop);
            expect(EventEmitter.listenerCount(emitter, "foo")).to.be.equal(2);
        });
    });

    describe("listeners", () => {
        const listener = adone.noop;
        const listener2 = adone.noop;

        it("should return listeners", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
        });

        it("should not modify the list", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            const fooListeners = ee.listeners("foo");
            ee.removeAllListeners("foo");
            expect(ee.listeners("foo")).to.be.empty;
            expect(fooListeners).to.be.deep.equal([listener]);
        });

        it("listener list modifying shouldn't affect the listeners", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            const eeListenersCopy = ee.listeners("foo");
            expect(eeListenersCopy).to.be.deep.equal([listener]);
            eeListenersCopy.push(listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
            expect(eeListenersCopy).to.be.deep.equal([listener, listener2]);
        });

        it("adding a new listener shouldn't modify the previous list", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            const eeListenersCopy = ee.listeners("foo");
            ee.on("foo", listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener, listener2]);
            expect(eeListenersCopy).to.be.deep.equal([listener]);
        });

        it("should work using once subscriprions", () => {
            const ee = new EventEmitter();
            ee.once("foo", listener);
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
        });

        it("should return on and once listeners", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            ee.once("foo", listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener, listener2]);
        });
    });

    describe("maxListeners", () => {
        it("should throw if the argument is NaN", () => {
            const ee = new EventEmitter();
            expect(() => {
                ee.setMaxListeners(NaN);
            }).to.throw(adone.x.InvalidArgument, "\"n\" argument must be a positive number");
        });

        it("should throw if the argument is a negative number", () => {
            const ee = new EventEmitter();
            expect(() => {
                ee.setMaxListeners(-1);
            }).to.throw(adone.x.InvalidArgument, "\"n\" argument must be a positive number");
        });

        it("should throw if the argument is not a number", () => {
            const ee = new EventEmitter();
            expect(() => {
                ee.setMaxListeners("hello");
            }).to.throw(adone.x.InvalidArgument, "\"n\" argument must be a positive number");
        });

        it("should set the value", () => {
            const ee = new EventEmitter();
            ee.setMaxListeners(42);
            expect(ee.getMaxListeners()).to.be.equal(42);
        });

        it("shouldn't affect the maxListeners queue", () => {
            const ee = new EventEmitter();
            const maxListeners = spy();
            ee.on("maxListeners", maxListeners);
            try {
                ee.setMaxListeners("hello");
            } catch (err) {
                //
            }
            ee.setMaxListeners(42);
            try {
                ee.setMaxListeners(-1);
            } catch (err) {
                //
            }
            ee.emit("maxListeners");
            expect(maxListeners.calledOnce).to.be.true;
        });

        it("should emit a warning message", async () => {
            const e = new EventEmitter();
            e.setMaxListeners(1);
            const s = spy();
            process.once("warning", s);

            e.on("event-type", adone.noop);
            e.on("event-type", adone.noop);
            e.on("event-type", adone.noop); // Verify that warning is emitted only once.
            await adone.promise.delay(100);
            expect(s).to.have.been.calledOnce;
            const warning = s.args[0][0];
            expect(warning).to.be.instanceOf(adone.x.Exception);
            expect(warning.name).to.be.equal("MaxListenersExceededWarning");
            expect(warning.emitter).to.be.equal(e);
            expect(warning.count).to.be.equal(2);
            expect(warning.type).to.be.equal("event-type");
            expect(warning.message).to.include("2 event-type listeners added");
        });

        it("should emit a warning message for 'null' event", (done) => {
            const e = new EventEmitter();
            e.setMaxListeners(1);

            process.once("warning", (warning) => {
                expect(warning).to.be.instanceOf(adone.x.Exception);
                expect(warning.name).to.be.equal("MaxListenersExceededWarning");
                expect(warning.emitter).to.be.equal(e);
                expect(warning.count).to.be.equal(2);
                expect(warning.type).to.be.null;
                expect(warning.message).to.include("2 null listeners added");
                done();
            });

            e.on(null, adone.noop);
            e.on(null, adone.noop);
        });

        it("should emit a warning message for a symbol", (done) => {
            const symbol = Symbol("symbol");

            const e = new EventEmitter();
            e.setMaxListeners(1);

            process.once("warning", (warning) => {
                expect(warning).to.be.instanceOf(adone.x.Exception);
                expect(warning.name).to.be.equal("MaxListenersExceededWarning");
                expect(warning.emitter).to.be.equal(e);
                expect(warning.count).to.be.equal(2);
                expect(warning.type).to.be.equal(symbol);
                expect(warning.message).to.include("2 Symbol(symbol) listeners added");
                done();
            });

            e.on(symbol, adone.noop);
            e.on(symbol, adone.noop);
        });
    });

    it("should correctly handle modifying in emit", () => {
        let called = [];

        const e = new EventEmitter();

        const callback1 = () => {
            called.push("callback1");
            e.on("foo", callback2);
            e.on("foo", callback3);
            e.removeListener("foo", callback1);
        };

        const callback2 = () => {
            called.push("callback2");
            e.removeListener("foo", callback2);
        };

        const callback3 = () => {
            called.push("callback3");
            e.removeListener("foo", callback3);
        };

        e.on("foo", callback1);
        expect(e.listeners("foo")).to.have.lengthOf(1);

        e.emit("foo");
        expect(e.listeners("foo")).to.have.lengthOf(2);
        expect(called).to.be.deep.equal(["callback1"]);

        e.emit("foo");
        expect(e.listeners("foo")).to.be.empty;
        expect(called).to.be.deep.equal(["callback1", "callback2", "callback3"]);

        e.emit("foo");
        expect(e.listeners("foo")).to.be.empty;
        expect(called).to.be.deep.equal(["callback1", "callback2", "callback3"]);

        e.on("foo", callback1);
        e.on("foo", callback2);
        expect(e.listeners("foo")).to.have.lengthOf(2);
        e.removeAllListeners("foo");
        expect(e.listeners("foo")).to.be.empty;

        // Verify that removing callbacks while in emit allows emits to propagate to
        // all listeners
        called = [];

        e.on("foo", callback2);
        e.on("foo", callback3);
        expect(e.listeners("foo")).to.have.lengthOf(2);
        e.emit("foo");
        expect(called).to.be.deep.equal(["callback2", "callback3"]);
        expect(e.listeners("foo")).to.be.empty;
    });

    it("should handle multiple args", () => {
        const e = new EventEmitter();
        const emitted = [];

        e.on("numArgs", function () {
            emitted.push(arguments.length);
        });

        e.emit("numArgs");
        e.emit("numArgs", null);
        e.emit("numArgs", null, null);
        e.emit("numArgs", null, null, null);
        e.emit("numArgs", null, null, null, null);
        e.emit("numArgs", null, null, null, null, null);

        expect(emitted).to.be.deep.equal([0, 1, 2, 3, 4, 5]);
    });

    describe("once", () => {
        it("should be called only once", () => {
            const e = new EventEmitter();

            const hello = spy();
            e.once("hello", hello);

            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");

            expect(hello.calledOnce).to.be.true;
            expect(hello.calledWith("a", "b")).to.be.true;
        });

        it("should not emit after removing", () => {
            const e = new EventEmitter();
            const remove = spy();
            e.once("foo", remove);
            e.removeListener("foo", remove);
            e.emit("foo");
            expect(remove.notCalled).to.be.true;
        });

        it("should correctly handle emitting while handling", () => {
            const e = new EventEmitter();
            const hello = spy();
            e.once("hello", (a) => {
                hello(a);
                e.emit("hello", "second");
            });
            e.once("hello", hello);
            e.emit("hello", "first");
            expect(hello.calledTwice).to.be.true;
            expect(hello.args[0]).to.be.deep.equal(["first"]);
            expect(hello.args[1]).to.be.deep.equal(["second"]);
        });

        it("should throw if the listener is not a function", () => {
            const e = new EventEmitter();
            expect(() => {
                e.once("foo", null);
            }).to.throw(adone.x.InvalidArgument, "\"listener\" argument must be a function");
        });

        it("check that once support many arguments", () => {
            const maxArgs = 4;

            for (let i = 0; i <= maxArgs; ++i) {
                const ee = new EventEmitter();
                const args = ["foo"];

                for (let j = 0; j < i; ++j) {
                    args.push(j);
                }
                const s = spy();
                ee.once("foo", s);
                EventEmitter.prototype.emit.apply(ee, args);
                expect(s).to.have.been.calledOnce;
                expect(s).to.have.been.calledWithExactly(...args.slice(1));
            }
        });
    });

    describe("prepend", () => {
        it("should prepend an \"on\" listener", () => {
            const e = new EventEmitter();
            let m = 0;

            e.on("foo", () => {
                expect(m).to.be.equal(2);
            });

            e.prependListener("foo", () => {
                expect(m++).to.be.equal(1);
            });

            e.prependListener("foo", () => {
                expect(m++).to.be.equal(0);
            });

            e.emit("foo");
        });

        it("should throw if the listener is not a function", () => {
            const e = new EventEmitter();
            expect(() => {
                e.prependListener("foo", null);
            }).to.throw(adone.x.InvalidArgument, "\"listener\" argument must be a function");
        });
    });

    describe("removeAllListeners", () => {
        const listener = adone.noop;

        it("should remove all listeners for an event", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            ee.on("baz", listener);
            ee.on("baz", listener);
            ee.removeAllListeners("bar");
            ee.removeAllListeners("baz");
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
            expect(ee.listeners("bar")).to.be.empty;
            expect(ee.listeners("baz")).to.be.empty;
        });

        it("should emit appropriate events", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            ee.on("baz", listener);
            ee.on("baz", listener);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.removeAllListeners("bar");
            ee.removeAllListeners("baz");
            expect(remove.calledThrice).to.be.true;
            expect(remove.args[0]).to.be.deep.equal(["bar", listener]);
            expect(remove.args[1]).to.be.deep.equal(["baz", listener]);
            expect(remove.args[2]).to.be.deep.equal(["baz", listener]);
        });

        it("shouldn't change the previous list", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            ee.on("baz", listener);
            ee.on("baz", listener);
            const fooListeners = ee.listeners("foo");
            const barListeners = ee.listeners("bar");
            const bazListeners = ee.listeners("baz");
            ee.removeAllListeners("bar");
            ee.removeAllListeners("baz");
            expect(fooListeners).to.be.deep.equal([listener]);
            expect(barListeners).to.be.deep.equal([listener]);
            expect(bazListeners).to.be.deep.equal([listener, listener]);
        });

        it("should remove all the listeners", () => {
            const ee = new EventEmitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            const remove1 = spy();
            const remove2 = spy();
            ee.on("removeListener", remove1);
            ee.on("removeListener", remove2);
            ee.removeAllListeners();

            expect(remove1.calledThrice).to.be.true;
            expect(remove1.args[0]).to.be.deep.equal(["foo", listener]);
            expect(remove1.args[1]).to.be.deep.equal(["bar", listener]);
            expect(remove1.args[2]).to.be.deep.equal(["removeListener", remove2]);

            expect(remove2.calledTwice).to.be.true;
            expect(remove2.args[0]).to.be.deep.equal(["foo", listener]);
            expect(remove2.args[1]).to.be.deep.equal(["bar", listener]);
        });

        it("should be fluent", () => {
            const ee = new EventEmitter();
            expect(ee.removeAllListeners()).to.be.equal(ee);
        });
    });

    describe("removeListener", () => {
        // must be different
        const listener1 = () => { };
        const listener2 = () => { };

        it("it should remove a listener", () => {
            const ee = new EventEmitter();
            ee.on("hello", listener1);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.removeListener("hello", listener1);
            expect(remove.calledOnce).to.be.true;
            expect(remove.args[0]).to.be.deep.equal(["hello", listener1]);
            expect(ee.listeners("hello")).to.be.empty;
        });

        it("should not remove any listener if provided one is actually not a listener", () => {
            const ee = new EventEmitter();
            ee.on("hello", listener1);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.removeListener("hello", listener2);
            expect(remove.notCalled).to.be.true;
            expect(ee.listeners("hello")).to.be.deep.equal([listener1]);
        });

        it("remove remove listeners", () => {
            const ee = new EventEmitter();
            ee.on("hello", listener1);
            ee.on("hello", listener2);

            const remove1 = spy();
            ee.once("removeListener", remove1);
            ee.removeListener("hello", listener1);
            expect(remove1.calledOnce).to.be.true;
            expect(remove1.calledWith("hello", listener1)).to.be.true;
            expect(ee.listeners("hello")).to.be.deep.equal([listener2]);

            const remove2 = spy();
            ee.once("removeListener", remove2);
            ee.removeListener("hello", listener2);
            expect(remove2.calledOnce).to.be.true;
            expect(remove2.calledWith("hello", listener2)).to.be.true;
            expect(ee.listeners("hello")).to.be.empty;
        });

        it("shouldn't emit after removing", () => {
            const ee = new EventEmitter();
            const remove1 = () => {
                throw new Error("shouldnt be called");
            };
            const remove2 = () => {
                throw new Error("shouldnt be called");
            };

            ee.on("quux", remove1);
            ee.on("quux", remove2);
            let c = 0;
            ee.on("removeListener", (name, cb) => {
                ++c;
                if (cb !== remove1) {
                    return;
                }
                ee.removeListener("quux", remove2);
                ee.emit("quux");
            });
            ee.removeListener("quux", remove1);
            expect(c).to.be.equal(2);
        });

        it("should handle removing while removing", () => {
            const ee = new EventEmitter();
            ee.on("hello", listener1);
            ee.on("hello", listener2);
            let c = 0;
            ee.once("removeListener", (name, cb) => {
                ++c;
                expect(name).to.be.equal("hello");
                expect(cb).to.be.equal(listener1);
                expect(ee.listeners("hello")).to.be.deep.equal([listener2]);
                ee.once("removeListener", (name, cb) => {
                    ++c;
                    expect(name).to.be.equal("hello");
                    expect(cb).to.be.equal(listener2);
                    expect(ee.listeners("hello")).to.be.empty;
                });
                ee.removeListener("hello", listener2);
                expect(ee.listeners("hello")).to.be.empty;
            });
            ee.removeListener("hello", listener1);
            expect(ee.listeners("hello")).to.be.empty;
            expect(c).to.be.equal(2);
        });

        it("should continue invoking listeners if one deletes another", () => {
            const ee = new EventEmitter();
            const calls = [];
            const listener3 = () => {
                calls.push(3);
                ee.removeListener("hello", listener4);
            };
            const listener4 = () => {
                calls.push(4);
            };

            ee.on("hello", listener3);
            ee.on("hello", listener4);

            // listener4 will still be called although it is removed by listener 3.
            ee.emit("hello");
            // This is so because the interal listener array at time of emit
            // was [listener3,listener4]
            expect(calls).to.be.deep.equal([3, 4]);
            // Interal listener array [listener3]
            ee.emit("hello");
            expect(calls).to.be.deep.equal([3, 4, 3]);
        });

        it("should remove an \"once\" listener", () => {
            const ee = new EventEmitter();

            ee.once("hello", listener1);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.emit("hello");
            expect(remove.calledOnce).to.be.true;
            expect(remove.args[0]).to.be.deep.equal(["hello", listener1]);
        });

        it("should throw if the listener is not a function", () => {
            const ee = new EventEmitter();
            expect(() => {
                ee.removeListener("foo", null);
            }).to.throw(adone.x.InvalidArgument, "\"listener\" argument must be a function");
        });

        it("should be fluent", () => {
            const ee = new EventEmitter();

            expect(ee.removeListener("foo", () => { })).to.be.equal(ee);
        });

        it("should work fine", () => {
            const ee = new EventEmitter();

            ee.on("foo", listener1);
            ee.on("foo", listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener1, listener2]);

            ee.removeListener("foo", listener1);
            expect(ee[Symbol.for("events")].foo).to.be.equal(listener2);

            ee.on("foo", listener1);
            expect(ee.listeners("foo")).to.be.deep.equal([listener2, listener1]);

            ee.removeListener("foo", listener1);
            expect(ee[Symbol.for("events")].foo).to.be.equal(listener2);
        });
    });

    it("should correctly handle special event names", () => {
        const ee = new EventEmitter();
        const handler = adone.noop;

        ee.on("__proto__", handler);
        ee.on("__defineGetter__", handler);
        ee.on("toString", handler);

        expect(ee.eventNames()).to.be.deep.equal(["__proto__", "__defineGetter__", "toString"]);

        expect(ee.listeners("__proto__")).to.be.deep.equal([handler]);
        expect(ee.listeners("__defineGetter__")).to.be.deep.equal([handler]);
        expect(ee.listeners("toString")).to.be.deep.equal([handler]);

        const e = spy();
        ee.on("__proto__", e);
        ee.emit("__proto__", 1);
        expect(e.calledWith(1)).to.be.true;
    });

    describe("events list", () => {
        it("should return event names", () => {
            const EE = new EventEmitter();

            expect(EE.eventNames()).to.be.empty;

            const m = adone.noop;
            EE.on("foo", adone.noop);
            expect(EE.eventNames()).to.be.deep.equal(["foo"]);

            EE.on("bar", m);
            expect(EE.eventNames()).to.be.deep.equal(["foo", "bar"]);

            EE.removeListener("bar", m);
            expect(EE.eventNames()).to.be.deep.equal(["foo"]);

            const s = Symbol("s");
            EE.on(s, m);
            expect(EE.eventNames()).to.be.deep.equal(["foo", s]);

            EE.removeListener(s, m);
            expect(EE.eventNames()).to.be.deep.equal(["foo"]);
        });
    });
});
