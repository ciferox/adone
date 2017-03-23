import { TaskManager } from "omnitron/services/task_manager";
import TwinTmInterface from "omnitron/services/task_manager/twin";
import OmnitronRunner from "../runner";
const { is, x  } = adone;
const { traverse } = adone.js.compiler;

let taskId = 0;
let containerId = 0;

function getTaskName() {
    return `Task${++taskId}`;
}

function getContainerId() {
    return `container${++containerId}`;
}

function getFixturePath(name) {
    return adone.std.path.join(__dirname, "fixtures", name);
}

describe("Task Manager", () => {
    let omnitronRunner;
    let iTm;
    let iDs;
    let taskManager;

    async function installSingle(code, options) {
        let name;
        if (code.indexOf("$$") >= 0) {
            name = getTaskName();
            code = code.replace("$$", name);
        }
        const count = await iTm.install(code, options);
        return { name, code, count };
    }

    async function prepareInterfaces() {
        omnitronRunner.dispatcher.netron.setInterfaceTwin("TaskManager", TwinTmInterface);
        iTm = omnitronRunner.getInterface("tm");
        const iDatastore = omnitronRunner.getInterface("db");
        iDs = await iDatastore.getDatastore({ filename: "taskmanager" });
    }

    async function restartOmnitron() {
        await omnitronRunner.restartOmnitron();
        return prepareInterfaces();
    }

    before(async function () {
        this.timeout(10000);

        taskManager = new TaskManager({});
        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.run();
        omnitronRunner.createDispatcher();
        await omnitronRunner.startOmnitron();
        await omnitronRunner.dispatcher.enable("database");
        await omnitronRunner.dispatcher.enable("task_manager");
        await omnitronRunner.dispatcher.start("task_manager");
        await adone.promise.delay(100);
        return prepareInterfaces();
    });

    after(async () => {
        await omnitronRunner.stopOmnitron({ clean: false });
    });

    describe("Validating task and worker definitions", () => {
        const classes = [
            `class $$ extends Task {
                run() {  }
            }`,
            `class $$ extends Task {
                constructor() {
                    super();

                    this.args = null;
                }
                run(...args) {
                    this.args = args;
                    return true;
                }
            }`,
            `class $$ extends Task {
                async run(arg1, args2) {
                    this.args1 = args;
                    if (adone.is.null(arg2)) throw new adone.x.InvalidArgument();
                    return true;
                }
            }`,
            `class $$ extends Worker {
                run(job) {
                    return job.data;
                }
            }`,
            `class $$ extends Worker {
                async run(job) {
                    return job.data;
                }
            }`,
            `class $$ extends Worker {
                constructor() {
                    super();
                    this.someProp = true;
                }
                async run(job) {
                    return job.data;
                }
            }`
        ];

        for (let i = 0; i < classes.length; i++) {
            it(`Valid definition - case ${i + 1}`, async () => {
                try {
                    await installSingle(classes[i]);
                } catch (err) {
                    assert.fail(err.message);
                }
            });
        }

        for (const type of ["Task", "Worker"]) {
            it(`${type.toLowerCase()} without run() method`, async () => {
                try {
                    await installSingle(`class $$ extends ${type} {
                        runBad() {
                        }
                    }`);
                } catch (err) {
                    assert.instanceOf(err, x.NotValid);
                    return;
                }

                assert.fail("should throw exception");
            });
        }

        it("incorrect worker definition", async () => {
            try {
                await installSingle(`class $$ extends Worker {
                    run() {
                    }
                }`);
            } catch (err) {
                assert.instanceOf(err, x.NotAllowed);
                return;
            }
            assert.fail("should throw exception");
        });
    });

    const modes = ["Single omnitron session", "Different omnitron sessions"];

    for (let modeId = 0; modeId < modes.length; modeId++) {
        const mode = modes[modeId];

        describe(mode, () => {
            describe("Install/uninstall tasks", () => {
                it("should install task to datastore", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        run(a1, a2) {
                            return a1 + a2;
                        }
                    }`);
                    if (modeId === 1) {
                        await restartOmnitron();
                    }
                    const res = await iDs.find({ _type: "task", name: info.name });
                    assert.isOk(res.length === 1);
                    const taskInfo = res[0];
                    assert.equal(taskInfo.name, info.name);
                    assert.isOk(taskInfo.singleton === false);
                    assert.equal(taskInfo.concurrency, 1);
                    assert.equal(taskInfo.singleton, false);
                    assert.equal(taskInfo.volatile, true);
                    assert.isOk(adone.is.string(taskInfo.code));

                    const ast = taskManager._parseCode(info.code);
                    let generatedCode;
                    traverse(ast, {
                        ClassDeclaration: (path) => {
                            generatedCode = taskManager._generateTaskClass(path.node);
                        }
                    });
                    assert.equal(taskInfo.code, generatedCode);
                });

                it("should install worker to datastore", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.a1 + job.a2;
                        }
                    }`);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const res = await iDs.find({ _type: "worker", name: info.name });
                    assert.isOk(res.length === 1);
                    const taskInfo = res[0];
                    assert.equal(taskInfo.name, info.name);
                    assert.equal(taskInfo.concurrency, 1);
                    assert.isUndefined(taskInfo.singleton);
                    assert.isUndefined(taskInfo.volatile);
                    assert.isOk(adone.is.string(taskInfo.code));

                    const ast = taskManager._parseCode(info.code);
                    let generatedCode;
                    traverse(ast, {
                        ClassDeclaration: (path) => {
                            generatedCode = taskManager._generateTaskClass(path.node);
                        }
                    });
                    assert.equal(taskInfo.code, generatedCode);
                });

                it("install task with name of another existing task", async () => {
                    let info = await installSingle(`class $$ extends Task {
                        run() {
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    info = await installSingle(info.code);
                    assert.equal(info.count, 0);
                });

                it("install worker with name of another existing worker", async () => {
                    let info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return true;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    info = await installSingle(info.code);
                    assert.equal(info.count, 0);
                });

                it("install task with name of another existing worker", async () => {
                    let info = await installSingle(`class $$ extends Worker {
                        run(job) {
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    info = await installSingle(`class ${info.name} extends Task {
                        run() {
                        }
                    }`);
                    assert.equal(info.count, 0);
                });

                it("install worker with name of another existing task", async () => {
                    let info = await installSingle(`class $$ extends Task {
                        run() {
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    info = await installSingle(`class ${info.name} extends Worker {
                        run(job) {
                        }
                    }`);
                    assert.equal(info.count, 0);
                });

                it("install singleton task", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        run(job) {
                        }
                    }`, { singleton: true });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const options = await iTm.getTaskOptions(info.name);
                    assert.equal(options.singleton, true);
                    assert.equal(options.volatile, true);
                });

                it("install singleton and non-volatile task", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        run() {
                        }
                    }`, { singleton: true, volatile: false });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const options = await iTm.getTaskOptions(info.name);
                    assert.equal(options.singleton, true);
                    assert.equal(options.volatile, false);
                });

                it("install singleton worker", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                        }
                    }`, { singleton: true });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const options = await iTm.getTaskOptions(info.name);
                    assert.isUndefined(options.singleton);
                    assert.isUndefined(options.volatile);
                });

                it("install singleton and non-volatile worker", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                        }
                    }`, { singleton: true, volatile: false });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const options = await iTm.getTaskOptions(info.name);
                    assert.isUndefined(options.singleton);
                    assert.isUndefined(options.volatile);
                });

                it("install non-singleton and non-volatile worker", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                        }
                    }`, { volatile: false });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const options = await iTm.getTaskOptions(info.name);
                    assert.isUndefined(options.singleton);
                    assert.isUndefined(options.volatile);
                });

                it("install multiple tasks", async () => {
                    const infos = [];
                    for (let i = 0; i < 7; i++) {
                        const name = getTaskName();
                        infos.push({ name, code: `class ${name} extends Task {
                            run(...args) {
                            }
                        }` });
                    }
                    const count = await iTm.install(infos.map((x) => x.code).join("\n"));
                    assert.equal(count, infos.length);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const names = await iTm.getTaskNames();
                    for (const info of infos) {
                        assert.include(names, info.name);
                    }
                });

                it("install multiple workers", async () => {
                    const infos = [];
                    for (let i = 0; i < 7; i++) {
                        const name = getTaskName();
                        infos.push({ name, code: `class ${name} extends Worker {
                            run(job) {
                            }
                        }` });
                    }
                    const count = await iTm.install(infos.map((x) => x.code).join("\n"));
                    assert.equal(count, infos.length);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const names = await iTm.getTaskNames();
                    for (const info of infos) {
                        assert.include(names, info.name);
                    }
                });

                for (let i = 0; i < 2; i++) {
                    it(`reinstall task reversing sigleton flag (case ${i + 1})`, async () => {
                        const taskName = getTaskName();
                        const taskClass = `class ${taskName} extends Task {
                            run() {
                            }
                        }`;
                        const count = await iTm.install(taskClass, { singleton: (i === 0) });
                        assert.equal(count, 1);

                        if (modeId === 1) {
                            await restartOmnitron();
                        }

                        try {
                            await iTm.install(taskClass, { force: true, singleton: (i === 1) });
                        } catch (err) {
                            assert.instanceOf(err, x.NotAllowed);
                            return;
                        }

                        assert.fail("should throw exception");
                    });
                }

                it("uninstall task", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        run() {
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const count = await iTm.uninstall(info.name);
                    assert.equal(count, 1);
                    const taskData = await iDs.findOne({ _type: "task", name: info.name });
                    assert.isNull(taskData);
                });

                it("uninstall worker", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const count = await iTm.uninstall(info.name);
                    assert.equal(count, 1);
                    const taskData = await iDs.findOne({ _type: "worker", name: info.name });
                    assert.isNull(taskData);
                });

                it("uninstall multiple tasks/workers", async () => {
                    const infos = [];
                    const types = ["Task", "Worker"];
                    for (let i = 0; i < adone.math.random(10, 20); i++) {
                        const type = types[adone.math.random(0, 2)];
                        const info = await installSingle(`class $$ extends ${type} {
                            run(${type === "Task" ? "" : "job"}) {
                            }
                        }`);
                        assert.equal(info.count, 1);
                        infos.push({ name: info.name, type });
                    }

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const count = await iTm.uninstall(...infos.map((x) => x.name));
                    assert.equal(count, infos.length);

                    for (const info of infos) {
                        const taskData = await iDs.findOne({ _type: info.type, name: info.name });
                        assert.isNull(taskData);
                    }

                    const taskNames = await iTm.getTaskNames();

                    for (const info of infos) {
                        assert.notInclude(taskNames, info.name);
                    }
                });

                if (modeId === 0) {
                    it("uninstall nonexisting task", async () => {
                        const taskName = getTaskName();
                        assert.equal(await iTm.uninstall(taskName), 0);
                    });
                }

                it("reinstall task", async () => {
                    let info = await installSingle(`class $$ extends Task {
                        run() {
                            return 777;
                        }
                    }`, { description: "descr1", concurrency: 2 });
                    assert.equal(info.count, 1);
                    const taskName = info.name;
                    const taskMeta = await iDs.findOne({ name: info.name });
                    assert.equal(taskMeta.concurrency, 2);
                    assert.equal(taskMeta.description, "descr1");
                    assert.equal(await iTm.run(info.name), 777);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    info = await installSingle(`class ${info.name} extends Task {
                        run() {
                            return 888;
                        }
                    }`, { force: true, description: "another_descr2", concurrency: 8 });
                    assert.equal(info.count, 1);
                    const tasksMeta = await iDs.find({ name: taskName });
                    assert.equal(tasksMeta.length, 1);
                    assert.equal(tasksMeta[0].concurrency, 8);
                    assert.equal(tasksMeta[0].description, "another_descr2");
                    assert.equal(await iTm.run(taskName), 888);
                });

                it("reinstall worker", async () => {
                    let info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return 777;
                        }
                    }`, { description: "descr1", concurrency: 2 });
                    assert.equal(info.count, 1);
                    const taskName = info.name;
                    const taskMeta = await iDs.findOne({ name: info.name });
                    assert.equal(taskMeta.concurrency, 2);
                    assert.equal(taskMeta.description, "descr1");
                    assert.isOk(taskMeta.code.indexOf("777") >= 0);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    info = await installSingle(`class ${info.name} extends Worker {
                        run(job) {
                            return 888;
                        }
                    }`, { force: true, description: "another_descr2", concurrency: 8 });
                    assert.equal(info.count, 1);
                    const tasksMeta = await iDs.find({ name: taskName });
                    assert.equal(tasksMeta.length, 1);
                    assert.equal(tasksMeta[0].concurrency, 8);
                    assert.equal(tasksMeta[0].description, "another_descr2");
                    assert.isOk(tasksMeta[0].code.indexOf("888") >= 0);
                });

                if (modeId === 0) {
                    it("reinstall running task", async () => {
                        let info = await installSingle(`class $$ extends Task {
                            async run() {
                                await adone.promise.delay(600);
                                return 777;
                            }
                        }`, { concurrency: 2 });
                        assert.equal(info.count, 1);
                        const p1 = iTm.run(info.name);
                        await adone.promise.delay(100);
                        info = await installSingle(`class $$ extends Task {
                            run() {
                                return 888;
                            }
                        }`, { force: true, concurrency: 2 });
                        assert.equal(info.count, 1);
                        assert.equal(await iTm.run(info.name), 888);
                        const result = await p1;
                        assert.equal(result, 777);
                    });

                    it("reinstall singleton task", async (done) => {
                        let info = await installSingle(`class $$ extends Task {
                            async run() {
                                await adone.promise.delay(600);
                                return 777;
                            }
                        }`, { singleton: true });
                        assert.equal(info.count, 1);
                        iTm.run(info.name).then((result) => {
                            assert.equal(result, 777);
                            done();
                        });
                        await adone.promise.delay(100);
                        info = await installSingle(`class $$ extends Task {
                            run() {
                                return 888;
                            }
                        }`, { force: true, singleton: true });
                        assert.equal(info.count, 1);
                        assert.equal(await iTm.run(info.name), 888);
                    });

                    it("uninstall running task", async (done) => {
                        const info = await installSingle(`class $$ extends Task {
                            run() {
                                return adone.promise.delay(500);
                            }
                        }`);
                        assert.equal(info.count, 1);
                        iTm.run(info.name).then(async () => {
                            const taskData = await iDs.findOne({ _type: "task", name: info.name });
                            assert.isNull(taskData);
                            done();
                        });
                        await adone.promise.delay(200);
                        const count = await iTm.uninstall(info.name);
                        assert.equal(count, 1);
                    });
                }
            });

            describe("Install/execute tasks", () => {
                it("execute task with no arguments", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        run(...args) {
                            return args.slice().concat(["ok!"]);
                        }
                    }`);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const result = await iTm.run(info.name);
                    assert.instanceOf(result, Array);
                    assert.equal(result.length, 1);
                    assert.equal(result[0], "ok!");
                });

                for (let i = 0; i < 21; i++) {
                    if (i >= 3 && modeId === 1) {continue;}
                    it(`execute task with ${i + 1} arguments`, async () => {
                        const args = [];
                        for (let n = 0; n < i; n++) {
                            args.push(adone.math.random(1000, 2000));
                        }
                        const totalSum = args.reduce((sum, x) => sum + x, 0);

                        const info = await installSingle(`class $$ extends Task {
                            run(...args) {
                                return args.reduce((sum, x) => sum + x, 0);
                            }
                        }`);

                        if (modeId === 1) {
                            await restartOmnitron();
                        }
                        assert.equal(await iTm.run(info.name, ...args), totalSum);
                    });
                }

                it("execute async task", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        async run(arg) {
                            await adone.promise.delay(10);
                            return arg;
                        }
                    }`);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    assert.equal(await iTm.run(info.name, "sample"), "sample");
                });

                it.skip("execute task using 'fast'", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        run(globs, destPath) {
                            return fast
                                .src(globs, { base: "${getFixturePath("fast")}" })
                                .transpile({
                                    compact: false,
                                    only: /\.js$/,
                                    sourceMaps: false,
                                    plugins: [
                                        "transform.flowStripTypes",
                                        "transform.decoratorsLegacy",
                                        "transform.classProperties",
                                        "transform.asyncToGenerator",
                                        "transform.ESModules",
                                        "transform.functionBind",
                                        "transform.objectRestSpread"
                                    ]
                                })
                                .dest(destPath)
                                .on("error", (err) => {
                                    adone.error(err);
                                })
                        }
                    }`);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    await iTm.run(info.name, getFixturePath("fast/in/transpile.js"), getFixturePath("fast/out"));
                    const outPath = getFixturePath("fast/out/in/transpile.js");
                    await assert.isOk(await adone.fs.exists(outPath));
                    await adone.fs.rm(getFixturePath("fast/out/in"));
                });

                it("execute singleton task", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        constructor() {
                            super();
                            this.data.state = 0;
                        }
                        run() {
                            return (++this.data.state);
                        }
                    }`, { singleton: true });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    for (let i = 1; i <= 7; i++) {
                        assert.equal(await iTm.run(info.name), i);
                    }
                });

                it("concurrency execution limit", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        async run() {
                            await adone.promise.delay(200);
                            return 1;
                        }
                    }`, { concurrency: 2 });
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const p1 = iTm.run(info.name);
                    const p2 = iTm.run(info.name);
                    await adone.promise.delay(30);
                    try {
                        await iTm.run(info.name);
                    } catch (err) {
                        assert.instanceOf(err, x.LimitExceeded);
                        await Promise.all([p1, p2]);
                        return;
                    }

                    assert.fail("should throw exception");
                });

                if (modeId === 0) {
                    it("execute nonexisting task", async () => {
                        try {
                            await iTm.run("nonexisting_task");
                        } catch (err) {
                            assert.instanceOf(err, x.NotExists);
                            return;
                        }

                        assert.fail("should throw exception");
                    });
                }

                it("execute uninstalled task", async () => {
                    const info = await installSingle(`class $$ extends Task {
                        async run() {
                            await adone.promise.delay(100);
                            return 1;
                        }
                    }`);
                    assert.equal(info.count, 1);
                    const count = await iTm.uninstall(info.name);
                    assert.equal(count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    try {
                        await iTm.run(info.name);
                    } catch (err) {
                        assert.instanceOf(err, x.NotExists);
                        return;
                    }

                    assert.fail("should throw exception");
                });

                if (modeId === 0) {
                    it("execute task marked for uninstall", async () => {
                        const info = await installSingle(`class $$ extends Task {
                            async run() {
                                await adone.promise.delay(500);
                                return 1;
                            }
                        }`);
                        assert.equal(info.count, 1);
                        const p1 = iTm.run(info.name);
                        await adone.promise.delay(100);
                        const count = await iTm.uninstall(info.name);
                        assert.equal(count, 1);
                        try {
                            await iTm.run(info.name);
                        } catch (err) {
                            assert.instanceOf(err, x.NotExists);
                            await p1;
                            return;
                        }

                        assert.fail("should throw exception");
                    });
                }
            });
        });

        describe("Workers and Jobs", () => {
            it("failed job", async () => {
                const info = await installSingle(`class $$ extends Worker {
                    run(job) {
                        throw new adone.x.Runtime("custom task error");
                    }
                }`);
                assert.equal(info.count, 1);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                const job = await iTm.enqueueJob(info.name);

                try {
                    await (new Promise((resolve, reject) => {
                        job.on("complete", resolve);
                        job.on("failed", reject);
                    }));
                } catch (err) {
                    assert.instanceOf(err, x.Runtime);
                    assert.equal(err.message, "custom task error");
                    return;
                } finally {
                    await job.remove();
                }

                assert.fail("should throw exception");
            });

            it("enqueue job with defaults", async () => {
                const info = await installSingle(`class $$ extends Worker {
                    run(job) {
                        return job.data.a + job.data.b;
                    }
                }`);
                assert.equal(info.count, 1);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                const job = await iTm.enqueueJob(info.name, {
                    a: 8,
                    b: 8
                });

                const sum = await (new Promise((resolve) => {
                    job.on("complete", (result) => {
                        resolve(result);
                    });
                }));

                assert.equal(sum, 16);
                await job.remove();
            });

            it.skip("limit the concurrency execution of jobs", async () => {
                const info = await installSingle(`class $$ extends Worker {
                    async run(job) {
                        await adone.promise.delay(70);
                        return job.data.a + job.data.b;
                    }
                }`, { concurrency: 3 });
                assert.equal(info.count, 1);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                const sums = [];

                for (let i = 0; i < 16; i++) {
                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    sums.push(new Promise((resolve, reject) => {
                        job.on("complete", (result) => {
                            job.remove().then(() => {
                                resolve(result);
                            });
                        });
                        job.on("failed", (err) => {
                            reject(err);
                        });
                    }));
                }

                await adone.promise.delay(50);
                const jobs = await iTm.listJobs({ taskName: info.name, state: "active" });
                assert.equal(jobs.length, 3);

                for (let i = 0; i < sums.length; i++) {
                    const result = await sums[i];
                    assert.equal(result, 16);
                }
            });

            it("list completed jobs", async () => {
                const info = await installSingle(`class $$ extends Worker {
                    async run(job) {
                        return job.data.a + job.data.b;
                    }
                }`);
                assert.equal(info.count, 1);

                const sums = [];

                if (modeId === 1) {
                    await restartOmnitron();
                }

                for (let i = 0; i < 16; i++) {
                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    sums.push(new Promise((resolve, reject) => {
                        job.on("complete", (result) => {
                            resolve(result);
                        });
                        job.on("failed", (err) => {
                            reject(err);
                        });
                    }));
                }

                for (let i = 0; i < sums.length; i++) {
                    const result = await sums[i];
                    assert.equal(result, 16);
                }

                const jobs = await iTm.listJobs( { state: "complete" });

                assert.equal(jobs.length, sums.length);

                for (const job of jobs) {
                    await iTm.removeJob(job.id);
                }
            });

            describe("Defer job result", () => {
                it("get result of uncompleted job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.data.a + job.data.b;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    const jobResult = await iTm.getJobResult(job.id);
                    assert.isOk(jobResult.state === "inactive" || jobResult.state === "active");
                    assert.isUndefined(jobResult.result);

                    await job.remove();
                });

                it("get result of completed job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.data.a + job.data.b;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    const sum = await (new Promise((resolve) => {
                        job.on("complete", (result) => {
                            resolve(result);
                        });
                    }));

                    assert.equal(sum, 16);

                    const jobResult = await iTm.getJobResult(job.id);
                    assert.equal(jobResult.state, "complete");
                    assert.equal(jobResult.result, sum);

                    await job.remove();
                });

                it("get result of delayed job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.data.a + job.data.b;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    }, { delay: 400 });

                    const jobResult = await iTm.getJobResult(job.id);
                    assert.equal(jobResult.state, "delayed");
                    assert.isUndefined(jobResult.result);

                    await job.remove();
                });

                it("get result of failed job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            throw new Error("some error");
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    await (new Promise((resolve) => {
                        job.on("failed", (err) => {
                            resolve(err);
                        });
                    }));

                    const jobResult = await iTm.getJobResult(job.id);
                    assert.equal(jobResult.state, "failed");
                    assert.isUndefined(jobResult.result);

                    await job.remove();
                });
            });

            describe("Job removing", () => {
                it("remove uncompleted job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.data.a + job.data.b;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    let jobs = await iTm.listJobs();
                    const jobMeta = jobs.find((j) => j.id === job.id);
                    assert.isDefined(jobMeta);
                    assert.isOk(jobMeta.state === "inactive" || jobMeta.state === "active");

                    await job.remove();
                    jobs = await iTm.listJobs();
                    assert.isNotOk(jobs.map((j) => j.id).includes(job.id));
                });

                it("remove completed job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.data.a + job.data.b;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    const sum = await (new Promise((resolve) => {
                        job.on("complete", (result) => {
                            resolve(result);
                        });
                    }));

                    assert.equal(sum, 16);

                    let jobs = await iTm.listJobs();
                    const jobMeta = jobs.find((j) => j.id === job.id);
                    assert.isDefined(jobMeta);
                    assert.equal(jobMeta.state, "complete");

                    await job.remove();
                    jobs = await iTm.listJobs();
                    assert.isNotOk(jobs.map((j) => j.id).includes(job.id));
                });

                it("remove delayed job should not run task", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return job.data.a + job.data.b;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    }, { delay: 400 });

                    let jobs = await iTm.listJobs();
                    const jobMeta = jobs.find((j) => j.id === job.id);
                    assert.isDefined(jobMeta);
                    assert.equal(jobMeta.state, "delayed");

                    await job.remove();
                    jobs = await iTm.listJobs();
                    assert.isNotOk(jobs.map((j) => j.id).includes(job.id));

                    const sum = await (new Promise((resolve) => {
                        job.on("complete", (result) => {
                            resolve(result);
                        });

                        setTimeout(() => resolve(null), 700);
                    }));

                    assert.isNull(sum);
                });

                it("remove failed job", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            throw new Error("some error");
                        }
                    }`);
                    assert.equal(info.count, 1);

                    if (modeId === 1) {
                        await restartOmnitron();
                    }

                    const job = await iTm.enqueueJob(info.name, {
                        a: 8,
                        b: 8
                    });

                    await (new Promise((resolve) => {
                        job.on("failed", (err) => {
                            resolve(err);
                        });
                    }));

                    let jobs = await iTm.listJobs();
                    const jobMeta = jobs.find((j) => j.id === job.id);
                    assert.isDefined(jobMeta);
                    assert.equal(jobMeta.state, "failed");

                    await job.remove();
                    jobs = await iTm.listJobs();
                    assert.isNotOk(jobs.map((j) => j.id).includes(job.id));
                });
            });

            describe.skip("Job state sequence", () => {
                it("normal sequence of states", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return 888;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    const expectedSequence = ["inactive", "active", "complete"];
                    const realSequence = [];

                    const job = await iTm.enqueueJob(info.name);

                    job.on("state", (state) => {
                        realSequence.push(state);
                    });
                    const result = await (new Promise((resolve, reject) => {
                        job.on("complete", resolve);
                        job.on("failed", reject);
                    }));

                    assert.equal(result, 888);
                    assert.sameMembers(realSequence, expectedSequence);
                    await job.remove();
                });

                it("delayed sequence of states", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            return 888;
                        }
                    }`);
                    assert.equal(info.count, 1);

                    const expectedSequence = ["delayed", "inactive", "active", "complete"];
                    const realSequence = [];

                    const job = await iTm.enqueueJob(info.name, undefined, { delay: 100 });

                    job.on("state", (state) => {
                        realSequence.push(state);
                    });
                    const result = await (new Promise((resolve, reject) => {
                        job.on("complete", resolve);
                        job.on("failed", reject);
                    }));

                    assert.equal(result, 888);
                    assert.sameMembers(realSequence, expectedSequence);
                    await job.remove();
                });

                it("failed job sequence of states", async () => {
                    const info = await installSingle(`class $$ extends Worker {
                        run(job) {
                            throw new adone.x.Runtime("custom task error");
                        }
                    }`);
                    assert.equal(info.count, 1);

                    const expectedSequence = ["delayed", "inactive", "active", "failed"];
                    const realSequence = [];

                    const job = await iTm.enqueueJob(info.name, undefined, { delay: 10 });

                    job.on("state", (state) => {
                        realSequence.push(state);
                    });

                    try {
                        await (new Promise((resolve, reject) => {
                            job.on("complete", resolve);
                            job.on("failed", reject);
                        }));
                    } catch (err) { }

                    assert.sameMembers(realSequence, expectedSequence);
                    await job.remove();
                });
            });
        });

        describe("Containers", () => {
            if (modeId === 0) {
                it("create container with defaults", async () => {
                    const iContainer = await iTm.createContainer();
                    assert.isOk(is.netronInterface(iContainer));
                    const meta = await iContainer.getMeta();
                    assert.equal(meta.type, "context");
                    assert.equal(meta.id.length, 64);
                    assert.equal(meta.tasks.length, 0);
                    assert.isAtMost(meta.createTime, adone.date().unix());
                });
            }

            it("should install container to datastore", async () => {
                const id = getContainerId();
                const containerId = await iTm.createContainer({ id, type: "process", returnInterface: false });
                assert.equal(containerId, id);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                const meta = await iDs.findOne({ id, _type: "container" });
                assert.isNotNull(meta);
                assert.equal(meta.type, "process");
                assert.equal(meta.id, id);
                assert.equal(meta.tasks.length, 0);
                assert.isAtMost(meta.createTime, adone.date().unix());
            });

            it("create and get container by id", async () => {
                const id = getContainerId();
                const containerId = await iTm.createContainer({ id, type: "process", returnInterface: false });
                assert.equal(containerId, id);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                const iContainer = await iTm.getContainer(id);
                assert.isOk(is.netronInterface(iContainer));
                const meta = await iContainer.getMeta();
                assert.equal(meta.type, "process");
                assert.equal(meta.id, id);
                assert.equal(meta.tasks.length, 0);
                assert.isAtMost(meta.createTime, adone.date().unix());
            });

            it("create container second time with 'returnIfExists' flag", async () => {
                const id = getContainerId();
                const containerId = await iTm.createContainer({ id, type: "process", returnInterface: false });
                assert.equal(containerId, id);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                const iContainer = await iTm.createContainer({ id, type: "process", returnIfExists: true });

                assert.isOk(is.netronInterface(iContainer));
                const meta = await iContainer.getMeta();
                assert.equal(meta.type, "process");
                assert.equal(meta.id, id);
                assert.equal(meta.tasks.length, 0);
                assert.isAtMost(meta.createTime, adone.date().unix());
            });

            async function checkContainerCodeSinglTask(code) {
                let iContainer = await iTm.createContainer();
                assert.isOk(is.netronInterface(iContainer));

                const taskName = getTaskName();
                const count = await iContainer.install(code.replace("$$", taskName));
                assert.equal(count, 1);

                const meta = await iContainer.getMeta();
                assert.equal(meta.type, "context");
                assert.equal(meta.tasks.length, 1);
                assert.equal(meta.tasks[0], taskName);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                iContainer = await iTm.getContainer(meta.id);
                return await iContainer.run(taskName);
            }

            it("single task", async () => {
                const result = await checkContainerCodeSinglTask(`class $$ extends Task {
                    run() {
                        return {
                            a: 1,
                            b: 2
                        };
                    }
                }`);
                assert.deepEqual(result, { a: 1, b: 2 });
            });

            it("single task with global data", async () => {
                const result = await checkContainerCodeSinglTask(`
                const globalObj = {
                    a: 1,
                    b: 2
                };

                class $$ extends Task {
                    run() {
                        return globalObj;
                    }
                }`);
                assert.deepEqual(result, { a: 1, b: 2 });
            });

            it("single task with global function", async () => {
                const result = await checkContainerCodeSinglTask(`
                const globalObj = {
                    a: 1,
                    b: 2
                };

                function getData() {
                    return globalObj;
                }

                class $$ extends Task {
                    run() {
                        return getData();
                    }
                }`);
                assert.deepEqual(result, { a: 1, b: 2 });
            });

            it("single task with global async function", async () => {
                const result = await checkContainerCodeSinglTask(`
                const globalObj = {
                    a: 1,
                    b: 2
                };

                async function getData() {
                    await adone.promise.delay(10);
                    return globalObj;
                }

                class $$ extends Task {
                    run() {
                        return getData();
                    }
                }`);
                assert.deepEqual(result, { a: 1, b: 2 });
            });

            it("multiple tasks", async () => {
                let iContainer = await iTm.createContainer();
                assert.isOk(is.netronInterface(iContainer));

                const task1Name = getTaskName();
                const task2Name = getTaskName();
                const task3Name = getTaskName();
                const code = `
                const globalObj1 = {
                    a: 1,
                    b: 2
                };

                const globalObj2 = {
                    name: "greatness",
                    vibration: 7
                };

                async function getData() {
                    await adone.promise.delay(10);
                    return globalObj1;
                }

                let counter = 0;

                class $$ extends Task {
                    run() {
                        return getData();
                    }
                }

                class $$$ extends Task {
                    run() {
                        return globalObj2;
                    }
                }

                class $$$$ extends Task {
                    run() {
                        return ++counter;
                    }
                }`;
                const count = await iContainer.install(code.replace("$$", task1Name).replace("$$$", task2Name).replace("$$$$", task3Name));
                assert.equal(count, 3);

                const meta = await iContainer.getMeta();
                assert.equal(meta.type, "context");
                assert.equal(meta.tasks.length, 3);
                assert.include(meta.tasks, task1Name);
                assert.include(meta.tasks, task2Name);
                assert.include(meta.tasks, task3Name);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                iContainer = await iTm.getContainer(meta.id);

                let result = await iContainer.run(task1Name);
                assert.deepEqual(result, { a: 1, b: 2 });

                result = await iContainer.run(task2Name);
                assert.deepEqual(result, { name: "greatness", vibration: 7  });

                for (let i = 1; i <= 7; i++) {
                    result = await iContainer.run(task3Name);
                    assert.deepEqual(result, i);
                }
            });

            it("delete container", async () => {
                const id = getContainerId();
                let iContainer = await iTm.createContainer({ id });
                assert.isOk(is.netronInterface(iContainer));

                const taskName = getTaskName();
                const code = `class $$ extends Task {
                    run() {
                        return {
                            a: 1,
                            b: 2
                        };
                    }
                }`;
                let count = await iContainer.install(code.replace("$$", taskName));
                assert.equal(count, 1);

                const meta = await iContainer.getMeta();
                assert.equal(meta.type, "context");
                assert.equal(meta.tasks.length, 1);
                assert.equal(meta.tasks[0], taskName);

                if (modeId === 1) {
                    await restartOmnitron();
                }

                iContainer = await iTm.getContainer(meta.id);
                const result = await iContainer.run(taskName);
                assert.deepEqual(result, { a: 1, b: 2 });

                count = await iTm.deleteContainer(id);
                assert.equal(count, 1);

                const dbMeta = await iDs.findOne({ _type: "container", id });
                assert.isNull(dbMeta);
                try {
                    await iContainer.run(taskName);
                } catch (err) {
                    assert.instanceOf(err, x.NotExists);
                    return;
                }

                assert.fail("should throw NotExists exception");
            });
        });
    }
});
