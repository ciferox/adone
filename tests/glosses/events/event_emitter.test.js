const {
    is,
    assertion,
    event: { Emitter }
} = adone;

assertion.use(assertion.extension.dirty);

describe("event", "Emitter", () => {

    describe.skip("native tests", () => {
        describe("add_listeners", () => {
            it("default", () => {
                const ee = new Emitter();
                const events_new_listener_emitted = [];
                const listeners_new_listener_emitted = [];

                // Sanity check
                assert.strictEqual(ee.addListener, ee.on);

                ee.on("newListener", (event, listener) => {
                    // Don't track newListener listeners.
                    if (event === "newListener") {
                        return;
                    }

                    events_new_listener_emitted.push(event);
                    listeners_new_listener_emitted.push(listener);
                });

                const hello = spy();
                // common.mustCall((a, b) => {
                //     assert.strictEqual(a, "a");
                //     assert.strictEqual(b, "b");
                // });

                ee.once("newListener", function (name, listener) {
                    assert.strictEqual(name, "hello");
                    assert.strictEqual(listener, hello);
                    assert.deepStrictEqual(this.listeners("hello"), []);
                });

                ee.on("hello", hello);
                ee.once("foo", assert.fail);

                assert.deepStrictEqual(["hello", "foo"], events_new_listener_emitted);
                assert.deepStrictEqual([hello, assert.fail], listeners_new_listener_emitted);

                ee.emit("hello", "a", "b");

                expect(hello.calledOnce).to.be.true();
                expect(hello.calledWith("a", "b")).to.be.true();
            });

            it("setMaxListeners() doesn't throw", () => {
                const f = new Emitter();

                f.setMaxListeners(0);
            });

            it("should correctly return listeners", () => {
                const listen1 = () => { };
                const listen2 = () => { };
                const ee = new Emitter();

                ee.once("newListener", () => {
                    assert.deepStrictEqual(ee.listeners("hello"), []);
                    ee.once("newListener", () => {
                        assert.deepStrictEqual(ee.listeners("hello"), []);
                    });
                    ee.on("hello", listen2);
                });
                ee.on("hello", listen1);
                // The order of listeners on an event is not always the order in which the
                // listeners were added.
                assert.deepStrictEqual(ee.listeners("hello"), [listen2, listen1]);
            });

            it("verify that the listener must be a function", () => {
                const ee = new Emitter();
                expect(() => {
                    ee.on("foo", null);
                }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");
            });
        });

        describe("check_listener_leaks", () => {
            it("default", () => {
                const e = new Emitter();

                const cb = spy();

                for (let i = 0; i < 10; i++) {
                    e.on("default", cb);
                    expect(cb.notCalled).to.be.true();
                }
                assert.ok(!e._events.default.hasOwnProperty("warned"));
                e.on("default", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events.default.warned);

                // symbol
                const symbol = Symbol("symbol");
                e.setMaxListeners(1);
                e.on(symbol, cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(!e._events[symbol].hasOwnProperty("warned"));
                e.on(symbol, cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events[symbol].hasOwnProperty("warned"));

                // specific
                e.setMaxListeners(5);
                for (let i = 0; i < 5; i++) {
                    e.on("specific", cb);
                    expect(cb.notCalled).to.be.true();
                }
                assert.ok(!e._events.specific.hasOwnProperty("warned"));
                e.on("specific", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events.specific.warned);

                // only one
                e.setMaxListeners(1);
                e.on("only one", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(!e._events["only one"].hasOwnProperty("warned"));
                e.on("only one", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events["only one"].hasOwnProperty("warned"));

                // unlimited
                e.setMaxListeners(0);
                for (let i = 0; i < 1000; i++) {
                    e.on("unlimited", cb);
                    expect(cb.notCalled).to.be.true();
                }
                assert.ok(!e._events.unlimited.hasOwnProperty("warned"));
            });

            it("process-wide", () => {
                Emitter.defaultMaxListeners = 42;
                const e = new Emitter();

                const cb = spy();

                for (let i = 0; i < 42; ++i) {
                    e.on("fortytwo", cb);
                    expect(cb.notCalled).to.be.true();
                }
                assert.ok(!e._events.fortytwo.hasOwnProperty("warned"));
                e.on("fortytwo", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events.fortytwo.hasOwnProperty("warned"));
                delete e._events.fortytwo.warned;

                Emitter.defaultMaxListeners = 44;
                e.on("fortytwo", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(!e._events.fortytwo.hasOwnProperty("warned"));
                e.on("fortytwo", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events.fortytwo.hasOwnProperty("warned"));
            });

            it("but _maxListeners still has precedence over defaultMaxListeners", () => {
                Emitter.defaultMaxListeners = 42;
                const cb = spy();
                const e = new Emitter();
                e.setMaxListeners(1);
                e.on("uno", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(!e._events.uno.hasOwnProperty("warned"));
                e.on("uno", cb);
                expect(cb.notCalled).to.be.true();
                assert.ok(e._events.uno.hasOwnProperty("warned"));

                // chainable
                assert.strictEqual(e, e.setMaxListeners(1));
            });
        });

        it("errors", () => {
            const {
                std: { util }
            } = adone;

            const EE = new Emitter();

            expect(() => EE.emit("error", "Accepts a string").to.throw(adone.error.Exception, "Unhandled error. ('Accepts a string')"));

            expect(() => EE.emit("error", { message: "Error!" })).to.throw(adone.error.Exception, "Unhandled error. ({ message: 'Error!' })");

            expect(() => EE.emit("error", {
                message: "Error!",
                [util.inspect.custom]() {
                    throw new Error();
                }
            })).to.throw(adone.error.Exception, "Unhandled error. ([object Object])");
        });

        it("events_list", () => {
            const EE = new Emitter();
            const m = () => { };
            EE.on("foo", () => { });
            assert.deepStrictEqual(["foo"], EE.eventNames());
            EE.on("bar", m);
            assert.deepStrictEqual(["foo", "bar"], EE.eventNames());
            EE.removeListener("bar", m);
            assert.deepStrictEqual(["foo"], EE.eventNames());
            const s = Symbol("s");
            EE.on(s, m);
            assert.deepStrictEqual(["foo", s], EE.eventNames());
            EE.removeListener(s, m);
            assert.deepStrictEqual(["foo"], EE.eventNames());
        });

        it("events_once", async () => {
            const { once } = Emitter;

            async function onceAnEvent() {
                const ee = new Emitter();

                process.nextTick(() => {
                    ee.emit("myevent", 42);
                });

                const [value] = await once(ee, "myevent");
                assert.strictEqual(value, 42);
                assert.strictEqual(ee.listenerCount("error"), 0);
                assert.strictEqual(ee.listenerCount("myevent"), 0);
            }

            async function onceAnEventWithTwoArgs() {
                const ee = new Emitter();

                process.nextTick(() => {
                    ee.emit("myevent", 42, 24);
                });

                const value = await once(ee, "myevent");
                assert.deepStrictEqual(value, [42, 24]);
            }

            async function catchesErrors() {
                const ee = new Emitter();

                const expected = new Error("kaboom");
                let err;
                process.nextTick(() => {
                    ee.emit("error", expected);
                });

                try {
                    await once(ee, "myevent");
                } catch (_e) {
                    err = _e;
                }
                assert.strictEqual(err, expected);
                assert.strictEqual(ee.listenerCount("error"), 0);
                assert.strictEqual(ee.listenerCount("myevent"), 0);
            }

            async function stopListeningAfterCatchingError() {
                const ee = new Emitter();

                const expected = new Error("kaboom");
                let err;
                process.nextTick(() => {
                    ee.emit("error", expected);
                    ee.emit("myevent", 42, 24);
                });

                const cb = spy();
                process.on("multipleResolves", cb);
                expect(cb.notCalled).to.be.true();

                try {
                    await once(ee, "myevent");
                } catch (_e) {
                    err = _e;
                }
                process.removeAllListeners("multipleResolves");
                assert.strictEqual(err, expected);
                assert.strictEqual(ee.listenerCount("error"), 0);
                assert.strictEqual(ee.listenerCount("myevent"), 0);
            }

            async function onceError() {
                const ee = new Emitter();

                const expected = new Error("kaboom");
                process.nextTick(() => {
                    ee.emit("error", expected);
                });

                const [err] = await once(ee, "error");
                assert.strictEqual(err, expected);
                assert.strictEqual(ee.listenerCount("error"), 0);
                assert.strictEqual(ee.listenerCount("myevent"), 0);
            }

            await Promise.all([
                onceAnEvent(),
                onceAnEventWithTwoArgs(),
                catchesErrors(),
                stopListeningAfterCatchingError(),
                onceError()
            ]);
        });

        it.skip("events_uncaught_exception_stack", () => {
            // Tests that the error stack where the exception was thrown is *not* appended.
            const cb = spy();

            process.on("uncaughtException", cb);

            new Emitter().emit("error", new Error());

            expect(cb.calledOnce).to.be.true();
            expect(cb.calledWith("err")).to.be.true();
            const lines = cb.args[0].stack.split("\n");
            assert.strictEqual(lines[0], "Error");
            lines.slice(1).forEach((line) => {
                assert(/^ {4}at/.test(line), `${line} has an unexpected format`);
            });
        });

        it("get_max_listeners", () => {
            const emitter = new Emitter();

            assert.strictEqual(emitter.getMaxListeners(), Emitter.defaultMaxListeners);

            emitter.setMaxListeners(0);
            assert.strictEqual(emitter.getMaxListeners(), 0);

            emitter.setMaxListeners(3);
            assert.strictEqual(emitter.getMaxListeners(), 3);

            // https://github.com/nodejs/node/issues/523 - second call should not throw.
            const recv = {};
            Emitter.prototype.on.call(recv, "event", () => { });
            Emitter.prototype.on.call(recv, "event", () => { });
        });

        it("listener_count", () => {
            const emitter = new Emitter();
            emitter.on("foo", () => { });
            emitter.on("foo", () => { });
            emitter.on("baz", () => { });
            // Allow any type
            emitter.on(123, () => { });

            assert.strictEqual(Emitter.listenerCount(emitter, "foo"), 2);
            assert.strictEqual(emitter.listenerCount("foo"), 2);
            assert.strictEqual(emitter.listenerCount("bar"), 0);
            assert.strictEqual(emitter.listenerCount("baz"), 1);
            assert.strictEqual(emitter.listenerCount(123), 1);
        });


        it("listeners_side_effects", () => {
            const e = new Emitter();
            let fl; // foo listeners

            fl = e.listeners("foo");
            assert(is.array(fl));
            assert.strictEqual(fl.length, 0);
            assert(!(e._events instanceof Object));
            assert.deepStrictEqual(Object.keys(e._events), []);

            e.on("foo", assert.fail);
            fl = e.listeners("foo");
            assert.strictEqual(e._events.foo, assert.fail);
            assert(is.array(fl));
            assert.strictEqual(fl.length, 1);
            assert.strictEqual(fl[0], assert.fail);

            e.listeners("bar");

            e.on("foo", assert.ok);
            fl = e.listeners("foo");

            assert(is.array(e._events.foo));
            assert.strictEqual(e._events.foo.length, 2);
            assert.strictEqual(e._events.foo[0], assert.fail);
            assert.strictEqual(e._events.foo[1], assert.ok);

            assert(is.array(fl));
            assert.strictEqual(fl.length, 2);
            assert.strictEqual(fl[0], assert.fail);
            assert.strictEqual(fl[1], assert.ok);
        });


        it("listeners", () => {

            function listener() { }
            function listener2() { }
            function listener3() {
                return 0;
            }
            function listener4() {
                return 1;
            }

            {
                const ee = new Emitter();
                ee.on("foo", listener);
                const fooListeners = ee.listeners("foo");
                assert.deepStrictEqual(ee.listeners("foo"), [listener]);
                ee.removeAllListeners("foo");
                assert.deepStrictEqual(ee.listeners("foo"), []);
                assert.deepStrictEqual(fooListeners, [listener]);
            }

            {
                const ee = new Emitter();
                ee.on("foo", listener);
                const eeListenersCopy = ee.listeners("foo");
                assert.deepStrictEqual(eeListenersCopy, [listener]);
                assert.deepStrictEqual(ee.listeners("foo"), [listener]);
                eeListenersCopy.push(listener2);
                assert.deepStrictEqual(ee.listeners("foo"), [listener]);
                assert.deepStrictEqual(eeListenersCopy, [listener, listener2]);
            }

            {
                const ee = new Emitter();
                ee.on("foo", listener);
                const eeListenersCopy = ee.listeners("foo");
                ee.on("foo", listener2);
                assert.deepStrictEqual(ee.listeners("foo"), [listener, listener2]);
                assert.deepStrictEqual(eeListenersCopy, [listener]);
            }

            {
                const ee = new Emitter();
                ee.once("foo", listener);
                assert.deepStrictEqual(ee.listeners("foo"), [listener]);
            }

            {
                const ee = new Emitter();
                ee.on("foo", listener);
                ee.once("foo", listener2);
                assert.deepStrictEqual(ee.listeners("foo"), [listener, listener2]);
            }

            {
                const ee = new Emitter();
                ee._events = undefined;
                assert.deepStrictEqual(ee.listeners("foo"), []);
            }

            {
                class TestStream extends Emitter { }
                const s = new TestStream();
                assert.deepStrictEqual(s.listeners("foo"), []);
            }

            {
                const ee = new Emitter();
                ee.on("foo", listener);
                const wrappedListener = ee.rawListeners("foo");
                assert.strictEqual(wrappedListener.length, 1);
                assert.strictEqual(wrappedListener[0], listener);
                assert.notStrictEqual(wrappedListener, ee.rawListeners("foo"));
                ee.once("foo", listener);
                const wrappedListeners = ee.rawListeners("foo");
                assert.strictEqual(wrappedListeners.length, 2);
                assert.strictEqual(wrappedListeners[0], listener);
                assert.notStrictEqual(wrappedListeners[1], listener);
                assert.strictEqual(wrappedListeners[1].listener, listener);
                assert.notStrictEqual(wrappedListeners, ee.rawListeners("foo"));
                ee.emit("foo");
                assert.strictEqual(wrappedListeners.length, 2);
                assert.strictEqual(wrappedListeners[1].listener, listener);
            }

            {
                const ee = new Emitter();
                ee.once("foo", listener3);
                ee.on("foo", listener4);
                const rawListeners = ee.rawListeners("foo");
                assert.strictEqual(rawListeners.length, 2);
                assert.strictEqual(rawListeners[0](), 0);
                const rawListener = ee.rawListeners("foo");
                assert.strictEqual(rawListener.length, 1);
                assert.strictEqual(rawListener[0](), 1);
            }
        });

        it.skip("max_listeners_warning", () => {
            // Flags: --no-warnings
            // The flag suppresses stderr output but the warning event will still emit

            const e = new Emitter();
            e.setMaxListeners(1);

            const cb = spy();

            process.on("warning", cb);

            e.on("event-type", () => { });
            e.on("event-type", () => { }); // Trigger warning.
            e.on("event-type", () => { }); // Verify that warning is emitted only once.

            expect(cb.calledOnce).to.be.true();
            const warning = cb.args[0];
            assert.ok(warning instanceof Error);
            assert.strictEqual(warning.name, "MaxListenersExceededWarning");
            assert.strictEqual(warning.emitter, e);
            assert.strictEqual(warning.count, 2);
            assert.strictEqual(warning.type, "event-type");
            assert.ok(warning.message.includes("2 event-type listeners added."));
        });

        it.skip("max_listeners_warning_for_null", () => {
            // Flags: --no-warnings
            // The flag suppresses stderr output but the warning event will still emit

            const e = new Emitter();
            e.setMaxListeners(1);

            const cb = spy();

            process.on("warning", cb);

            e.on(null, () => { });
            e.on(null, () => { });

            expect(cb.calledOnce).to.be.true();
            // expect(cb.calledWith("warning")).to.be.true();
            const warning = cb.args[0];
            assert.ok(warning instanceof Error);
            assert.strictEqual(warning.name, "MaxListenersExceededWarning");
            assert.strictEqual(warning.emitter, e);
            assert.strictEqual(warning.count, 2);
            assert.strictEqual(warning.type, null);
            assert.ok(warning.message.includes("2 null listeners added."));
        });

        it.skip("max_listeners_warning_for_symbol", () => {
            // Flags: --no-warnings
            // The flag suppresses stderr output but the warning event will still emit

            const symbol = Symbol("symbol");

            const e = new Emitter();
            e.setMaxListeners(1);

            const cb = spy();

            process.on("warning", cb);

            e.on(symbol, () => { });
            e.on(symbol, () => { });

            expect(cb.calledOnce).to.be.true();
            const warning = cb.args[0];
            assert.ok(warning instanceof Error);
            assert.strictEqual(warning.name, "MaxListenersExceededWarning");
            assert.strictEqual(warning.emitter, e);
            assert.strictEqual(warning.count, 2);
            assert.strictEqual(warning.type, symbol);
            assert.ok(warning.message.includes("2 Symbol(symbol) listeners added."));
        });

        it("max_listeners", () => {
            const e = new Emitter();

            const cb = spy();

            e.on("maxListeners", cb);

            // Should not corrupt the 'maxListeners' queue.
            e.setMaxListeners(42);

            const throwsObjs = [NaN, -1, "and even this"];

            for (const obj of throwsObjs) {
                expect(() => e.setMaxListeners(obj)).to.throw(adone.error.OutOfRangeExcepion, `The value of "n" is out of range. It must be a non-negative number. Received ${obj}`);
                expect(() => Emitter.defaultMaxListeners = obj).to.throw(adone.error.OutOfRangeExcepion, `The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ${obj}`);
            }

            e.emit("maxListeners");

            expect(cb.calledOnce).to.be.true();
        });

        it("method_names", () => {
            const E = Emitter.prototype;
            assert.strictEqual(E.constructor.name, "EventEmitter");
            assert.strictEqual(E.on, E.addListener); // Same method.
            assert.strictEqual(E.off, E.removeListener); // Same method.
            Object.getOwnPropertyNames(E).forEach((name) => {
                if (name === "constructor" || name === "on" || name === "off") {
                    return;
                }
                if (!is.function(E[name])) {
                    return;
                }
                assert.strictEqual(E[name].name, name);
            });
        });

        it("modify_in_emit", () => {

            let callbacks_called = [];

            const e = new Emitter();

            function callback1() {
                callbacks_called.push("callback1");
                e.on("foo", callback2);
                e.on("foo", callback3);
                e.removeListener("foo", callback1);
            }

            function callback2() {
                callbacks_called.push("callback2");
                e.removeListener("foo", callback2);
            }

            function callback3() {
                callbacks_called.push("callback3");
                e.removeListener("foo", callback3);
            }

            e.on("foo", callback1);
            assert.strictEqual(e.listeners("foo").length, 1);

            e.emit("foo");
            assert.strictEqual(e.listeners("foo").length, 2);
            assert.deepStrictEqual(["callback1"], callbacks_called);

            e.emit("foo");
            assert.strictEqual(e.listeners("foo").length, 0);
            assert.deepStrictEqual(["callback1", "callback2", "callback3"],
                callbacks_called);

            e.emit("foo");
            assert.strictEqual(e.listeners("foo").length, 0);
            assert.deepStrictEqual(["callback1", "callback2", "callback3"],
                callbacks_called);

            e.on("foo", callback1);
            e.on("foo", callback2);
            assert.strictEqual(e.listeners("foo").length, 2);
            e.removeAllListeners("foo");
            assert.strictEqual(e.listeners("foo").length, 0);

            // Verify that removing callbacks while in emit allows emits to propagate to
            // all listeners
            callbacks_called = [];

            e.on("foo", callback2);
            e.on("foo", callback3);
            assert.strictEqual(e.listeners("foo").length, 2);
            e.emit("foo");
            assert.deepStrictEqual(["callback2", "callback3"], callbacks_called);
            assert.strictEqual(e.listeners("foo").length, 0);
        });

        it.skip("no_error_provided_to_error_event", () => {
            const {
                std: { domain }
            } = adone;

            {
                const e = new Emitter();
                const d = domain.create();
                d.add(e);
                const cb = spy();
                d.on("error", cb);
                e.emit("error");
                expect(cb.calledOnce).to.be.true();
                assert(cb.args[0] instanceof Error, "error created");
            }

            for (const arg of [false, null, undefined]) {
                const e = new Emitter();
                const d = domain.create();
                d.add(e);
                const cb = spy();
                d.on("error", cb);
                e.emit("error", arg);
                expect(cb.calledOnce).to.be.true();
                assert(cb.args[0] instanceof Error, "error created");
            }

            for (const arg of [42, "fortytwo", true]) {
                const e = new Emitter();
                const d = domain.create();
                const cb = spy();

                d.add(e);
                d.on("error", cb);
                e.emit("error", arg);
                expect(cb.calledOnce).to.be.true();
                assert.strictEqual(cb.args[0], arg);
            }
        });

        it("num_args", () => {
            const e = new Emitter();
            const num_args_emitted = [];

            e.on("numArgs", function () {
                const numArgs = arguments.length;
                num_args_emitted.push(numArgs);
            });

            e.on("foo", function () {
                num_args_emitted.push(arguments.length);
            });

            e.on("foo", function () {
                num_args_emitted.push(arguments.length);
            });

            e.emit("numArgs");
            e.emit("numArgs", null);
            e.emit("numArgs", null, null);
            e.emit("numArgs", null, null, null);
            e.emit("numArgs", null, null, null, null);
            e.emit("numArgs", null, null, null, null, null);

            e.emit("foo", null, null, null, null);

            process.on("exit", () => {
                assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 4, 4], num_args_emitted);
            });
        });

        it("once", () => {
            const e = new Emitter();
            let cb = spy();

            e.once("hello", cb);

            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");

            expect(cb.calledOnce).to.be.true();

            function remove() {
                assert.fail("once->foo should not be emitted");
            }

            e.once("foo", remove);
            e.removeListener("foo", remove);
            e.emit("foo");

            cb = spy();
            const cb1 = spy();

            e.once("e", cb);
            e.once("e", cb1);

            e.emit("e");
            e.emit("e");

            expect(cb.calledOnce).to.be.true();
            expect(cb1.calledOnce).to.be.true();

            // Verify that the listener must be a function
            expect(() => {
                const ee = new Emitter();
                ee.once("foo", null);
            }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");

            {
                // once() has different code paths based on the number of arguments being
                // emitted. Verify that all of the cases are covered.
                const maxArgs = 4;

                for (let i = 0; i <= maxArgs; ++i) {
                    const ee = new Emitter();
                    const args = ["foo"];

                    for (let j = 0; j < i; ++j) {
                        args.push(j);
                    }

                    const cb = spy();
                    ee.once("foo", cb);

                    Emitter.prototype.emit.apply(ee, args);

                    expect(cb.calledOnce).to.be.true();
                    expect(cb).to.have.been.calledWithExactly(...args.slice(1));
                }
            }
        });


        it("prepend", () => {

            const myEE = new Emitter();
            let m = 0;
            // This one comes last.
            myEE.on("foo", () => assert.strictEqual(m, 2));

            // This one comes second.
            myEE.prependListener("foo", () => assert.strictEqual(m++, 1));

            // This one comes first.
            myEE.prependOnceListener("foo", () => assert.strictEqual(m++, 0));

            myEE.emit("foo");

            // Verify that the listener must be a function
            expect(() => {
                const ee = new Emitter();
                ee.prependOnceListener("foo", null);
            }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");

            // Test fallback if prependListener is undefined.
            const stream = require("stream");

            delete Emitter.prototype.prependListener;

            function Writable() {
                this.writable = true;
                stream.Stream.call(this);
            }
            Object.setPrototypeOf(Writable.prototype, stream.Stream.prototype);
            Object.setPrototypeOf(Writable, stream.Stream);

            function Readable() {
                this.readable = true;
                stream.Stream.call(this);
            }
            Object.setPrototypeOf(Readable.prototype, stream.Stream.prototype);
            Object.setPrototypeOf(Readable, stream.Stream);

            const w = new Writable();
            const r = new Readable();
            r.pipe(w);
        });

        it("set_max_listeners_size_effects", () => {
            const e = new Emitter();

            assert(!(e._events instanceof Object));
            assert.deepStrictEqual(Object.keys(e._events), []);
            e.setMaxListeners(5);
            assert.deepStrictEqual(Object.keys(e._events), []);
        });

        it("special_event_names", () => {
            const ee = new Emitter();
            const handler = () => { };

            assert.deepStrictEqual(ee.eventNames(), []);

            assert.strictEqual(ee._events.hasOwnProperty, undefined);
            assert.strictEqual(ee._events.toString, undefined);

            ee.on("__proto__", handler);
            ee.on("__defineGetter__", handler);
            ee.on("toString", handler);

            assert.deepStrictEqual(ee.eventNames(), [
                "__proto__",
                "__defineGetter__",
                "toString"
            ]);

            assert.deepStrictEqual(ee.listeners("__proto__"), [handler]);
            assert.deepStrictEqual(ee.listeners("__defineGetter__"), [handler]);
            assert.deepStrictEqual(ee.listeners("toString"), [handler]);

            let cb = spy();
            ee.on("__proto__", cb);
            ee.emit("__proto__", 1);
            expect(cb.calledOnce).to.be.true();
            assert.strictEqual(cb.args[0][0], 1);

            cb = spy();
            process.on("__proto__", cb);
            process.emit("__proto__", 1);
            expect(cb.calledOnce).to.be.true();
            assert.strictEqual(cb.args[0][0], 1);
        });
    });


    it("is.emitter() should return true", () => {
        assert.isTrue(adone.is.emitter(new Emitter()));
    });

    describe("addListeners", () => {
        it("should add and call an \"on\" listener", () => {
            const ee = new Emitter();
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
                expect(this.listeners("hello")).to.be.empty();
            });

            const hello = spy();
            const foo = spy();

            ee.on("hello", hello);
            ee.once("foo", foo);

            ee.emit("hello", "a", "b");

            expect(hello.calledOnce).to.be.true();
            expect(hello.calledWith("a", "b")).to.be.true();
            expect(foo.called).to.be.false();
            expect(events).to.be.deep.equal(["hello", "foo"]);
            expect(listeners).to.be.deep.equal([hello, foo]);
        });

        it("setMaxListeners(0) shouldn't throw", () => {
            const f = new Emitter();
            f.setMaxListeners(0);
        });

        it("should correctly return listeners", () => {
            const listen1 = function listen1() { };
            const listen2 = function listen2() { };
            const ee = new Emitter();

            ee.once("newListener", () => {
                expect(ee.listeners("hello")).to.be.empty();
                ee.once("newListener", () => {
                    expect(ee.listeners("hello")).to.be.empty();
                });
                ee.on("hello", listen2);
            });
            ee.on("hello", listen1);
            // The order of listeners on an event is not always the order in which the
            // listeners were added.
            expect(ee.listeners("hello")).to.be.deep.equal([listen2, listen1]);
        });

        it("should throw if the listener is not a function", () => {
            const ee = new Emitter();
            expect(() => {
                ee.on("foo", null);
            }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");
        });
    });

    describe("errors", () => {
        it("should throw", () => {
            const EE = new Emitter();
            expect(() => {
                EE.emit("error", "Accepts a string");
            }).to.throw(adone.error.Exception, /Accepts a string/);
        });

        it("should throw", () => {
            const EE = new Emitter();
            expect(() => {
                EE.emit("error", { message: "Error!" });
            }).to.throw(adone.error.Exception, "Unhandled error. ({ message: 'Error!' })");
        });
    });

    describe("getMaxListeners", () => {
        it("should be equal to the defaultMaxListeners by default", () => {
            const emitter = new Emitter();
            expect(emitter.getMaxListeners()).to.be.equal(Emitter.defaultMaxListeners);
        });

        it("should set 0", () => {
            const emitter = new Emitter();
            emitter.setMaxListeners(0);
            expect(emitter.getMaxListeners()).to.be.equal(0);
        });

        it("should be equal 3", () => {
            const emitter = new Emitter();
            emitter.setMaxListeners(3);
            expect(emitter.getMaxListeners()).to.be.equal(3);
        });
    });

    describe("setMaxListeners", () => {
        it("should throw for invalid values", () => {
            const e = new Emitter();

            const throwsObjs = [NaN, -1, "and even this"];
            const maxError = /^The value of "n" is out of range. It must be a non-negative number. Received /;
            const defError = /^The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received /;

            for (const obj of throwsObjs) {
                assert.throws(() => e.setMaxListeners(obj), maxError);
                assert.throws(() => Emitter.defaultMaxListeners = obj, defError);
            }
        });
    });

    describe("listenerCount", () => {
        it("should be equal 2", () => {
            const emitter = new Emitter();
            emitter.on("foo", adone.noop);
            emitter.on("foo", adone.noop);

            expect(emitter.listenerCount("foo")).to.be.equal(2);
        });

        it("should be equal 1", () => {
            const emitter = new Emitter();
            emitter.on("baz", adone.noop);
            expect(emitter.listenerCount("baz")).to.be.equal(1);
        });

        it("should be zero", () => {
            const emitter = new Emitter();
            expect(emitter.listenerCount("bar")).to.be.equal(0);
        });

        it("should support any type", () => {
            const emitter = new Emitter();
            emitter.on(123, adone.noop);
            expect(emitter.listenerCount(123)).to.be.equal(1);
        });

        it("should work using the static method", () => {
            const emitter = new Emitter();
            emitter.on("foo", adone.noop);
            emitter.on("foo", adone.noop);
            expect(Emitter.listenerCount(emitter, "foo")).to.be.equal(2);
        });
    });

    describe("listeners", () => {
        const listener = adone.noop;
        const listener2 = adone.noop;

        it("should return listeners", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
        });

        it("should not modify the list", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            const fooListeners = ee.listeners("foo");
            ee.removeAllListeners("foo");
            expect(ee.listeners("foo")).to.be.empty();
            expect(fooListeners).to.be.deep.equal([listener]);
        });

        it("listener list modifying shouldn't affect the listeners", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            const eeListenersCopy = ee.listeners("foo");
            expect(eeListenersCopy).to.be.deep.equal([listener]);
            eeListenersCopy.push(listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
            expect(eeListenersCopy).to.be.deep.equal([listener, listener2]);
        });

        it("adding a new listener shouldn't modify the previous list", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            const eeListenersCopy = ee.listeners("foo");
            ee.on("foo", listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener, listener2]);
            expect(eeListenersCopy).to.be.deep.equal([listener]);
        });

        it("should work using once subscriprions", () => {
            const ee = new Emitter();
            ee.once("foo", listener);
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
        });

        it("should return on and once listeners", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            ee.once("foo", listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener, listener2]);
        });
    });

    describe("maxListeners", () => {
        it("should throw if the argument is NaN", () => {
            const ee = new Emitter();
            expect(() => {
                ee.setMaxListeners(NaN);
            }).to.throw(adone.error.OutOfRangeExcepion, "The value of \"n\" is out of range. It must be a non-negative number. Received NaN");
        });

        it("should throw if the argument is a negative number", () => {
            const ee = new Emitter();
            expect(() => {
                ee.setMaxListeners(-1);
            }).to.throw(adone.error.OutOfRangeExcepion, "The value of \"n\" is out of range. It must be a non-negative number. Received -1");
        });

        it("should throw if the argument is not a number", () => {
            const ee = new Emitter();
            expect(() => {
                ee.setMaxListeners("hello");
            }).to.throw(adone.error.OutOfRangeExcepion, "The value of \"n\" is out of range. It must be a non-negative number. Received hello");
        });

        it("should set the value", () => {
            const ee = new Emitter();
            ee.setMaxListeners(42);
            expect(ee.getMaxListeners()).to.be.equal(42);
        });

        it("shouldn't affect the maxListeners queue", () => {
            const ee = new Emitter();
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
            expect(maxListeners.calledOnce).to.be.true();
        });

        it.todo("should emit a warning message", async () => {
            const e = new Emitter();
            e.setMaxListeners(1);
            const s = spy();
            process.once("warning", s);

            e.on("event-type", adone.noop);
            e.on("event-type", adone.noop);
            e.on("event-type", adone.noop); // Verify that warning is emitted only once.
            await adone.promise.delay(100);
            expect(s).to.have.been.calledOnce();
            const warning = s.args[0][0];
            expect(warning).to.be.instanceOf(adone.error.Exception);
            expect(warning.name).to.be.equal("MaxListenersExceededWarning");
            expect(warning.emitter).to.be.equal(e);
            expect(warning.count).to.be.equal(2);
            expect(warning.type).to.be.equal("event-type");
            expect(warning.message).to.include("2 event-type listeners added");
        });

        it.todo("should emit a warning message for 'null' event", (done) => {
            const e = new Emitter();
            e.setMaxListeners(1);

            process.once("warning", (warning) => {
                expect(warning).to.be.instanceOf(adone.error.Exception);
                expect(warning.name).to.be.equal("MaxListenersExceededWarning");
                expect(warning.emitter).to.be.equal(e);
                expect(warning.count).to.be.equal(2);
                expect(warning.type).to.be.null();
                expect(warning.message).to.include("2 null listeners added");
                done();
            });

            e.on(null, adone.noop);
            e.on(null, adone.noop);
        });

        it.todo("should emit a warning message for a symbol", (done) => {
            const symbol = Symbol("symbol");

            const e = new Emitter();
            e.setMaxListeners(1);

            process.once("warning", (warning) => {
                expect(warning).to.be.instanceOf(adone.error.Exception);
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

        const e = new Emitter();

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
        expect(e.listeners("foo")).to.be.empty();
        expect(called).to.be.deep.equal(["callback1", "callback2", "callback3"]);

        e.emit("foo");
        expect(e.listeners("foo")).to.be.empty();
        expect(called).to.be.deep.equal(["callback1", "callback2", "callback3"]);

        e.on("foo", callback1);
        e.on("foo", callback2);
        expect(e.listeners("foo")).to.have.lengthOf(2);
        e.removeAllListeners("foo");
        expect(e.listeners("foo")).to.be.empty();

        // Verify that removing callbacks while in emit allows emits to propagate to
        // all listeners
        called = [];

        e.on("foo", callback2);
        e.on("foo", callback3);
        expect(e.listeners("foo")).to.have.lengthOf(2);
        e.emit("foo");
        expect(called).to.be.deep.equal(["callback2", "callback3"]);
        expect(e.listeners("foo")).to.be.empty();
    });

    it("should handle multiple args", () => {
        const e = new Emitter();
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
            const e = new Emitter();

            const hello = spy();
            e.once("hello", hello);

            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");
            e.emit("hello", "a", "b");

            expect(hello.calledOnce).to.be.true();
            expect(hello.calledWith("a", "b")).to.be.true();
        });

        it("should not emit after removing", () => {
            const e = new Emitter();
            const remove = spy();
            e.once("foo", remove);
            e.removeListener("foo", remove);
            e.emit("foo");
            expect(remove.notCalled).to.be.true();
        });

        it("should correctly handle emitting while handling", () => {
            const e = new Emitter();
            const hello = spy();
            e.once("hello", (a) => {
                hello(a);
                e.emit("hello", "second");
            });
            e.once("hello", hello);
            e.emit("hello", "first");
            expect(hello.calledTwice).to.be.true();
            expect(hello.args[0]).to.be.deep.equal(["first"]);
            expect(hello.args[1]).to.be.deep.equal(["second"]);
        });

        it("should throw if the listener is not a function", () => {
            const e = new Emitter();
            expect(() => {
                e.once("foo", null);
            }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");
        });

        it("check that once support many arguments", () => {
            const maxArgs = 4;

            for (let i = 0; i <= maxArgs; ++i) {
                const ee = new Emitter();
                const args = ["foo"];

                for (let j = 0; j < i; ++j) {
                    args.push(j);
                }
                const s = spy();
                ee.once("foo", s);
                Emitter.prototype.emit.apply(ee, args);
                expect(s).to.have.been.calledOnce();
                expect(s).to.have.been.calledWithExactly(...args.slice(1));
            }
        });
    });

    describe("prepend", () => {
        it("should prepend an \"on\" listener", () => {
            const e = new Emitter();
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
            const e = new Emitter();
            expect(() => {
                e.prependListener("foo", null);
            }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");
        });
    });

    describe("removeAllListeners", () => {
        const listener = adone.noop;

        it("should remove all listeners for an event", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            ee.on("baz", listener);
            ee.on("baz", listener);
            ee.removeAllListeners("bar");
            ee.removeAllListeners("baz");
            expect(ee.listeners("foo")).to.be.deep.equal([listener]);
            expect(ee.listeners("bar")).to.be.empty();
            expect(ee.listeners("baz")).to.be.empty();
        });

        it("should emit appropriate events", () => {
            const ee = new Emitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            ee.on("baz", listener);
            ee.on("baz", listener);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.removeAllListeners("bar");
            ee.removeAllListeners("baz");
            expect(remove.calledThrice).to.be.true();
            expect(remove.args[0]).to.be.deep.equal(["bar", listener]);
            expect(remove.args[1]).to.be.deep.equal(["baz", listener]);
            expect(remove.args[2]).to.be.deep.equal(["baz", listener]);
        });

        it("shouldn't change the previous list", () => {
            const ee = new Emitter();
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
            const ee = new Emitter();
            ee.on("foo", listener);
            ee.on("bar", listener);
            const remove1 = spy();
            const remove2 = spy();
            ee.on("removeListener", remove1);
            ee.on("removeListener", remove2);
            ee.removeAllListeners();

            expect(remove1.calledThrice).to.be.true();
            expect(remove1.args[0]).to.be.deep.equal(["foo", listener]);
            expect(remove1.args[1]).to.be.deep.equal(["bar", listener]);
            expect(remove1.args[2]).to.be.deep.equal(["removeListener", remove2]);

            expect(remove2.calledTwice).to.be.true();
            expect(remove2.args[0]).to.be.deep.equal(["foo", listener]);
            expect(remove2.args[1]).to.be.deep.equal(["bar", listener]);
        });

        it("should be fluent", () => {
            const ee = new Emitter();
            expect(ee.removeAllListeners()).to.be.equal(ee);
        });
    });

    describe("removeListener", () => {
        // must be different
        const listener1 = () => { };
        const listener2 = () => { };

        it("it should remove a listener", () => {
            const ee = new Emitter();
            ee.on("hello", listener1);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.removeListener("hello", listener1);
            expect(remove.calledOnce).to.be.true();
            expect(remove.args[0]).to.be.deep.equal(["hello", listener1]);
            expect(ee.listeners("hello")).to.be.empty();
        });

        it("should not remove any listener if provided one is actually not a listener", () => {
            const ee = new Emitter();
            ee.on("hello", listener1);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.removeListener("hello", listener2);
            expect(remove.notCalled).to.be.true();
            expect(ee.listeners("hello")).to.be.deep.equal([listener1]);
        });

        it("remove remove listeners", () => {
            const ee = new Emitter();
            ee.on("hello", listener1);
            ee.on("hello", listener2);

            const remove1 = spy();
            ee.once("removeListener", remove1);
            ee.removeListener("hello", listener1);
            expect(remove1.calledOnce).to.be.true();
            expect(remove1.calledWith("hello", listener1)).to.be.true();
            expect(ee.listeners("hello")).to.be.deep.equal([listener2]);

            const remove2 = spy();
            ee.once("removeListener", remove2);
            ee.removeListener("hello", listener2);
            expect(remove2.calledOnce).to.be.true();
            expect(remove2.calledWith("hello", listener2)).to.be.true();
            expect(ee.listeners("hello")).to.be.empty();
        });

        it("shouldn't emit after removing", () => {
            const ee = new Emitter();
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
            const ee = new Emitter();
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
                    expect(ee.listeners("hello")).to.be.empty();
                });
                ee.removeListener("hello", listener2);
                expect(ee.listeners("hello")).to.be.empty();
            });
            ee.removeListener("hello", listener1);
            expect(ee.listeners("hello")).to.be.empty();
            expect(c).to.be.equal(2);
        });

        it("should continue invoking listeners if one deletes another", () => {
            const ee = new Emitter();
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
            const ee = new Emitter();

            ee.once("hello", listener1);
            const remove = spy();
            ee.on("removeListener", remove);
            ee.emit("hello");
            expect(remove.calledOnce).to.be.true();
            expect(remove.args[0]).to.be.deep.equal(["hello", listener1]);
        });

        it("should throw if the listener is not a function", () => {
            const ee = new Emitter();
            expect(() => {
                ee.removeListener("foo", null);
            }).to.throw(adone.error.InvalidArgumentException, "The 'listener' argument must be of type Function. Received type object");
        });

        it("should be fluent", () => {
            const ee = new Emitter();

            expect(ee.removeListener("foo", () => { })).to.be.equal(ee);
        });

        it("should work fine", () => {
            const ee = new Emitter();

            ee.on("foo", listener1);
            ee.on("foo", listener2);
            expect(ee.listeners("foo")).to.be.deep.equal([listener1, listener2]);

            ee.removeListener("foo", listener1);
            expect(ee._events.foo).to.be.equal(listener2);

            ee.on("foo", listener1);
            expect(ee.listeners("foo")).to.be.deep.equal([listener2, listener1]);

            ee.removeListener("foo", listener1);
            expect(ee._events.foo).to.be.equal(listener2);
        });
    });

    it("should correctly handle special event names", () => {
        const ee = new Emitter();
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
        expect(e.calledWith(1)).to.be.true();
    });

    describe("events list", () => {
        it("should return event names", () => {
            const EE = new Emitter();

            expect(EE.eventNames()).to.be.empty();

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

    describe.skip("propagateEvents", () => {
        const test = (propagator) => {
            it("propagates events", () => {
                const ee1 = new Emitter();
                const ee2 = new Emitter();

                propagator(ee1, ee2);

                const e1 = stub().callsFake((a, b, c) => {
                    assert.equal(a, "a");
                    assert.equal(b, "b");
                    assert.equal(c, undefined);
                });

                ee2.on("event-1", e1);

                const e2 = stub().callsFake((a, b, c) => {
                    assert.equal(a, "c");
                    assert.equal(b, "d");
                    assert.equal(c, undefined);
                });

                ee2.on("event-2", e2);

                ee1.emit("event-1", "a", "b");
                ee1.emit("event-1", "a", "b");
                ee1.emit("event-2", "c", "d");
                ee1.emit("event-2", "c", "d");

                expect(e1).to.have.callCount(2);
                expect(e2).to.have.callCount(2);
            });

            it("propagates can end", () => {
                const ee1 = new Emitter();
                const ee2 = new Emitter();

                const prop = propagator(ee1, ee2);

                const e = stub().callsFake(() => {
                    assert.ok("true", "propagated");
                });

                ee2.on("event", e);

                ee1.emit("event");
                prop.end();
                ee1.emit("event");
                expect(e).to.have.been.calledOnce();
            });

            it("after propagation old one still emits", () => {
                const ee1 = new Emitter();
                const ee2 = new Emitter();
                const prop = propagator(ee1, ee2);

                const e = stub().callsFake(() => {
                    assert.ok("true", "propagated");
                });

                ee1.on("event", e);

                ee1.emit("event");
                prop.end();
                ee1.emit("event");
                expect(e).to.have.been.calledTwice();
            });

            it("emit on source before destination", () => {
                const source = new Emitter();
                const dest = new Emitter();

                propagator(source, dest);
                const sevent = spy();
                source.on("event", sevent);
                const devent = spy();
                dest.on("event", devent);

                // Emit the events for assertion
                source.emit("event");
                expect(sevent).to.have.been.calledBefore(devent);
            });

            it("is able to propagate only certain events", () => {
                const ee1 = new Emitter();
                const ee2 = new Emitter();
                // propagate only event-1 and event-2, leaving out
                const p = propagator(ee1, ee2, ["event-1", "event-2"]);

                const e1 = spy();

                ee2.on("event-1", e1);

                const e2 = spy();

                ee2.on("event-2", e2);

                const e3 = spy();

                ee2.on("event-3", e3);

                ee1.emit("event-1");
                ee1.emit("event-2");
                ee1.emit("event-3");

                p.end();

                expect(e1).to.have.been.calledOnce();
                expect(e2).to.have.been.calledOnce();
                expect(e3).to.have.not.been.called();

                ee1.emit("event-1");

                expect(e1).to.have.been.calledOnce();
                expect(e2).to.have.been.calledOnce();
                expect(e3).to.have.not.been.called();

            });

            it("is able to propagate and map certain events", () => {
                const ee1 = new Emitter();
                const ee2 = new Emitter();
                // propagate only event-1 and event-2, leaving out
                const p = propagator(ee1, ee2, {
                    "event-1": "other-event-1",
                    "event-2": "other-event-2"
                }, ee1, ee2);

                const e1 = spy();

                ee2.on("other-event-1", e1);

                const e2 = spy();

                ee2.on("other-event-2", e2);

                const e3 = spy();

                ee2.on("event-3", e3);

                ee1.emit("event-1");
                ee1.emit("event-2");
                ee1.emit("event-3");

                p.end();

                expect(e1).to.have.been.calledOnce();
                expect(e2).to.have.been.calledOnce();
                expect(e3).to.have.not.been.called();

                ee1.emit("event-1");

                expect(e1).to.have.been.calledOnce();
                expect(e2).to.have.been.calledOnce();
                expect(e3).to.have.not.been.called();
            });
        };

        // test proto method
        test((src, dst, events) => src.propagateEvents(dst, events));

        // test static method
        describe("static", () => {
            test((src, dst, events) => Emitter.propagateEvents(src, dst, events));
        });
    });
});
