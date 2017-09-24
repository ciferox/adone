const {
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
                await adone.promise.delay(10);
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
                await adone.promise.delay(10);
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
});
