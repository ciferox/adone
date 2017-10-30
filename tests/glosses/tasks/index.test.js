const {
    is,
    promise,
    task,
    x
} = adone;

describe("", () => {
    let manager;

    beforeEach(() => {
        manager = new task.Manager();
    });

    it("construct manager", () => {
        assert.lengthOf(manager.getTaskNames(), 0);
    });

    it("adone.is.task() should be defined", () => {
        class MyTask extends task.Task {
        }

        assert.isTrue(adone.is.task(new MyTask()));
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
            const err = assert.throws(() => manager.addTask("task", InvalidTask)); // eslint-disable-line
            assert.instanceOf(err, x.NotValid);
        }

        manager.addTask("task", ValidTask);
        assert.sameMembers(manager.getTaskNames(), ["task"]);
    });

    it("run task", async () => {
        class TaskA extends task.Task {
            run(version) {
                return `adone ${version}`;
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        assert.isTrue(observer.isCompleted());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.isTrue(observer.isCompleted());
    });

    it("observer should containe correct error info for sync task", async () => {
        class TaskA extends task.Task {
            run() {
                throw new adone.x.Runtime("sad");
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        const err = await assert.throws(async () => observer.result);
        assert.isTrue(observer.isFailed());
        assert.instanceOf(observer.error, adone.x.Runtime);
        assert.instanceOf(err, adone.x.Runtime);
    });

    it("observer should containe correct error info for async task", async () => {
        class TaskA extends task.Task {
            async run() {
                await promise.delay(10);
                throw new adone.x.Runtime("sad");
            }
        }

        await manager.addTask("a", TaskA);
        const observer = await manager.run("a", adone.package.version);
        const err = await assert.throws(async () => observer.result);
        assert.isTrue(observer.isFailed());
        assert.instanceOf(observer.error, adone.x.Runtime);
        assert.instanceOf(err, adone.x.Runtime);
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
        assert.isTrue(observer.isRunning());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.isTrue(observer.isCompleted());
    });

    it("delete nonexisting task", async () => {
        const err = await assert.throws(async () => manager.deleteTask("unknown"));
        assert.instanceOf(err, adone.x.NotExists);
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
        class TaskA extends task.Task {
            run(version) {
                return `adone ${version}`;
            }
        }

        const observer = await manager.runOnce(TaskA, adone.package.version);
        assert.lengthOf(manager.getTaskNames(), 0);
        assert.isTrue(observer.isCompleted());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.isTrue(observer.isCompleted());
    });

    it("run async task once", async () => {
        class TaskA extends task.Task {
            async run(version) {
                await promise.delay(10);
                return `adone ${version}`;
            }
        }

        const observer = await manager.runOnce(TaskA, adone.package.version);
        assert.lengthOf(manager.getTaskNames(), 1);
        assert.isTrue(observer.isRunning());
        assert.equal(await observer.result, `adone ${adone.package.version}`);
        assert.isTrue(observer.isCompleted());
        assert.lengthOf(manager.getTaskNames(), 0);
    });

    describe("suspend/resume/cancel", () => {
        class TaskA extends task.Task {
            constructor() {
                super();
                this._runDefer = null;
                this._suspendDefer = null;
                this._cancelDefer = null;
            }

            async run(suspendable = false, cancelable = false) {
                this._suspendable = suspendable;
                this._cancelable = cancelable;
                this.data = 0;
                this._runDefer = promise.defer();
                this._run();
                return this._runDefer.promise;
            }

            async _run() {
                for (; ;) {
                    await promise.delay(10); // eslint-disable-line
                    this.data++;
                    if (this.data >= 100) {
                        this._runDefer.resolve(this.data);
                        return;
                    }

                    if (!is.null(this._suspendDefer)) {
                        this._suspendDefer.resolve();
                        return;
                    }
                    if (!is.null(this._cancelDefer)) {
                        this._runDefer.resolve();
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

            resume(defer) {
                this._suspendDefer = null;
                this._run();
                defer.resolve();
            }

            cancel(defer) {
                this._cancelDefer = defer;
            }
        }

        it("suspend/resume non suspendable task", async () => {
            manager.addTask("a", TaskA);
            const observer = await manager.run("a", false);
            await promise.delay(200);
            await observer.suspend();
            assert.isFalse(observer.isSuspended());
            assert.equal(await observer.result, 100);
        });

        it("cancel non cancelable task", async () => {
            manager.addTask("a", TaskA);
            const observer = await manager.run("a", false, false);
            await promise.delay(200);
            await observer.cancel();
            assert.equal(await observer.result, 100);
            assert.isTrue(observer.isCompleted());
            assert.isFalse(observer.isCancelled());
        });

        it("suspend/resume suspendable task", async () => {
            manager.addTask("a", TaskA);
            const observer = await manager.run("a", true);
            await promise.delay(200);
            await observer.suspend();
            assert.isTrue(observer.isSuspended());
            await promise.delay(100);
            await observer.resume();
            assert.isTrue(observer.isRunning());
            assert.equal(await observer.result, 100);
        });

        it("cancel cancelable task", async () => {
            manager.addTask("a", TaskA);
            const observer = await manager.run("a", false, true);
            await promise.delay(200);
            await observer.cancel();
            assert.notEqual(await observer.result, 100);
            assert.isFalse(observer.isCompleted());
            assert.isTrue(observer.isCancelled());
        });
    });

    describe.only("flows", () => {
        class TaskA extends task.Task {
            async run() {
                await promise.delay(10);
                return 1;
            }
        }

        class TaskBadA extends task.Task {
            async run() {
                await promise.delay(10);
                throw new adone.x.Exception("some error");
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
                manager.addTask("a", TaskA);
                manager.addTask("b", TaskB);
                manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b"], null, "adone");
                assert.deepEqual(await observer.result, [1, "suffix-adone"]);
            });

            it("managed+unmanaged tasks", async () => {
                manager.addTask("a", TaskA);
                manager.addTask("b", TaskB);
                manager.addTask("series", task.flow.Series);

                const observer = await manager.run("series", ["a", "b", TaskC], null, "adone");
                assert.deepEqual(await observer.result, [1, "suffix-adone", "adone"]);
            });
        });

        describe("parallel", () => {
            it("managed tasks", async () => {
                manager.addTask("a", TaskA);
                manager.addTask("b", TaskB);
                manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b"], null, "adone");
                assert.deepEqual(await observer.result, {
                    a: 1,
                    b: "suffix-adone"
                });
            });

            it("managed+unmanaged tasks", async () => {
                manager.addTask("a", TaskA);
                manager.addTask("b", TaskB);
                manager.addTask("parallel", task.flow.Parallel);

                const observer = await manager.run("parallel", ["a", "b", TaskC], null, "adone");
                assert.deepEqual(await observer.result, {
                    a: 1,
                    b: "suffix-adone",
                    TaskC: "adone"
                });
            });
        });

        describe("try", () => {
            it("managed tasks", async () => {
                manager.addTask("badA", TaskBadA);
                manager.addTask("b", TaskB);
                manager.addTask("try", task.flow.Try);

                const observer = await manager.run("try", ["badA", "b"], null, "adone");
                assert.equal(await observer.result, "suffix-adone");
            });

            it("managed+unmanaged tasks", async () => {
                manager.addTask("badA", TaskBadA);
                manager.addTask("try", task.flow.Try);

                const observer = await manager.run("try", ["badA", TaskC], null, "adone");
                assert.equal(await observer.result, "adone");
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
                manager.addTask("d", TaskD);
                manager.addTask("e", TaskE);
                manager.addTask("waterfall", task.flow.Waterfall);

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
                manager.addTask("d", TaskD);
                manager.addTask("e", TaskE);
                manager.addTask("waterfall", task.flow.Waterfall);

                const observer = await manager.run("waterfall", ["d", "e", TaskF], null, 3);
                const result = await observer.result;
                assert.isTrue(is.string(result));
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
                manager.addTask("d", TaskD);
                manager.addTask("e", TaskE);
                manager.addTask("race", task.flow.Race);

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
                manager.addTask("d", TaskD);
                manager.addTask("e", TaskE);
                manager.addTask("race", task.flow.Race);

                const observer = await manager.run("race", ["d", "e", TaskF], null, 3);
                assert.equal(await observer.result, 7);
            });
        });
    });
});
