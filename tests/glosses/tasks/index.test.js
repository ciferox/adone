const {
    is,
    promise,
    task,
    error
} = adone;

describe("task", () => {
    let manager;

    class SCTask extends task.Task {
        constructor() {
            super();
            this._runDefer = null;
            this._suspendDefer = null;
            this._cancelDefer = null;
            this.reallySuspended = false;
            this.reallyResumed = false;
        }

        async run(suspendable = false, cancelable = false, maxTimeout = 1000) {
            this._maxTicks = maxTimeout / 10;
            this._suspendable = suspendable;
            this._cancelable = cancelable;
            this.data = 0;
            this._runDefer = promise.defer();
            this._run();
            return this._runDefer.promise;
        }

        async _run() {
            this.reallySuspended = false;
            for (; ;) {
                await promise.delay(10); // eslint-disable-line
                this.data++;
                if (this.data >= this._maxTicks) {
                    this._runDefer.resolve(this.data);
                    return;
                }

                if (!is.null(this._suspendDefer)) {
                    this._suspendDefer.resolve();
                    this.reallyResumed = false;
                    this.reallySuspended = true;
                    return;
                }
                if (!is.null(this._cancelDefer)) {
                    this._runDefer.resolve(this.data);
                    await adone.promise.delay(300); // eslint-disable-line
                    this._cancelDefer.resolve();
                    return;
                }
            }
        }

        isSuspendable() {
            return this._suspendable;
        }

        isCancelable() {
            return this._cancelable;
        }

        suspend(defer) {
            this._suspendDefer = defer;
        }

        async resume(defer) {
            adone.promise.delay(200).then(() => {
                this._suspendDefer = null;
                this._run();
                this.reallyResumed = true;
                defer.resolve();
            });
        }

        cancel(defer) {
            this._cancelDefer = defer;
        }
    }

    class SimpleTask extends task.Task {
        constructor() {
            super();
            this.value = 0;
        }

        async run(value, timeout) {
            this.value++;
            if (is.number(timeout)) {
                await adone.promise.delay(timeout);
            }
            return value;
        }
    }

    beforeEach(() => {
        manager = new task.Manager();
    });

    it("task prototype", () => {
        const t = new adone.task.Task();

        assert.true(is.task(t));
        assert.null(t.manager);
        assert.null(t.observer);
        assert.throws(() => t.manager = undefined, adone.error.NotAllowedException);
        assert.throws(() => t.observer = undefined, adone.error.NotAllowedException);

        assert.function(t.run);
        assert.throws(() => t.run(), adone.error.NotImplementedException);

        assert.function(t.isSuspendable);
        assert.function(t.isCancelable);

        assert.function(t.suspend);
        assert.function(t.resume);
        assert.function(t.cancel);
    });

    it("by default, task should not be suspendable", () => {
        const t = new adone.task.Task();
        assert.false(t.isSuspendable());
    });

    it("by default, task should not be cancelable", () => {
        const t = new adone.task.Task();
        assert.false(t.isCancelable());
    });

    it("construct manager", () => {
        assert.true(is.taskManager(manager));
        assert.lengthOf(manager.getTaskNames(), 0);
    });

    it("adone.is.task() should be defined", () => {
        class MyTask extends task.Task {
        }

        assert.true(adone.is.task(new MyTask()));
    });

    it("should add only valid task", async () => {
        const InvalidTask1 = null;
        const InvalidTask2 = {};
        class InvalidTask3 {
            run() {
                return "invalid";
            }
        }

        class ValidTask extends task.Task {
            run() {
                return "ok";
            }
        }

        const invalidTasks = [
            InvalidTask1,
            InvalidTask2,
            InvalidTask3
        ];

        for (const InvalidTask of invalidTasks) {
            const err = await assert.throws(async () => manager.addTask("task", InvalidTask)); // eslint-disable-line
            assert.instanceOf(err, error.NotValidException);
        }

        await manager.addTask("task", ValidTask);
        assert.sameMembers(manager.getTaskNames(), ["task"]);
    });

    it("task's immutable properties", async () => {
        const props = [
            {
                name: "manager",
                expected: manager,
                createNew: () => new task.Manager()
            },
            {
                name: "observer",
                expected: null,
                createNew: () => ({})
            }
        ];

        class TaskA extends task.Task {
            run() {
            }
        }

        await manager.addTask("task", TaskA);
        const taskA = await manager.getTaskInstance("task");

        for (const prop of props) {
            assert.strictEqual(taskA[prop.name], prop.expected);
            assert.throws(() => taskA[prop.name] = prop.createNew(), adone.error.NotAllowedException);
        }
    });

    it("run task", async () => {
        await manager.addTask("a", SimpleTask);
        const observer = await manager.run("a", adone.package.version);
        assert.true(adone.is.taskObserver(observer));
        assert.true(observer.isCompleted());
        assert.equal(await observer.result, adone.package.version);
        assert.true(observer.isCompleted());
    });

    it("regular task is stateless", async () => {
        await manager.addTask("a", SimpleTask);
        const observer1 = await manager.run("a", adone.package.version);
        const observer2 = await manager.run("a", adone.package.version);
        await Promise.all([observer1.result, observer2.result]);
        assert.strictEqual(observer1.task.value, 1);
        assert.strictEqual(observer1.task.value, observer1.task.value);
    });

    it("observer should contain correct error info for sync task", async () => {
        class TaskA extends task.Task {
            run() {
                throw new adone.error.RuntimeException("sad");
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        const err = await assert.throws(async () => observer.result);
        assert.true(observer.isFailed());
        assert.instanceOf(observer.error, adone.error.RuntimeException);
        assert.instanceOf(err, adone.error.RuntimeException);
    });

    it("observer should contain correct error info for async task", async () => {
        class TaskA extends task.Task {
            async run() {
                await promise.delay(10);
                throw new adone.error.RuntimeException("sad");
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        const err = await assert.throws(async () => observer.result);
        assert.true(observer.isFailed());
        assert.instanceOf(observer.error, adone.error.RuntimeException);
        assert.instanceOf(err, adone.error.RuntimeException);
    });

    it("run async task", async () => {
        class TaskA extends task.Task {
            async run(version) {
                await promise.delay(10);
                return `adone ${version}`;
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        assert.true(observer.isRunning());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.true(observer.isCompleted());
    });

    it("delete nonexisting task", async () => {
        const err = await assert.throws(async () => manager.deleteTask("unknown"));
        assert.instanceOf(err, adone.error.NotExistsException);
    });

    it("delete existing task", async () => {
        class TaskA extends task.Task {
            run() {
                return 0;
            }
        }

        await manager.addTask("a", TaskA);
        assert.sameMembers(manager.getTaskNames(), ["a"]);
        await manager.deleteTask("a");
        assert.lengthOf(manager.getTaskNames(), 0);
    });

    it("run task once", async () => {
        const observer = await manager.runOnce(SimpleTask, adone.package.version);
        assert.lengthOf(manager.getTaskNames(), 0);
        assert.true(observer.isCompleted());
        assert.equal(await observer.result, adone.package.version);
        assert.true(observer.isCompleted());
    });

    it("run async task once", async () => {
        class TaskA extends task.Task {
            async run(version) {
                await promise.delay(10);
                return `adone ${version}`;
            }
        }

        const observer = await manager.runOnce(TaskA, adone.package.version);
        assert.lengthOf(manager.getTaskNames(), 0);
        assert.true(observer.isRunning());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.true(observer.isCompleted());
    });

    it("run deleted but still running task should have thrown", async () => {
        class TaskA extends task.Task {
            async run(version) {
                await promise.delay(100);
                return `adone ${version}`;
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        await manager.deleteTask("a");
        await assert.throws(async () => manager.run("a", adone.package.version), adone.error.NotExistsException);

        assert.lengthOf(manager.getTaskNames(), 0);
        assert.true(observer.isRunning());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.true(observer.isCompleted());
    });

    describe("singleton tasks", () => {
        it("correct value of 'manager' property in task", async () => {
            await manager.addTask("a", SimpleTask, {
                singleton: true
            });

            const observer = await manager.run("a");
            await observer.result;
            assert.notNull(observer.task.manager);
        });

        it("singleton task is stateful", async () => {
            await manager.addTask("a", SimpleTask, {
                singleton: true
            });
            const observer1 = await manager.run("a", adone.package.version);
            const observer2 = await manager.run("a", adone.package.version);
            await Promise.all([observer1.result, observer2.result]);
            assert.strictEqual(observer1.task.value, 2);
            assert.deepEqual(observer1.task, observer1.task);
        });

        it("deletion of singleton task should be performed immediately", async () => {
            await manager.addTask("a", SimpleTask, {
                singleton: true
            });
            const observer = await manager.run("a", adone.package.version, 100);
            assert.lengthOf(manager.getTaskNames(), 1);
            manager.deleteTask("a");
            assert.lengthOf(manager.getTaskNames(), 0);
            await observer.result;
        });
    });

    describe("concurrency", () => {
        let counter;
        let inc;

        class TaskA extends task.Task {
            async run(maxVal, timeout, check) {
                counter++;
                inc++;
                if (maxVal) {
                    assert.atMost(inc, maxVal);
                }
                if (check) {
                    assert.equal(counter, inc);
                }
                await promise.delay(timeout);
                inc--;
                return inc;
            }
        }

        class SingletonTask extends task.Task {
            constructor() {
                super();
                this.inc = 0;
            }

            async run(maxVal, timeout) {
                this.inc++;
                if (maxVal) {
                    assert.atMost(this.inc, maxVal);
                }
                await promise.delay(timeout);
                this.inc--;
                return this.inc;
            }
        }

        beforeEach(() => {
            inc = 0;
            counter = 0;
        });

        it("run 10 task instances without cuncurrency", async () => {
            await manager.addTask("a", TaskA);

            const promises = [];
            for (let i = 0; i < 10; i++) {
                const observer = await manager.run("a", 0, 30, true); // eslint-disable-line
                promises.push(observer.result);
            }

            await Promise.all(promises);
        });

        it("concurrency should involve tasks but not creation of observers", async () => {
            await manager.addTask("a", TaskA, {
                concurrency: 10
            });

            const observers = [];
            const results = [];
            for (let i = 0; i < 10; i++) {
                const observer = await manager.run("a", 0, 30, true); // eslint-disable-line
                observers.push(observer);
                results.push(observer.result);
            }

            assert.atLeast(counter, 10);
            await Promise.all(results);
            assert.strictEqual(counter, 10);
        });

        it("run maximum 3 task instances at a time", async () => {
            await manager.addTask("a", TaskA, {
                concurrency: 3
            });

            const promises = [];
            for (let i = 0; i < 100; i++) {
                const observer = await manager.run("a", 3, 50, false); // eslint-disable-line
                promises.push(observer.result);
            }

            await Promise.all(promises);
        });

        it("run singleton task in parallel", async () => {
            await manager.addTask("a", SingletonTask, {
                concurrency: 3,
                singleton: true
            });

            const promises = [];
            for (let i = 0; i < 100; i++) {
                const observer = await manager.run("a", 3, 50); // eslint-disable-line
                promises.push(observer.result);
            }

            await Promise.all(promises);
        });
    });

    describe("suspend/resume/cancel", () => {
        it("suspend/resume non suspendable task", async () => {
            await manager.addTask("a", SCTask);
            const observer = await manager.run("a", false);
            await promise.delay(200);
            await observer.suspend();
            assert.false(observer.isSuspended());
            assert.equal(await observer.result, 100);
        });

        it("cancel non cancelable task", async () => {
            await manager.addTask("a", SCTask);
            const observer = await manager.run("a", false, false);
            await promise.delay(200);
            const err = await assert.throws(async () => observer.cancel());
            assert.instanceOf(err, adone.error.NotAllowedException);
            assert.equal(await observer.result, 100);
            assert.true(observer.isCompleted());
            assert.false(observer.isCancelled());
        });

        it("suspend/resume suspendable task", async () => {
            await manager.addTask("a", SCTask);
            const observer = await manager.run("a", true);
            await promise.delay(200);
            await observer.suspend();
            assert.true(observer.task.reallySuspended);
            assert.true(observer.isSuspended());
            await promise.delay(100);
            await observer.resume();
            assert.true(observer.task.reallyResumed);
            assert.true(observer.isRunning());
            assert.equal(await observer.result, 100);
        });

        it("cancel cancelable task", async () => {
            await manager.addTask("a", SCTask);
            const observer = await manager.run("a", false, true);
            await promise.delay(200);
            await observer.cancel();
            assert.true(observer.isCancelled());
            assert.notEqual(await observer.result, 100);
            assert.false(observer.isCompleted());
        });
    });

    describe("flows", () => {
        class TaskA extends task.Task {
            async run() {
                await promise.delay(10);
                return 1;
            }
        }

        class TaskBadA extends task.Task {
            async run() {
                await promise.delay(10);
                throw new adone.error.Exception("some error");
            }
        }

        class TaskB extends task.Task {
            async run(suffix) {
                await promise.delay(10);
                return `suffix-${suffix}`;
            }
        }

        class TaskC extends task.Task {
            run(suffix) {
                return suffix;
            }
        }

        describe("series", () => {
            it("managed tasks", async () => {
                await manager.addTask("a", TaskA);
                await manager.addTask("b", TaskB);
                await manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b"], null, "adone");
                assert.deepEqual(await observer.result, [1, "suffix-adone"]);
            });

            it("managed+unmanaged tasks", async () => {
                await manager.addTask("a", TaskA);
                await manager.addTask("b", TaskB);
                await manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b", TaskC], null, "adone");
                assert.deepEqual(await observer.result, [1, "suffix-adone", "adone"]);
            });

            it("run tasks with separate args", async () => {
                class SomeTask extends task.Task {
                    run(val) {
                        return val;
                    }
                }

                await manager.addTask("a", SomeTask);
                await manager.addTask("b", SomeTask);
                await manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", [{ task: "a", args: "adone" }, { task: "b", args: 888 }]);
                assert.deepEqual(await observer.result, ["adone", 888]);
            });

            it("should stop follow-up tasks is one of the task has thrown", async () => {
                const results = [];
                class TaskA extends task.Task {
                    run() {
                        results.push(666);
                    }
                }

                class TaskB extends task.Task {
                    run() {
                        throw new adone.error.RuntimeException("Task error");
                    }
                }

                class TaskC extends task.Task {
                    run() {
                        results.push(777);
                    }
                }

                await manager.addTask("a", TaskA);
                await manager.addTask("b", TaskB);
                await manager.addTask("c", TaskC);
                await manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b", "c"]);
                const err = await assert.throws(async () => observer.result);
                assert.instanceOf(err, adone.error.RuntimeException);

                assert.lengthOf(results, 1);
                assert.equal(results[0], 666);
            });

            it("cancel flow with all cancelable tasks", async () => {
                class SCTaskA extends SCTask {
                }

                class SCTaskB extends SCTask {
                }

                await manager.addTask("a", SCTaskA);
                await manager.addTask("b", SCTaskB);
                await manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b"], null, false, true);
                await adone.promise.delay(100);
                assert.true(observer.isCancelable());

                await observer.cancel();

                const result = await observer.result;
                assert.lengthOf(result, 1);
                assert.number(result[0]);

                await observer.result;
            });

            it("cancel flow with first non-cancelable task should cancel flow", async () => {
                class TaskA extends task.Task {
                    async run() {
                        await adone.promise.delay(1000);
                        return 888;
                    }
                }

                class SCTaskB extends SCTask {
                }

                await manager.addTask("a", TaskA);
                await manager.addTask("b", SCTaskB);
                await manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b"], null, false, true);
                await adone.promise.delay(300);
                assert.false(observer.isCancelable());

                const err = await assert.throws(async () => observer.cancel());
                assert.instanceOf(err, adone.error.NotAllowedException);

                await adone.promise.delay(800);

                assert.true(observer.isCancelable());

                await observer.cancel();

                const result = await observer.result;
                assert.lengthOf(result, 2);
                assert.equal(result[0], 888);
                assert.number(result[1]);

                await observer.result;
            });
        });

        describe("parallel", () => {
            it("managed tasks", async () => {
                await manager.addTask("a", TaskA);
                await manager.addTask("b", TaskB);
                await manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b"], null, "adone");
                assert.deepEqual(await observer.result, {
                    a: 1,
                    b: "suffix-adone"
                });
            });

            it("managed+unmanaged tasks", async () => {
                await manager.addTask("a", TaskA);
                await manager.addTask("b", TaskB);
                await manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b", TaskC], null, "adone");
                assert.deepEqual(await observer.result, {
                    a: 1,
                    b: "suffix-adone",
                    TaskC: "adone"
                });
            });

            it("run tasks with separate args", async () => {
                class SomeTask extends task.Task {
                    run(val) {
                        return val;
                    }
                }

                await manager.addTask("a", SomeTask);
                await manager.addTask("b", SomeTask);
                await manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", [{ task: "a", args: "adone" }, { task: "b", args: 888 }]);
                assert.deepEqual(await observer.result, {
                    a: "adone",
                    b: 888
                });
            });

            it("should not stop follow-up tasks is one of the task has thrown", async () => {
                const results = [];
                class TaskA extends task.Task {
                    run() {
                        results.push(666);
                    }
                }

                class TaskB extends task.Task {
                    run() {
                        throw new adone.error.RuntimeException("Task error");
                    }
                }

                class TaskC extends task.Task {
                    run() {
                        results.push(777);
                    }
                }

                await manager.addTask("a", TaskA);
                await manager.addTask("b", TaskB);
                await manager.addTask("c", TaskC);
                await manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b", "c"]);
                const err = await assert.throws(async () => observer.result);
                assert.instanceOf(err, adone.error.RuntimeException);

                await adone.promise.delay(300);

                assert.sameMembers(results, [666, 777]);
            });

            it("cancel flow with all cancelable tasks", async () => {
                class SCTaskA extends SCTask {
                }

                class SCTaskB extends SCTask {
                }

                await manager.addTask("a", SCTaskA);
                await manager.addTask("b", SCTaskB);
                await manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b"], null, false, true);
                await adone.promise.delay(100);
                assert.true(observer.isCancelable());

                await observer.cancel();

                const result = await observer.result;
                assert.number(result.a);
                assert.number(result.b);

                await observer.result;
            });

            it("cancel flow with one non-cancelable task should not cancel flow", async () => {
                class TaskA extends task.Task {
                    async run() {
                        await adone.promise.delay(1000);
                        return 888;
                    }
                }

                class SCTaskB extends SCTask {
                }

                await manager.addTask("a", TaskA);
                await manager.addTask("b", SCTaskB);
                await manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b"], null, false, true);
                await adone.promise.delay(300);
                assert.false(observer.isCancelable());

                let err = await assert.throws(async () => observer.cancel());
                assert.instanceOf(err, adone.error.NotAllowedException);

                await adone.promise.delay(1000);

                assert.false(observer.isCancelable());
                err = await assert.throws(async () => observer.cancel());
                assert.instanceOf(err, adone.error.NotAllowedException);

                const result = await observer.result;
                assert.equal(result.a, 888);
                assert.equal(result.b, 100);

                await observer.result;
            });
        });

        describe("try", () => {
            it("managed tasks", async () => {
                await manager.addTask("badA", TaskBadA);
                await manager.addTask("b", TaskB);
                await manager.addTask("try", task.flow.Try);

                const observer = await manager.run("try", ["badA", "b"], null, "adone");
                assert.equal(await observer.result, "suffix-adone");
            });

            it("managed+unmanaged tasks", async () => {
                await manager.addTask("badA", TaskBadA);
                await manager.addTask("try", task.flow.Try);

                const observer = await manager.run("try", ["badA", TaskC], null, "adone");
                assert.equal(await observer.result, "adone");
            });

            it("should throw if all tasks have failed", async () => {
                await manager.addTask("a", TaskBadA);
                await manager.addTask("b", TaskBadA);
                await manager.addTask("c", TaskBadA);
                await manager.addTask("try", task.flow.Try);

                const observer = await manager.run("try", ["a", "b", "c"], null, "adone");
                const err = await assert.throws(async () => observer.result);
                assert.instanceOf(err, adone.error.AggregateException);
            });
        });

        describe("waterfall", () => {
            class TaskD extends task.Task {
                async run(num) {
                    return [num, 7];
                }
            }

            class TaskE extends task.Task {
                async run(num1, num2) {
                    await promise.delay(10);
                    return num1 * num2;
                }
            }

            it("managed tasks", async () => {
                await manager.addTask("d", TaskD);
                await manager.addTask("e", TaskE);
                await manager.addTask("waterfall", task.flow.Waterfall);

                const observer = await manager.run("waterfall", ["d", "e"], null, 3);
                assert.equal(await observer.result, 21);
            });

            it("managed+unmanaged tasks", async () => {
                class TaskF extends task.Task {
                    async run(sum) {
                        await promise.delay(10);
                        return `sum = ${sum}`;
                    }
                }
                await manager.addTask("d", TaskD);
                await manager.addTask("e", TaskE);
                await manager.addTask("waterfall", task.flow.Waterfall);

                const observer = await manager.run("waterfall", ["d", "e", TaskF], null, 3);
                const result = await observer.result;
                assert.true(is.string(result));
                assert.equal(result, "sum = 21");
            });
        });

        describe("race", () => {
            class TaskD extends task.Task {
                async run() {
                    await promise.delay(500);
                    return 3;
                }
            }

            class TaskE extends task.Task {
                async run() {
                    await promise.delay(300);
                    return 5;
                }
            }

            it("managed tasks", async () => {
                await manager.addTask("d", TaskD);
                await manager.addTask("e", TaskE);
                await manager.addTask("race", task.flow.Race);

                const observer = await manager.run("race", ["d", "e"], null);
                assert.equal(await observer.result, 5);
            });

            it("managed+unmanaged tasks", async () => {
                class TaskF extends task.Task {
                    async run() {
                        await promise.delay(100);
                        return 7;
                    }
                }
                await manager.addTask("d", TaskD);
                await manager.addTask("e", TaskE);
                await manager.addTask("race", task.flow.Race);

                const observer = await manager.run("race", ["d", "e", TaskF], null, 3);
                assert.equal(await observer.result, 7);
            });
        });
    });

    it("runInSeries() with functions", async () => {
        const task1 = async () => {
            await adone.promise.delay(100);
            return 777;
        };

        const task2 = () => {
            return 888;
        };

        const observer = await manager.runInSeries([
            task1,
            task2
        ]);

        assert.deepEqual(await observer.result, [777, 888]);
    });

    it("runInParallel() with functions", async () => {
        const task1 = async () => {
            await adone.promise.delay(100);
            return 777;
        };

        const task2 = () => {
            return 888;
        };

        const observer = await manager.runInParallel([
            task1,
            task2
        ]);

        const result = await observer.result;
        assert.lengthOf(Object.keys(result), 2);
        assert.sameMembers(Object.values(result), [777, 888]);
    });

    describe("TaskObserver#finally", () => {
        it("finally function should be executed atomically (async)", async () => {
            let val;
            class TaskA extends task.Task {
                async run() {
                    await promise.delay(100);
                    val = 1;
                }
            }

            await manager.addTask("a", TaskA);
            const observer = await manager.run("a");

            observer.finally(async () => {
                await adone.promise.delay(100);
                val = 2;
            });
            await observer.result;
            assert.equal(val, 2);
        });

        it("finally function should be executed atomically (async)", async () => {
            let val = 0;
            class TaskA extends task.Task {
                run() {
                    val = 1;
                }
            }

            await manager.addTask("a", TaskA);
            const observer = await manager.run("a");
            observer.finally(() => {
                val = 2;
            });
            await observer.result;
            assert.equal(val, 2);
        });
    });

    describe("undo", () => {
        it("task's undo method should be executed atomically (async)", async () => {
            const data = [];

            class TaskA extends task.Task {
                async run() {
                    data.push(1);
                    await promise.delay(100);
                    data.push(2);
                    throw new adone.error.RuntimeException("task error");
                }

                async undo() {
                    await adone.promise.delay(1000);
                    data.length = 0;
                }
            }

            await manager.addTask("a", TaskA);
            try {
                const observer = await manager.run("a");
                await observer.result;
            } catch (err) {
                assert.lengthOf(data, 0);
            }
        });

        it("task's undo method should be executed atomically (sync)", async () => {
            const data = [];

            class TaskA extends task.Task {
                run() {
                    data.push(1);
                    data.push(2);
                    throw new adone.error.RuntimeException("task error");
                }

                async undo() {
                    await adone.promise.delay(1000);
                    data.length = 0;
                }
            }

            await manager.addTask("a", TaskA);
            try {
                const observer = await manager.run("a");
                await observer.result;
            } catch (err) {
                assert.lengthOf(data, 0);
            }
        });
    });

    describe("task notifications", () => {
        class Task1 extends task.Task {
            async run() {
                this.manager.notify(this, "progress", {
                    value: 0.1,
                    message: "step1"
                });

                await promise.delay(1);

                this.manager.notify(this, "progress", {
                    value: 0.5,
                    message: "step2"
                });

                await promise.delay(1);

                this.manager.notify(this, "progress", {
                    value: 1.0,
                    message: "step3"
                });
            }
        }

        class Task2 extends task.Task {
            async run() {
                this.manager.notify(this, "p", {
                    value: 0.2,
                    message: "bam1"
                });

                await promise.delay(1);

                this.manager.notify(this, "pro", {
                    value: 0.6,
                    message: "bam2"
                });

                await promise.delay(1);

                this.manager.notify(this, "progre", {
                    value: 0.8,
                    message: "bam3"
                });
            }
        }

        it("observe all notifications", async () => {
            await manager.addTask("1", Task1);

            let i = 1;
            const values = [0.1, 0.5, 1.0];

            manager.onNotification("progress", (task, name, data) => {
                assert.true(is.task(task));
                assert.strictEqual(name, "progress");
                assert.strictEqual(values[i - 1], data.value);
                assert.strictEqual(`step${i++}`, data.message);
            });

            const observer = await manager.run("1");
            await observer.result;

            assert.strictEqual(i, 4);
        });

        it("observe notifications from specific task", async () => {
            await manager.addTask("1", Task1);
            await manager.addTask("2", Task2);

            let i = 1;
            const values = [0.1, 0.5, 1.0];

            manager.onNotification({
                name: "progress",
                tasks: "1"
            }, (task, name, data) => {
                assert.true(is.task(task));
                assert.strictEqual(name, "progress");
                assert.strictEqual(values[i - 1], data.value);
                assert.strictEqual(`step${i++}`, data.message);
            });

            await Promise.all([
                (await manager.run("1")).result,
                (await manager.run("2")).result
            ]);

            assert.strictEqual(i, 4);
        });

        it("observe all notifications", async () => {
            await manager.addTask("1", Task1);
            await manager.addTask("2", Task2);

            let i = 0;
            const values = [0.1, 0.5, 1.0, 0.2, 0.6, 0.8];
            const messages = ["step1", "step2", "step3", "bam1", "bam2", "bam3"];

            manager.onNotification(null, (task, name, data) => {
                assert.true(is.task(task));
                assert.true(values.includes(data.value));
                assert.true(messages.includes(data.message));
                i++;
            });

            await Promise.all([
                (await manager.run("1")).result,
                (await manager.run("2")).result
            ]);

            assert.strictEqual(i, 6);
        });

        it("observe notification accepts by function selector", async () => {
            await manager.addTask("1", Task1);
            await manager.addTask("2", Task2);

            let i = 0;
            const values = [0.2, 0.6, 0.8];
            const messages = ["bam1", "bam2", "bam3"];

            manager.onNotification((task) => task.name === "2", (task, name, data) => {
                assert.true(is.task(task));
                assert.true(task.name === "2");
                assert.true(values.includes(data.value));
                assert.true(messages.includes(data.message));
                i++;
            });

            await Promise.all([
                (await manager.run("1")).result,
                (await manager.run("2")).result
            ]);

            assert.strictEqual(i, 3);
        });

        describe.skip("standart notifications", () => {
            class TaskWithLoggers extends task.Task {
                async run() {
                    // this.log(".log");
                    // this.logFatal(".logFatal");
                    // this.logError(".logError");
                    // this.logWarn(".logWarn");
                    // this.logInfo(".logInfo");
                    // this.logDebug(".logDebug");
                    // this.logTrace(".logTrace");
                }
            }

            const names = ["log", "logFatal", "logError", "logWarn", "logInfo", "logDebug", "logTrace"];
            for (const name of names) {
                // eslint-disable-next-line
                it(`${name} notification`, async (done) => {
                    await manager.addTask("1", TaskWithLoggers);

                    manager.onNotification(name, (sender, nn, ...args) => {
                        assert.strictEqual(`.${name}`, args[0]);
                        done();
                    });

                    await (await manager.run("1")).result;

                    await adone.promise.delay(100);
                });
            }
        });
    });

    // describe.only("contexts", () => {
    //     const {
    //         task: { Manager }
    //     } = adone;

    //     it("manager api", () => {
    //         const manager = new Manager();


    //         assert.function(manager.getIsolate);
    //         assert.function(manager.getContextBook);
    //     });

    //     it("create std context with defaults", async () => {
    //         const manager = new Manager();
    //         const stdContext = await manager.getContextBook().createContext("main");
    //         assert.object(stdContext);

    //         class MyTask extends task.Task {
    //             run(a, b) {
    //                 global.a = a;
    //                 global.b = b;
    //                 global.c = a + b;
    //                 return global.c;
    //             }
    //         }

    //         manager.addTask("my", MyTask);
    //         const observer = await manager.runInContext(stdContext, "my", 1, 2);
    //         const result = await observer.result;
    //         console.log(result);
    //     });

    // });

});
