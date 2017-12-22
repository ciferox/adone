const { is, util: { fakeClock }, noop } = adone;

describe("util", "fakeClock", () => {
    const GlobalDate = Date;

    before(() => {
        global.test = {};
    });

    after(() => {
        delete global.test;
    });

    describe("issue #59", () => {
        const context = {
            Date,
            setTimeout,
            clearTimeout
        };
        let clock;

        it("should install and uninstall the clock on a custom target", () => {
            clock = fakeClock.install(context);
            // this would throw an error before issue #59 was fixed
            clock.uninstall();
        });
    });

    describe("issue #73", () => {
        it("should install with date object", () => {
            const date = new Date("2015-09-25");
            const clock = fakeClock.install({ now: date });
            assert.equal(clock.now, 1443139200000);
            clock.uninstall();
        });
    });

    describe("issue #67", () => {
        // see https://nodejs.org/api/timers.html
        it("should overflow to 1 on very big timeouts", () => {
            const clock = fakeClock.install();
            const stub1 = stub();
            const stub2 = stub();

            clock.setTimeout(stub1, 100);
            clock.setTimeout(stub2, 214748334700); //should be called after 1 tick

            clock.tick(1);
            assert(stub2.called);
            assert.false(stub1.called);

            clock.tick(99);
            assert(stub1.called);
            assert(stub2.called);

            clock.uninstall();
        });

        it("should overflow to interval 1 on very big timeouts", () => {
            const clock = fakeClock.install();
            const s = stub();

            clock.setInterval(s, 214748334700);
            clock.tick(3);
            assert(s.calledThrice);

            clock.uninstall();
        });

        it("should execute setTimeout smaller than 1", () => {
            const clock = fakeClock.install();
            const stub1 = stub();

            clock.setTimeout(stub1, 0.5);
            clock.tick(1);
            assert(stub1.calledOnce);

            clock.uninstall();
        });

        it("executes setTimeout with negative duration as if it has zero delay", () => {
            const clock = fakeClock.install();
            const stub1 = stub();

            clock.setTimeout(stub1, -10);
            clock.tick(1);
            assert(stub1.calledOnce);

            clock.uninstall();
        });
    });

    describe("common cases", () => {
        describe("setTimeout", () => {
            beforeEach(function () {
                this.clock = fakeClock.createClock();
                global.test.evalCalled = false;
            });

            afterEach(() => {
                delete global.test.evalCalled;
            });

            it("throws if no arguments", function () {
                const clock = this.clock;

                assert.throws(() => {
                    clock.setTimeout();
                });
            });

            it("returns numeric id or object with numeric id", function () {
                const result = this.clock.setTimeout("");

                if (is.object(result)) {
                    assert.number(result.id);
                } else {
                    assert.number(result);
                }
            });

            it("returns unique id", function () {
                const id1 = this.clock.setTimeout("");
                const id2 = this.clock.setTimeout("");

                assert.notDeepEqual(id2, id1);
            });

            it("sets timers on instance", () => {
                const clock1 = fakeClock.createClock();
                const clock2 = fakeClock.createClock();
                const stubs = [stub(), stub()];

                clock1.setTimeout(stubs[0], 100);
                clock2.setTimeout(stubs[1], 100);
                clock2.tick(200);

                assert.false(stubs[0].called);
                assert(stubs[1].called);
            });

            it("parses numeric string times", function () {
                this.clock.setTimeout(() => {
                    fakeClock.evalCalled = true;
                }, "10");
                this.clock.tick(10);

                assert(fakeClock.evalCalled);
            });

            it("parses no-numeric string times", function () {
                this.clock.setTimeout(() => {
                    fakeClock.evalCalled = true;
                }, "string");
                this.clock.tick(10);

                assert(fakeClock.evalCalled);
            });

            it("evals non-function callbacks", function () {
                this.clock.setTimeout("test.evalCalled = true", 10);
                this.clock.tick(10);

                assert(global.test.evalCalled);
            });

            it("passes setTimeout parameters", () => {
                const clock = fakeClock.createClock();
                const stb = stub();

                clock.setTimeout(stb, 2, "the first", "the second");

                clock.tick(3);

                assert.true(stb.calledWithExactly("the first", "the second"));
            });

            it("calls correct timeout on recursive tick", () => {
                const clock = fakeClock.createClock();
                const stb = stub();
                const recurseCallback = function () {
                    clock.tick(100);
                };

                clock.setTimeout(recurseCallback, 50);
                clock.setTimeout(stb, 100);

                clock.tick(50);
                assert(stb.called);
            });

            it("does not depend on this", () => {
                const clock = fakeClock.createClock();
                const stb = stub();
                const setTimeout = clock.setTimeout;

                setTimeout(stb, 100);

                clock.tick(100);
                assert(stb.called);
            });

            it("is not influenced by forward system clock changes", function () {
                const stb = stub();
                this.clock.setTimeout(stb, 5000);
                this.clock.tick(1000);
                this.clock.setSystemTime((new this.clock.Date()).getTime() + 1000);
                this.clock.tick(3990);
                assert.equal(stb.callCount, 0);
                this.clock.tick(20);
                assert.equal(stb.callCount, 1);
            });

            it("is not influenced by forward system clock changes during process.nextTick()", function () {
                const me = this;
                const s = stub();
                this.clock.setTimeout(s, 5000);
                this.clock.tick(1000);
                this.clock.nextTick(() => {
                    me.clock.setSystemTime(me.clock.now + 1000);
                });
                this.clock.tick(3990);
                assert.equal(s.callCount, 0);
                this.clock.tick(20);
                assert.equal(s.callCount, 1);
            });

            it("is not influenced by backward system clock changes", function () {
                const stb = stub();
                this.clock.setTimeout(stb, 5000);
                this.clock.tick(1000);
                this.clock.setSystemTime((new this.clock.Date()).getTime() - 1000);
                this.clock.tick(3990);
                assert.equal(stb.callCount, 0);
                this.clock.tick(20);
                assert.equal(stb.callCount, 1);
            });

            it("should work when called from a process.nextTick()", function () {
                const me = this;
                let callbackCalled = false;
                this.clock.nextTick(() => {
                    me.clock.setTimeout(() => {
                        callbackCalled = true;
                    }, 50);
                });
                this.clock.tick(60);
                assert.equal(callbackCalled, true);
            });
            it("should work when called from a process.nextTick() (across the tick())", function () {
                const me = this;
                let callbackCalled = false;
                this.clock.nextTick(() => {
                    me.clock.setTimeout(() => {
                        callbackCalled = true;
                    }, 100);
                });
                this.clock.tick(60);
                assert.equal(callbackCalled, false);
                this.clock.tick(41);
                assert.equal(callbackCalled, true);
            });
            it("should work when called from setTimeout(() => process.nextTick())", function () {
                const me = this;
                let callbackCalled = false;
                this.clock.setTimeout(() => {
                    me.clock.nextTick(() => {
                        me.clock.setTimeout(() => {
                            callbackCalled = true;
                        }, 50);
                    });
                }, 10);
                this.clock.tick(61);
                assert.equal(callbackCalled, true);
            });
        });

        describe("setImmediate", () => {
            beforeEach(function () {
                this.clock = fakeClock.createClock();
            });

            it("returns numeric id or object with numeric id", function () {
                const result = this.clock.setImmediate(noop);

                if (is.object(result)) {
                    assert.number(result.id);
                } else {
                    assert.number(result);
                }
            });

            it("calls the given callback immediately", function () {
                const stb = stub();

                this.clock.setImmediate(stb);
                this.clock.tick(0);

                assert(stb.called);
            });

            it("throws if no arguments", function () {
                const clock = this.clock;

                assert.throws(() => {
                    clock.setImmediate();
                });
            });

            it("manages separate timers per clock instance", () => {
                const clock1 = fakeClock.createClock();
                const clock2 = fakeClock.createClock();
                const stubs = [stub(), stub()];

                clock1.setImmediate(stubs[0]);
                clock2.setImmediate(stubs[1]);
                clock2.tick(0);

                assert.false(stubs[0].called);
                assert(stubs[1].called);
            });

            it("passes extra parameters through to the callback", function () {
                const stb = stub();

                this.clock.setImmediate(stb, "value1", 2);
                this.clock.tick(1);

                assert(stb.calledWithExactly("value1", 2));
            });

            it("calls the given callback before setTimeout", function () {
                const stub1 = stub.create();
                const stub2 = stub.create();

                this.clock.setTimeout(stub1, 0);
                this.clock.setImmediate(stub2);
                this.clock.tick(0);

                assert(stub1.calledOnce);
                assert(stub2.calledOnce);
                assert(stub2.calledBefore(stub1));
            });

            it("does not stuck next tick even if nested", function () {
                const clock = this.clock;

                clock.setImmediate(function f() {
                    clock.setImmediate(f);
                });

                clock.tick(0);
            });
        });

        describe("clearImmediate", () => {
            beforeEach(function () {
                this.clock = fakeClock.createClock();
            });

            it("removes immediate callbacks", function () {
                const callback = stub();

                const id = this.clock.setImmediate(callback);
                this.clock.clearImmediate(id);
                this.clock.tick(1);

                assert.false(callback.called);
            });

            it("does not remove timeout", function () {
                const callback = stub();

                const id = this.clock.setTimeout(callback, 50);
                assert.throws(() => {
                    this.clock.clearImmediate(id);
                }, "Cannot clear timer: timer created with setTimeout() but cleared with clearImmediate()");
                this.clock.tick(55);

                assert.true(callback.called);
            });

            it("does not remove interval", function () {
                const callback = stub();

                const id = this.clock.setInterval(callback, 50);
                assert.throws(() => {
                    this.clock.clearImmediate(id);
                }, "Cannot clear timer: timer created with setInterval() but cleared with clearImmediate()");
                this.clock.tick(55);

                assert.true(callback.called);
            });
        });

        describe("tick", () => {
            beforeEach(function () {
                this.clock = fakeClock.install({ now: 0 });
            });

            afterEach(function () {
                this.clock.uninstall();
            });

            it("triggers immediately without specified delay", function () {
                const stb = stub();
                this.clock.setTimeout(stb);

                this.clock.tick(0);

                assert(stb.called);
            });

            it("does not trigger without sufficient delay", function () {
                const stb = stub();
                this.clock.setTimeout(stb, 100);
                this.clock.tick(10);

                assert.false(stb.called);
            });

            it("triggers after sufficient delay", function () {
                const stb = stub();
                this.clock.setTimeout(stb, 100);
                this.clock.tick(100);

                assert(stb.called);
            });

            it("triggers simultaneous timers", function () {
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);

                this.clock.tick(100);

                assert(spies[0].called);
                assert(spies[1].called);
            });

            it("triggers multiple simultaneous timers", function () {
                const spies = [spy(), spy(), spy(), spy()];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);
                this.clock.setTimeout(spies[2], 99);
                this.clock.setTimeout(spies[3], 100);

                this.clock.tick(100);

                assert(spies[0].called);
                assert(spies[1].called);
                assert(spies[2].called);
                assert(spies[3].called);
            });

            it("triggers multiple simultaneous timers with zero callAt", function () {
                const test = this;
                const spies = [
                    spy(() => {
                        test.clock.setTimeout(spies[1], 0);
                    }),
                    spy(),
                    spy()
                ];

                // First spy calls another setTimeout with delay=0
                this.clock.setTimeout(spies[0], 0);
                this.clock.setTimeout(spies[2], 10);

                this.clock.tick(10);

                assert(spies[0].called);
                assert(spies[1].called);
                assert(spies[2].called);
            });

            it("waits after setTimeout was called", function () {
                this.clock.tick(100);
                const stb = stub();
                this.clock.setTimeout(stb, 150);
                this.clock.tick(50);

                assert.false(stb.called);
                this.clock.tick(100);
                assert(stb.called);
            });

            it("mini integration test", function () {
                const stubs = [stub(), stub(), stub()];
                this.clock.setTimeout(stubs[0], 100);
                this.clock.setTimeout(stubs[1], 120);
                this.clock.tick(10);
                this.clock.tick(89);
                assert.false(stubs[0].called);
                assert.false(stubs[1].called);
                this.clock.setTimeout(stubs[2], 20);
                this.clock.tick(1);
                assert(stubs[0].called);
                assert.false(stubs[1].called);
                assert.false(stubs[2].called);
                this.clock.tick(19);
                assert.false(stubs[1].called);
                assert(stubs[2].called);
                this.clock.tick(1);
                assert(stubs[1].called);
            });

            it("triggers even when some throw", function () {
                const clock = this.clock;
                const stubs = [stub().throws(), stub()];

                clock.setTimeout(stubs[0], 100);
                clock.setTimeout(stubs[1], 120);

                assert.throws(() => {
                    clock.tick(120);
                });

                assert(stubs[0].called);
                assert(stubs[1].called);
            });

            it("calls function with global object or null (strict mode) as this", function () {
                const clock = this.clock;
                const stb = stub().throws();
                clock.setTimeout(stb, 100);

                assert.throws(() => {
                    clock.tick(100);
                });

                assert(stb.calledOn(global) || stb.calledOn(null));
            });

            it("triggers in the order scheduled", function () {
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 13);
                this.clock.setTimeout(spies[1], 11);

                this.clock.tick(15);

                assert(spies[1].calledBefore(spies[0]));
            });

            it("creates updated Date while ticking", function () {
                const s = spy();

                this.clock.setInterval(() => {
                    s(new Date().getTime());
                }, 10);

                this.clock.tick(100);

                assert.equal(s.callCount, 10);
                assert(s.calledWith(10));
                assert(s.calledWith(20));
                assert(s.calledWith(30));
                assert(s.calledWith(40));
                assert(s.calledWith(50));
                assert(s.calledWith(60));
                assert(s.calledWith(70));
                assert(s.calledWith(80));
                assert(s.calledWith(90));
                assert(s.calledWith(100));
            });

            it("fires timer in intervals of 13", function () {
                const s = spy();
                this.clock.setInterval(s, 13);

                this.clock.tick(500);

                assert.equal(s.callCount, 38);
            });

            it("fires timers in correct order", function () {
                const spy13 = spy();
                const spy10 = spy();

                this.clock.setInterval(() => {
                    spy13(new Date().getTime());
                }, 13);

                this.clock.setInterval(() => {
                    spy10(new Date().getTime());
                }, 10);

                this.clock.tick(500);

                assert.equal(spy13.callCount, 38);
                assert.equal(spy10.callCount, 50);

                assert(spy13.calledWith(416));
                assert(spy10.calledWith(320));

                assert(spy10.getCall(0).calledBefore(spy13.getCall(0)));
                assert(spy10.getCall(4).calledBefore(spy13.getCall(3)));
            });

            it("triggers timeouts and intervals in the order scheduled", function () {
                const spies = [spy(), spy()];
                this.clock.setInterval(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                this.clock.tick(100);

                assert(spies[0].calledBefore(spies[1]));
                assert.equal(spies[0].callCount, 10);
                assert.equal(spies[1].callCount, 1);
            });

            it("does not fire canceled intervals", function () {
                let id = null;
                const callback = spy(() => {
                    if (callback.callCount === 3) {
                        clearInterval(id);
                    }
                });

                id = this.clock.setInterval(callback, 10);
                this.clock.tick(100);

                assert.equal(callback.callCount, 3);
            });

            it("passes 8 seconds", function () {
                const s = spy();
                this.clock.setInterval(s, 4000);

                this.clock.tick("08");

                assert.equal(s.callCount, 2);
            });

            it("passes 1 minute", function () {
                const s = spy();
                this.clock.setInterval(s, 6000);

                this.clock.tick("01:00");

                assert.equal(s.callCount, 10);
            });

            it("passes 2 hours, 34 minutes and 10 seconds", function () {
                const s = spy();
                this.clock.setInterval(s, 10000);

                this.clock.tick("02:34:10");

                assert.equal(s.callCount, 925);
            });

            it("throws for invalid format", function () {
                const s = spy();
                this.clock.setInterval(s, 10000);
                const test = this;

                assert.throws(() => {
                    test.clock.tick("12:02:34:10");
                });

                assert.equal(s.callCount, 0);
            });

            it("throws for invalid minutes", function () {
                const s = spy();
                this.clock.setInterval(s, 10000);
                const test = this;

                assert.throws(() => {
                    test.clock.tick("67:10");
                });

                assert.equal(s.callCount, 0);
            });

            it("throws for negative minutes", function () {
                const s = spy();
                this.clock.setInterval(s, 10000);
                const test = this;

                assert.throws(() => {
                    test.clock.tick("-7:10");
                });

                assert.equal(s.callCount, 0);
            });

            it("treats missing argument as 0", function () {
                this.clock.tick();

                assert.equal(this.clock.now, 0);
            });

            it("fires nested setTimeout calls properly", function () {
                let i = 0;
                const clock = this.clock;

                const callback = function () {
                    ++i;
                    clock.setTimeout(() => {
                        callback();
                    }, 100);
                };

                callback();

                clock.tick(1000);

                assert.equal(i, 11);
            });

            it("does not silently catch errors", function () {
                const clock = this.clock;

                clock.setTimeout(() => {
                    throw new Error("oh no!");
                }, 1000);

                assert.throws(() => {
                    clock.tick(1000);
                });
            });

            it("returns the current now value", function () {
                const clock = this.clock;
                const value = clock.tick(200);
                assert.equal(clock.now, value);
            });

            it("is not influenced by forward system clock changes", function () {
                const clock = this.clock;
                const callback = function () {
                    clock.setSystemTime((new clock.Date()).getTime() + 1000);
                };
                const s = stub();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(s, 2000);
                clock.tick(1990);
                assert.equal(s.callCount, 0);
                clock.tick(20);
                assert.equal(s.callCount, 1);
            });

            it("is not influenced by forward system clock changes", function () {
                const clock = this.clock;
                const callback = function () {
                    clock.setSystemTime((new clock.Date()).getTime() - 1000);
                };
                const s = stub();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(s, 2000);
                clock.tick(1990);
                assert.equal(s.callCount, 0);
                clock.tick(20);
                assert.equal(s.callCount, 1);
            });

            it("is not influenced by forward system clock changes when an error is thrown", function () {
                const clock = this.clock;
                const callback = function () {
                    clock.setSystemTime((new clock.Date()).getTime() + 1000);
                    throw new Error();
                };
                const s = stub();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(s, 2000);
                assert.throws(() => {
                    clock.tick(1990);
                });
                assert.equal(s.callCount, 0);
                clock.tick(20);
                assert.equal(s.callCount, 1);
            });

            it("is not influenced by forward system clock changes when an error is thrown", function () {
                const clock = this.clock;
                const callback = function () {
                    clock.setSystemTime((new clock.Date()).getTime() - 1000);
                    throw new Error();
                };
                const s = stub();
                clock.setTimeout(callback, 1000);
                clock.setTimeout(s, 2000);
                assert.throws(() => {
                    clock.tick(1990);
                });
                assert.equal(s.callCount, 0);
                clock.tick(20);
                assert.equal(s.callCount, 1);
            });
        });

        describe("next", () => {
            beforeEach(function () {
                this.clock = fakeClock.install({ now: 0 });
            });

            afterEach(function () {
                this.clock.uninstall();
            });

            it("triggers the next timer", function () {
                const stb = stub();
                this.clock.setTimeout(stb, 100);

                this.clock.next();

                assert(stb.called);
            });

            it("does not trigger simultaneous timers", function () {
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);

                this.clock.next();

                assert(spies[0].called);
                assert.false(spies[1].called);
            });

            it("subsequent calls trigger simultaneous timers", function () {
                const spies = [spy(), spy(), spy(), spy()];
                this.clock.setTimeout(spies[0], 100);
                this.clock.setTimeout(spies[1], 100);
                this.clock.setTimeout(spies[2], 99);
                this.clock.setTimeout(spies[3], 100);

                this.clock.next();
                assert(spies[2].called);
                assert.false(spies[0].called);
                assert.false(spies[1].called);
                assert.false(spies[3].called);

                this.clock.next();
                assert(spies[0].called);
                assert.false(spies[1].called);
                assert.false(spies[3].called);

                this.clock.next();
                assert(spies[1].called);
                assert.false(spies[3].called);

                this.clock.next();
                assert(spies[3].called);
            });

            it("subsequent calls triggers simultaneous timers with zero callAt", function () {
                const test = this;
                const spies = [
                    spy(() => {
                        test.clock.setTimeout(spies[1], 0);
                    }),
                    spy(),
                    spy()
                ];

                // First spy calls another setTimeout with delay=0
                this.clock.setTimeout(spies[0], 0);
                this.clock.setTimeout(spies[2], 10);

                this.clock.next();
                assert(spies[0].called);
                assert.false(spies[1].called);

                this.clock.next();
                assert(spies[1].called);

                this.clock.next();
                assert(spies[2].called);
            });

            it("throws exception thrown by timer", function () {
                const clock = this.clock;
                const stb = stub().throws();

                clock.setTimeout(stb, 100);

                assert.throws(() => {
                    clock.next();
                });

                assert(stb.called);
            });

            it("calls function with global object or null (strict mode) as this", function () {
                const clock = this.clock;
                const stb = stub().throws();
                clock.setTimeout(stb, 100);

                assert.throws(() => {
                    clock.next();
                });

                assert(stb.calledOn(global) || stb.calledOn(null));
            });

            it("subsequent calls trigger in the order scheduled", function () {
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 13);
                this.clock.setTimeout(spies[1], 11);

                this.clock.next();
                this.clock.next();

                assert(spies[1].calledBefore(spies[0]));
            });

            it("subsequent calls create updated Date", function () {
                const s = spy();

                this.clock.setInterval(() => {
                    s(new Date().getTime());
                }, 10);

                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();

                assert.equal(s.callCount, 10);
                assert(s.calledWith(10));
                assert(s.calledWith(20));
                assert(s.calledWith(30));
                assert(s.calledWith(40));
                assert(s.calledWith(50));
                assert(s.calledWith(60));
                assert(s.calledWith(70));
                assert(s.calledWith(80));
                assert(s.calledWith(90));
                assert(s.calledWith(100));
            });

            it("subsequent calls trigger timeouts and intervals in the order scheduled", function () {
                const spies = [spy(), spy()];
                this.clock.setInterval(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();

                assert(spies[0].calledBefore(spies[1]));
                assert.equal(spies[0].callCount, 5);
                assert.equal(spies[1].callCount, 1);
            });

            it("subsequent calls do not fire canceled intervals", function () {
                let id = null;
                const callback = spy(() => {
                    if (callback.callCount === 3) {
                        clearInterval(id);
                    }
                });

                id = this.clock.setInterval(callback, 10);
                this.clock.next();
                this.clock.next();
                this.clock.next();
                this.clock.next();

                assert.equal(callback.callCount, 3);
            });

            it("advances the clock based on when the timer was supposed to be called", function () {
                const clock = this.clock;
                clock.setTimeout(spy(), 55);
                clock.next();
                assert.equal(clock.now, 55);
            });

            it("returns the current now value", function () {
                const clock = this.clock;
                clock.setTimeout(spy(), 55);
                const value = clock.next();
                assert.equal(clock.now, value);
            });
        });

        describe("runAll", () => {
            it("if there are no timers just return", function () {
                this.clock = fakeClock.createClock();
                this.clock.runAll();
            });

            it("runs all timers", function () {
                this.clock = fakeClock.createClock();
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                this.clock.runAll();

                assert(spies[0].called);
                assert(spies[1].called);
            });

            it("new timers added while running are also run", function () {
                this.clock = fakeClock.createClock();
                const test = this;
                const spies = [
                    spy(() => {
                        test.clock.setTimeout(spies[1], 50);
                    }),
                    spy()
                ];

                // Spy calls another setTimeout
                this.clock.setTimeout(spies[0], 10);

                this.clock.runAll();

                assert(spies[0].called);
                assert(spies[1].called);
            });

            it("throws before allowing infinite recursion", function () {
                this.clock = fakeClock.createClock();
                const test = this;
                const recursiveCallback = function () {
                    test.clock.setTimeout(recursiveCallback, 10);
                };

                this.clock.setTimeout(recursiveCallback, 10);

                assert.throws(() => {
                    test.clock.runAll();
                });
            });

            it("the loop limit can be set when creating a clock", function () {
                this.clock = fakeClock.createClock(0, 1);
                const test = this;

                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                assert.throws(() => {
                    test.clock.runAll();
                });
            });

            it("the loop limit can be set when installing a clock", function () {
                this.clock = fakeClock.install({ loopLimit: 1 });
                const test = this;

                const spies = [spy(), spy()];
                setTimeout(spies[0], 10);
                setTimeout(spies[1], 50);

                assert.throws(() => {
                    test.clock.runAll();
                });

                this.clock.uninstall();
            });
        });

        describe("runToLast", () => {
            it("returns current time when there are no timers", function () {
                this.clock = fakeClock.createClock();

                const time = this.clock.runToLast();

                assert.equal(time, 0);
            });

            it("runs all existing timers", function () {
                this.clock = fakeClock.createClock();
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                this.clock.runToLast();

                assert(spies[0].called);
                assert(spies[1].called);
            });

            it("returns time of the last timer", function () {
                this.clock = fakeClock.createClock();
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 50);

                const time = this.clock.runToLast();

                assert.equal(time, 50);
            });

            it("runs all existing timers when two timers are matched for being last", function () {
                this.clock = fakeClock.createClock();
                const spies = [spy(), spy()];
                this.clock.setTimeout(spies[0], 10);
                this.clock.setTimeout(spies[1], 10);

                this.clock.runToLast();

                assert(spies[0].called);
                assert(spies[1].called);
            });

            it("new timers added with a call time later than the last existing timer are NOT run", function () {
                this.clock = fakeClock.createClock();
                const test = this;
                const spies = [
                    spy(() => {
                        test.clock.setTimeout(spies[1], 50);
                    }),
                    spy()
                ];

                // Spy calls another setTimeout
                this.clock.setTimeout(spies[0], 10);

                this.clock.runToLast();

                assert.true(spies[0].called);
                assert.false(spies[1].called);
            });

            it("new timers added with a call time earlier than the last existing timer are run", function () {
                this.clock = fakeClock.createClock();
                const test = this;
                const spies = [
                    spy(),
                    spy(() => {
                        test.clock.setTimeout(spies[2], 50);
                    }),
                    spy()
                ];

                this.clock.setTimeout(spies[0], 100);
                // Spy calls another setTimeout
                this.clock.setTimeout(spies[1], 10);

                this.clock.runToLast();

                assert.true(spies[0].called);
                assert.true(spies[1].called);
                assert.true(spies[2].called);
            });

            it("new timers cannot cause an infinite loop", function () {
                this.clock = fakeClock.createClock();
                const test = this;
                const s = spy();
                const recursiveCallback = function () {
                    test.clock.setTimeout(recursiveCallback, 0);
                };

                this.clock.setTimeout(recursiveCallback, 0);
                this.clock.setTimeout(s, 100);

                this.clock.runToLast();

                assert.true(s.called);
            });
        });

        describe("clearTimeout", () => {
            beforeEach(function () {
                this.clock = fakeClock.createClock();
            });

            it("removes timeout", function () {
                const stb = stub();
                const id = this.clock.setTimeout(stb, 50);
                this.clock.clearTimeout(id);
                this.clock.tick(50);

                assert.false(stb.called);
            });

            it("does not remove interval", function () {
                const stb = stub();
                const id = this.clock.setInterval(stb, 50);
                assert.throws(() => {
                    this.clock.clearTimeout(id);
                }, "Cannot clear timer: timer created with setInterval() but cleared with clearTimeout()");
                this.clock.tick(50);

                assert.true(stb.called);
            });

            it("does not remove interval with undefined interval", function () {
                const s = stub();
                const id = this.clock.setInterval(s);
                assert.throws(() => {
                    this.clock.clearTimeout(id);
                }, "Cannot clear timer: timer created with setInterval() but cleared with clearTimeout()");
                this.clock.tick(50);

                assert.true(s.called);
            });

            it("does not remove immediate", function () {
                const stb = stub();
                const id = this.clock.setImmediate(stb);
                assert.throws(() => {
                    this.clock.clearTimeout(id);
                }, "Cannot clear timer: timer created with setImmediate() but cleared with clearTimeout()");
                this.clock.tick(50);

                assert.true(stb.called);
            });

            it("ignores null argument", function () {
                this.clock.clearTimeout(null);
                assert(true); // doesn't fail
            });
        });

        describe("reset", () => {

            beforeEach(function () {
                this.clock = fakeClock.createClock();
            });

            it("empties timeouts queue", function () {
                const stb = stub();
                this.clock.setTimeout(stb);
                this.clock.reset();
                this.clock.tick(0);

                assert.false(stb.called);
            });
        });

        describe("setInterval", () => {
            beforeEach(function () {
                this.clock = fakeClock.createClock();
            });

            it("throws if no arguments", function () {
                const clock = this.clock;

                assert.throws(() => {
                    clock.setInterval();
                });
            });

            it("returns numeric id or object with numeric id", function () {
                const result = this.clock.setInterval("");

                if (is.object(result)) {
                    assert.number(result.id);
                } else {
                    assert.number(result);
                }
            });

            it("returns unique id", function () {
                const id1 = this.clock.setInterval("");
                const id2 = this.clock.setInterval("");

                assert.notEqual(id2, id1);
            });

            it("schedules recurring timeout", function () {
                const stb = stub();
                this.clock.setInterval(stb, 10);
                this.clock.tick(99);

                assert.equal(stb.callCount, 9);
            });

            it("is not influenced by forward system clock changes", function () {
                const stb = stub();
                this.clock.setInterval(stb, 10);
                this.clock.tick(11);
                assert.equal(stb.callCount, 1);
                this.clock.setSystemTime((new this.clock.Date()).getTime() + 1000);
                this.clock.tick(8);
                assert.equal(stb.callCount, 1);
                this.clock.tick(3);
                assert.equal(stb.callCount, 2);
            });

            it("is not influenced by backward system clock changes", function () {
                const stb = stub();
                this.clock.setInterval(stb, 10);
                this.clock.tick(5);
                this.clock.setSystemTime((new this.clock.Date()).getTime() - 1000);
                this.clock.tick(6);
                assert.equal(stb.callCount, 1);
                this.clock.tick(10);
                assert.equal(stb.callCount, 2);
            });

            it("does not schedule recurring timeout when cleared", function () {
                const clock = this.clock;
                let id = null;
                const stb = spy(() => {
                    if (stb.callCount === 3) {
                        clock.clearInterval(id);
                    }
                });

                id = this.clock.setInterval(stb, 10);
                this.clock.tick(100);

                assert.equal(stb.callCount, 3);
            });

            it("passes setTimeout parameters", () => {
                const clock = fakeClock.createClock();
                const stb = stub();

                clock.setInterval(stb, 2, "the first", "the second");

                clock.tick(3);

                assert.true(stb.calledWithExactly("the first", "the second"));
            });
        });

        describe("clearInterval", () => {
            beforeEach(function () {
                this.clock = fakeClock.createClock();
            });

            it("removes interval", function () {
                const stb = stub();
                const id = this.clock.setInterval(stb, 50);
                this.clock.clearInterval(id);
                this.clock.tick(50);

                assert.false(stb.called);
            });

            it("removes interval with undefined interval", function () {
                const s = stub();
                const id = this.clock.setInterval(s);
                this.clock.clearInterval(id);
                this.clock.tick(50);

                assert.false(s.called);
            });

            it("does not remove timeout", function () {
                const stb = stub();
                const id = this.clock.setTimeout(stb, 50);
                assert.throws(() => {
                    this.clock.clearInterval(id);
                }, "Cannot clear timer: timer created with setTimeout() but cleared with clearInterval()");
                this.clock.tick(50);
                assert.true(stb.called);
            });

            it("does not remove immediate", function () {
                const stb = stub();
                const id = this.clock.setImmediate(stb);
                assert.throws(() => {
                    this.clock.clearInterval(id);
                }, "Cannot clear timer: timer created with setImmediate() but cleared with clearInterval()");
                this.clock.tick(50);

                assert.true(stb.called);
            });

            it("ignores null argument", function () {
                this.clock.clearInterval(null);
                assert(true); // doesn't fail
            });
        });

        describe("date", () => {
            beforeEach(function () {
                this.now = new GlobalDate().getTime() - 3000;
                this.clock = fakeClock.createClock(this.now);
                this.Date = global.Date;
            });

            afterEach(function () {
                global.Date = this.Date;
            });

            it("provides date constructor", function () {
                assert.function(this.clock.Date);
            });

            it("creates real Date objects", function () {
                const date = new this.clock.Date();

                assert(Date.prototype.isPrototypeOf(date));
            });

            it("creates real Date objects when called as function", function () {
                const date = this.clock.Date();

                assert(Date.prototype.isPrototypeOf(date));
            });

            it("creates real Date objects when Date constructor is gone", function () {
                const realDate = new Date();
                global.Date = noop; // eslint-disable-line no-native-reassign
                global.Date = noop;

                const date = new this.clock.Date();

                assert.deepEqual(date.constructor.prototype, realDate.constructor.prototype);
            });

            it("creates Date objects representing clock time", function () {
                const date = new this.clock.Date();

                assert.equal(date.getTime(), new Date(this.now).getTime());
            });

            it("returns Date object representing clock time", function () {
                const date = this.clock.Date();

                assert.equal(date.getTime(), new Date(this.now).getTime());
            });

            it("listens to ticking clock", function () {
                const date1 = new this.clock.Date();
                this.clock.tick(3);
                const date2 = new this.clock.Date();

                assert.equal(date2.getTime() - date1.getTime(), 3);
            });

            it("listens to system clock changes", function () {
                const date1 = new this.clock.Date();
                this.clock.setSystemTime(date1.getTime() + 1000);
                const date2 = new this.clock.Date();

                assert.equal(date2.getTime() - date1.getTime(), 1000);
            });

            it("creates regular date when passing timestamp", function () {
                const date = new Date();
                const fakeDate = new this.clock.Date(date.getTime());

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing a date as string", function () {
                const date = new Date();
                const fakeDate = new this.clock.Date(date.toISOString());

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing a date as RFC 2822 string", function () {
                const date = new Date("Sat Apr 12 2014 12:22:00 GMT+1000");
                const fakeDate = new this.clock.Date("Sat Apr 12 2014 12:22:00 GMT+1000");

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with timestamp", function () {
                const date = new Date();
                const fakeDate = this.clock.Date(date.getTime());

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing year, month", function () {
                const date = new Date(2010, 4);
                const fakeDate = new this.clock.Date(2010, 4);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with year, month", function () {
                const date = new Date(2010, 4);
                const fakeDate = this.clock.Date(2010, 4);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing y, m, d", function () {
                const date = new Date(2010, 4, 2);
                const fakeDate = new this.clock.Date(2010, 4, 2);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with y, m, d", function () {
                const date = new Date(2010, 4, 2);
                const fakeDate = this.clock.Date(2010, 4, 2);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing y, m, d, h", function () {
                const date = new Date(2010, 4, 2, 12);
                const fakeDate = new this.clock.Date(2010, 4, 2, 12);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with y, m, d, h", function () {
                const date = new Date(2010, 4, 2, 12);
                const fakeDate = this.clock.Date(2010, 4, 2, 12);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing y, m, d, h, m", function () {
                const date = new Date(2010, 4, 2, 12, 42);
                const fakeDate = new this.clock.Date(2010, 4, 2, 12, 42);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with y, m, d, h, m", function () {
                const date = new Date(2010, 4, 2, 12, 42);
                const fakeDate = this.clock.Date(2010, 4, 2, 12, 42);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing y, m, d, h, m, s", function () {
                const date = new Date(2010, 4, 2, 12, 42, 53);
                const fakeDate = new this.clock.Date(2010, 4, 2, 12, 42, 53);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with y, m, d, h, m, s", function () {
                const date = new Date(2010, 4, 2, 12, 42, 53);
                const fakeDate = this.clock.Date(2010, 4, 2, 12, 42, 53);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("creates regular date when passing y, m, d, h, m, s, ms", function () {
                const date = new Date(2010, 4, 2, 12, 42, 53, 498);
                const fakeDate = new this.clock.Date(2010, 4, 2, 12, 42, 53, 498);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("returns regular date when calling with y, m, d, h, m, s, ms", function () {
                const date = new Date(2010, 4, 2, 12, 42, 53, 498);
                const fakeDate = this.clock.Date(2010, 4, 2, 12, 42, 53, 498);

                assert.equal(fakeDate.getTime(), date.getTime());
            });

            it("mirrors native Date.prototype", function () {
                assert.deepEqual(this.clock.Date.prototype, Date.prototype);
            });

            it("supports now method if present", function () {
                assert.deepEqual(typeof this.clock.Date.now, typeof Date.now);
            });

            if (Date.now) {
                describe("now", () => {
                    it("returns clock.now", function () {
                        /* eslint camelcase: "off" */
                        const clock_now = this.clock.Date.now();
                        const global_now = GlobalDate.now();

                        assert(this.now <= clock_now && clock_now <= global_now);
                    });
                });
            } else {
                describe("unsupported now", () => {
                    it("is undefined", function () {
                        assert.undefined(this.clock.Date.now);
                    });
                });
            }

            it("mirrors parse method", function () {
                assert.deepEqual(this.clock.Date.parse, Date.parse);
            });

            it("mirrors UTC method", function () {
                assert.deepEqual(this.clock.Date.UTC, Date.UTC);
            });

            it("mirrors toUTCString method", function () {
                assert.deepEqual(this.clock.Date.prototype.toUTCString, Date.prototype.toUTCString);
            });

            if (Date.toSource) {
                describe("toSource", () => {

                    it("is mirrored", function () {
                        assert.deepEqual(this.clock.Date.toSource(), Date.toSource());
                    });

                });
            } else {
                describe("unsupported toSource", () => {

                    it("is undefined", function () {
                        assert.undefined(this.clock.Date.toSource);
                    });

                });
            }

            it("mirrors toString", function () {
                assert.deepEqual(this.clock.Date.toString(), Date.toString());
            });
        });

        describe("stubTimers", () => {
            beforeEach(function () {
                this.dateNow = global.Date.now;
            });

            afterEach(function () {
                if (this.clock) {
                    this.clock.uninstall();
                }

                clearTimeout(this.timer);
                if (is.undefined(this.dateNow)) {
                    delete global.Date.now;
                } else {
                    global.Date.now = this.dateNow;
                }
            });

            it("returns clock object", function () {
                this.clock = fakeClock.install();

                assert.object(this.clock);
                assert.function(this.clock.tick);
            });

            it("has clock property", function () {
                this.clock = fakeClock.install();

                assert.deepEqual(setTimeout.clock, this.clock);
                assert.deepEqual(clearTimeout.clock, this.clock);
                assert.deepEqual(setInterval.clock, this.clock);
                assert.deepEqual(clearInterval.clock, this.clock);
                assert.deepEqual(Date.clock, this.clock);
            });

            it("takes an object parameter", function () {
                this.clock = fakeClock.install({});
            });

            it.skip("throws a TypeError on a number parameter", () => {
                assert.throws(function () {
                    this.clock = fakeClock.install(0);
                });
            });

            it("sets initial timestamp", function () {
                this.clock = fakeClock.install({ now: 1400 });

                assert.equal(this.clock.now, 1400);
            });

            it("replaces global setTimeout", function () {
                this.clock = fakeClock.install();
                const stb = stub();

                setTimeout(stb, 1000);
                this.clock.tick(1000);

                assert(stb.called);
            });

            it("global fake setTimeout should return id", function () {
                this.clock = fakeClock.install();
                const stb = stub();

                const to = setTimeout(stb, 1000);

                if (is.object(setTimeout(noop, 0))) {
                    assert.number(to.id);
                    assert.function(to.ref);
                    assert.function(to.unref);
                } else {
                    assert.number(to);
                }
            });

            it("replaces global clearTimeout", function () {
                this.clock = fakeClock.install();
                const stb = stub();

                clearTimeout(setTimeout(stb, 1000));
                this.clock.tick(1000);

                assert.false(stb.called);
            });

            it("uninstalls global setTimeout", function () {
                this.clock = fakeClock.install();
                const stb = stub();
                this.clock.uninstall();

                this.timer = setTimeout(stb, 1000);
                this.clock.tick(1000);

                assert.false(stb.called);
                assert.deepEqual(setTimeout, fakeClock.timers.setTimeout);
            });

            it("uninstalls global clearTimeout", function () {
                this.clock = fakeClock.install();
                stub();
                this.clock.uninstall();

                assert.deepEqual(clearTimeout, fakeClock.timers.clearTimeout);
            });

            it("replaces global setInterval", function () {
                this.clock = fakeClock.install();
                const stb = stub();

                setInterval(stb, 500);
                this.clock.tick(1000);

                assert(stb.calledTwice);
            });

            it("replaces global clearInterval", function () {
                this.clock = fakeClock.install();
                const stb = stub();

                clearInterval(setInterval(stb, 500));
                this.clock.tick(1000);

                assert.false(stb.called);
            });

            it("uninstalls global setInterval", function () {
                this.clock = fakeClock.install();
                const stb = stub();
                this.clock.uninstall();

                this.timer = setInterval(stb, 1000);
                this.clock.tick(1000);

                assert.false(stb.called);
                assert.deepEqual(setInterval, fakeClock.timers.setInterval);
            });

            it("uninstalls global clearInterval", function () {
                this.clock = fakeClock.install();
                stub();
                this.clock.uninstall();

                assert.deepEqual(clearInterval, fakeClock.timers.clearInterval);
            });

            it("replaces global process.hrtime", function () {
                this.clock = fakeClock.install();
                const prev = process.hrtime();
                this.clock.tick(1000);
                const result = process.hrtime(prev);
                assert.deepEqual(result[0], 1);
                assert.deepEqual(result[1], 0);
            });

            it("uninstalls global process.hrtime", function () {
                this.clock = fakeClock.install();
                this.clock.uninstall();
                assert.deepEqual(process.hrtime, fakeClock.timers.hrtime);
                const prev = process.hrtime();
                this.clock.tick(1000);
                const result = process.hrtime(prev);
                assert.deepEqual(result[0], 0);
            });

            if (Object.getPrototypeOf(global)) {
                delete global.hasOwnPropertyTest;
                Object.getPrototypeOf(global).hasOwnPropertyTest = function () { };

                if (!global.hasOwnProperty("hasOwnPropertyTest")) {
                    it("deletes global property on uninstall if it was inherited onto the global object", function () {
                        // Give the global object an inherited 'tick' method
                        delete global.tick;
                        Object.getPrototypeOf(global).tick = function () { };

                        this.clock = fakeClock.install({ now: 0, toFake: ["tick"] });
                        assert.true(global.hasOwnProperty("tick"));
                        this.clock.uninstall();

                        assert.false(global.hasOwnProperty("tick"));
                        delete Object.getPrototypeOf(global).tick;
                    });
                }

                delete Object.getPrototypeOf(global).hasOwnPropertyTest;
            }

            it("uninstalls global property on uninstall if it is present on the global object itself", function () {
                // Directly give the global object a tick method
                global.tick = noop;

                this.clock = fakeClock.install({ now: 0, toFake: ["tick"] });
                assert.true(global.hasOwnProperty("tick"));
                this.clock.uninstall();

                assert.true(global.hasOwnProperty("tick"));
                delete global.tick;
            });

            it("fakes Date constructor", function () {
                this.clock = fakeClock.install({ now: 0 });
                const now = new Date();

                assert.notDeepEqual(Date, fakeClock.timers.Date);
                assert.equal(now.getTime(), 0);
            });

            it("fake Date constructor should mirror Date's properties", function () {
                this.clock = fakeClock.install({ now: 0 });

                assert(Boolean(Date.parse));
                assert(Boolean(Date.UTC));
            });

            it("decide on Date.now support at call-time when supported", function () {
                global.Date.now = noop;
                this.clock = fakeClock.install({ now: 0 });

                assert.equal(typeof Date.now, "function");
            });

            it("decide on Date.now support at call-time when unsupported", function () {
                global.Date.now = undefined;
                this.clock = fakeClock.install({ now: 0 });

                assert.undefined(Date.now);
            });

            it("mirrors custom Date properties", function () {
                const f = function () {
                    return "";
                };
                global.Date.format = f;
                this.clock = fakeClock.install();

                assert.equal(Date.format, f);
            });

            it("uninstalls Date constructor", function () {
                this.clock = fakeClock.install({ now: 0 });
                this.clock.uninstall();

                assert.deepEqual(GlobalDate, fakeClock.timers.Date);
            });

            it("fakes provided methods", function () {
                this.clock = fakeClock.install({ now: 0, toFake: ["setTimeout", "Date", "setImmediate"] });

                assert.notDeepEqual(setTimeout, fakeClock.timers.setTimeout);
                assert.notDeepEqual(Date, fakeClock.timers.Date);
            });

            it("resets faked methods", function () {
                this.clock = fakeClock.install({ now: 0, toFake: ["setTimeout", "Date", "setImmediate"] });
                this.clock.uninstall();

                assert.deepEqual(setTimeout, fakeClock.timers.setTimeout);
                assert.deepEqual(Date, fakeClock.timers.Date);
            });

            it("does not fake methods not provided", function () {
                this.clock = fakeClock.install({ now: 0, toFake: ["setTimeout", "Date", "setImmediate"] });

                assert.deepEqual(clearTimeout, fakeClock.timers.clearTimeout);
                assert.deepEqual(setInterval, fakeClock.timers.setInterval);
                assert.deepEqual(clearInterval, fakeClock.timers.clearInterval);
            });
        });

        describe("shouldAdvanceTime", () => {
            it("should create an auto advancing timer", (done) => {
                const testDelay = 29;
                const date = new Date("2015-09-25");
                const clock = fakeClock.install({ now: date, shouldAdvanceTime: true });
                assert.equal(Date.now(), 1443139200000);
                const timeoutStarted = Date.now();

                setTimeout(() => {
                    const timeDifference = Date.now() - timeoutStarted;
                    assert.equal(timeDifference, testDelay);
                    clock.uninstall();
                    done();
                }, testDelay);
            });

            it("should test setImmediate", (done) => {
                const date = new Date("2015-09-25");
                const clock = fakeClock.install({ now: date, shouldAdvanceTime: true });
                assert.equal(Date.now(), 1443139200000);
                const timeoutStarted = Date.now();

                setImmediate(() => {
                    const timeDifference = Date.now() - timeoutStarted;
                    assert.equal(timeDifference, 0);
                    clock.uninstall();
                    done();
                });
            });

            it("should test setInterval", (done) => {
                const interval = 20;
                let intervalsTriggered = 0;
                const cyclesToTrigger = 3;
                const date = new Date("2015-09-25");
                const clock = fakeClock.install({ now: date, shouldAdvanceTime: true });
                assert.equal(Date.now(), 1443139200000);
                const timeoutStarted = Date.now();

                const intervalId = setInterval(() => {
                    if (++intervalsTriggered === cyclesToTrigger) {
                        clearInterval(intervalId);
                        const timeDifference = Date.now() - timeoutStarted;
                        assert.equal(timeDifference, interval * cyclesToTrigger);
                        clock.uninstall();
                        done();
                    }
                }, interval);
            });
        });

        describe("process.hrtime()", () => {
            afterEach(function () {
                if (this.clock) {
                    this.clock.uninstall();
                }
            });

            it("should start at 0", () => {
                const clock = fakeClock.createClock(1001);
                const result = clock.hrtime();
                assert.deepEqual(result[0], 0);
                assert.deepEqual(result[1], 0);
            });

            it("should run along with clock.tick", () => {
                const clock = fakeClock.createClock(0);
                clock.tick(5001);
                const prev = clock.hrtime();
                clock.tick(5001);
                const result = clock.hrtime(prev);
                assert.deepEqual(result[0], 5);
                assert.deepEqual(result[1], 1000000);
            });

            it("should run along with clock.tick when timers set", () => {
                const clock = fakeClock.createClock(0);
                const prev = clock.hrtime();
                clock.setTimeout(() => {
                    const result = clock.hrtime(prev);
                    assert.deepEqual(result[0], 2);
                    assert.deepEqual(result[1], 500000000);
                }, 2500);
                clock.tick(5000);
            });

            it("should not move with setSystemTime", () => {
                const clock = fakeClock.createClock(0);
                const prev = clock.hrtime();
                clock.setSystemTime(50000);
                const result = clock.hrtime(prev);
                assert.deepEqual(result[0], 0);
                assert.deepEqual(result[1], 0);
            });

            it("should move with timeouts", () => {
                const clock = fakeClock.createClock();
                let result = clock.hrtime();
                assert.equal(result[0], 0);
                assert.equal(result[1], 0);
                clock.setTimeout(() => { }, 1000);
                clock.runAll();
                result = clock.hrtime();
                assert.equal(result[0], 1);
                assert.equal(result[1], 0);
            });
        });

        describe("microtask semantics", () => {
            it("runs without timers", () => {
                const clock = fakeClock.createClock();
                let called = false;
                clock.nextTick(() => {
                    called = true;
                });
                clock.runAll();
                assert(called);
            });

            it("runs with timers - and before them", () => {
                const clock = fakeClock.createClock();
                let last = "";
                let called = false;
                clock.nextTick(() => {
                    called = true;
                    last = "tick";
                });
                clock.setTimeout(() => {
                    last = "timeout";
                });
                clock.runAll();
                assert(called);
                assert.equal(last, "timeout");
            });

            it("runs when time is progressed", () => {
                const clock = fakeClock.createClock();
                let called = false;
                clock.nextTick(() => {
                    called = true;
                });
                assert(!called);
                clock.tick(0);
                assert(called);
            });

            it("runs between timers", () => {
                const clock = fakeClock.createClock();
                const order = [];
                clock.setTimeout(() => {
                    order.push("timer-1");
                    clock.nextTick(() => {
                        order.push("tick");
                    });
                });

                clock.setTimeout(() => {
                    order.push("timer-2");
                });
                clock.runAll();
                assert.equal(order[0], "timer-1");
                assert.equal(order[1], "tick");
                assert.equal(order[2], "timer-2");
            });

            it("installs with microticks", () => {
                const clock = fakeClock.install({ toFake: ["nextTick"] });
                let called = false;
                process.nextTick(() => {
                    called = true;
                });
                clock.runAll();
                assert(called);
                clock.uninstall();
            });

            it("installs with microticks and timers in order", () => {
                const clock = fakeClock.install({ toFake: ["nextTick", "setTimeout"] });
                const order = [];
                setTimeout(() => {
                    order.push("timer-1");
                    process.nextTick(() => {
                        order.push("tick");
                    });
                });
                setTimeout(() => {
                    order.push("timer-2");
                });
                clock.runAll();
                assert.equal(order[0], "timer-1");
                assert.equal(order[1], "tick");
                assert.equal(order[2], "timer-2");
                clock.uninstall();
            });

            it("uninstalls", () => {
                const clock = fakeClock.install({ toFake: ["nextTick"] });
                clock.uninstall();
                let called = false;
                process.nextTick(() => {
                    called = true;
                });
                clock.runAll();
                assert(!called);
                clock.uninstall();
            });

            it("returns an empty list of timers on immediate uninstall", () => {
                const clock = fakeClock.install();
                const timers = clock.uninstall();
                assert.deepEqual(timers, []);
            });


            it("returns a timer if uninstalling before it's called", () => {
                const clock = fakeClock.install();
                clock.setTimeout(() => { }, 100);
                const timers = clock.uninstall();
                assert.equal(timers.length, 1);
                assert.equal(timers[0].createdAt, clock.now);
                assert.equal(timers[0].callAt, clock.now + 100);
                assert(!is.undefined(timers[0].id));
            });

            it("does not return already executed timers on uninstall", () => {
                const clock = fakeClock.install();
                clock.setTimeout(() => { }, 100);
                clock.setTimeout(() => { }, 200);
                clock.tick(100);
                const timers = clock.uninstall();
                assert.equal(timers.length, 1);
                assert.equal(timers[0].createdAt, clock.now - 100);
                assert.equal(timers[0].callAt, clock.now + 100);
                assert(!is.undefined(timers[0].id));
            });

            it("returns multiple timers on uninstall if created", () => {
                const clock = fakeClock.install();
                for (let i = 0; i < 5; i++) {
                    clock.setTimeout(() => { }, 100 * i);
                }
                const timers = clock.uninstall();
                assert.equal(timers.length, 5);
                for (let i = 0; i < 5; i++) {
                    assert.equal(timers[i].createdAt, clock.now);
                    assert.equal(timers[i].callAt, clock.now + 100 * i);
                }
                assert(!is.undefined(timers[0].id));
            });

            it("passes arguments when installed - GitHub#122", () => {
                const clock = fakeClock.install({ toFake: ["nextTick"] });
                let called = false;
                process.nextTick((value) => {
                    called = value;
                }, true);
                clock.runAll();
                assert(called);
                clock.uninstall();
            });

            it("does not install by default - GitHub#126", (done) => {
                const clock = fakeClock.install();
                const s = spy(clock, "nextTick");
                let called = false;
                process.nextTick((value) => {
                    called = value;
                    assert(called);
                    assert(!s.called);
                    clock.uninstall();
                    done();
                }, true);
            });
        });
    });
});
