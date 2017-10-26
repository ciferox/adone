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
});
