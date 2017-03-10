import Container from "./container";
import Job, { state as jobState } from "./job";
import sandbox from "./sandbox";
const { is, x } = adone;
const { Contextable, Private, Public, Description, Type, Args } = adone.netron.decorator;
const { parse, traverse, generate, core } = adone.js.compiler;
const { Set, SortedArray } = adone.collection;

const baseClasses = ["Task", "Worker"];
const requiredTaskMethods = ["run"];

const JOB_ID_LENGTH = 64;

@Contextable
@Private
@Description("Task manager service")
export class TaskManager {
    constructor(options) {
        this.netron = options.netron;
        this.omnitron = options.omnitron;
        this.options = options;
        
        this._containers = new Map();
        this._tasks = new Map();
        this._jobs = new Set(undefined, (jobA, jobB) => jobA.meta.id === jobB.meta.id, (j) => j.meta.id);
        
        this._context = null;
    }

    async initialize() {
        const iDatabase = this.omnitron.getInterface("database");
        this.iDs = await iDatabase.getDatastore(this.options.datastore);

        // Load tasks and workers metadata.
        const taskMetas = await this.iDs.find({ _type: { $in: ["task", "worker"] } }, { code: 0, data: 0 });
        for (const meta of taskMetas) {
            this._tasks.set(meta.name, this._initTaskInfo(meta));
        }

        // Load containers and workers metadata.
        const containerMetas = await this.iDs.find({ _type: "container" }, { dataCode: 0 });
        for (const meta of containerMetas) {
            this._containers.set(meta.id, this._initContainerInfo(meta));
        }
    }

    uninitialize() {  
    }

    get defaultContext() {
        if (is.null(this._context)) {
            this.sandbox = sandbox(this);
            this._context = adone.std.vm.createContext(this.sandbox);
        }
        return this._context;
    }

    @Public
    @Description("Creates container and returns its interface")
    async createContainer({ id, type = "context", returnInterface = true, returnIfExists = false } = { }) {
        if (is.nil(id)) {
            id = adone.text.random(64);
        } else {
            if (this._containers.has(id)) {
                if (returnIfExists) {
                    return this.getContainer(id);
                } else {
                    throw new x.Exists("Container already exists");
                }
            }
        }

        const containerInfo = this._initContainerInfo({ id, type, createTime: adone.date().unix(), tasks: [] });
        containerInfo.meta = await this.iDs.insert(containerInfo.meta);
        this._containers.set(id, containerInfo);

        if (returnInterface) {
            const container = new Container(this, containerInfo.meta);
            containerInfo.instance = container;
            return container;
        }

        return id;
    }

    @Public
    @Description("Returns container with specified id")
    getContainer(id) {
        const containerInfo = this._getContainer(id);
        if (is.null(containerInfo.instance)) {
            containerInfo.instance = new Container(this, containerInfo.meta);
        }
        return containerInfo.instance;
    }

    @Public
    @Description("Deletes container and uninstalls all it's installed tasks")
    async deleteContainer(id) {
        const containerInfo = this._getContainer(id);

        if (!is.null(containerInfo.instance)) {
            this.netron.releaseContext(containerInfo.instance);
        }

        const taskNames = this._getTaskNames(id, containerInfo.meta.tasks.map((taskName) => `${id}.${taskName}`));
        if (taskNames.length > 0) {
            await this._uninstall(taskNames, id);
        }

        const count = this.iDs.remove({ _type: "container", _id: containerInfo.meta._id });
        this._containers.delete(id);
        
        return count;
    }

    @Public
    @Description("Installs one or more tasks")
    async install(code, options) {
        const { installed } = await this._install(code, options);
        return installed.length;
    }

    @Public
    @Description("Uninstalls task")
    uninstall(...taskNames) {
        return this._uninstall(taskNames);
    }

    @Public
    @Description("Runs task")
    run(name, ...args) {
        return this._run(this.defaultContext, name, args);
    }

    @Public
    @Description("Returns task options")
    async getTaskOptions(name) {
        const taskInfo = await this._getTask(name);
        const result = { concurrency: taskInfo.meta.concurrency };
        if (taskInfo.meta._type === "task") {
            result.singleton = taskInfo.meta.singleton;
            result.volatile = taskInfo.meta.volatile;
        }
        return result;
    }

    @Public
    @Description("Returns an array of all task names")
    @Type(Array)
    getTaskNames() {
        return this._getTaskNames();
    }

    @Public
    @Description("Enqueues job")
    async enqueueJob(taskName, data, { priority = 0, ttl = 0, delay = 0, attempts = 1, backoff = false } = { }, emitter) {
        const taskInfo = this._getTask(taskName);

        let meta = adone.o({
            _type: "job",
            id: adone.text.random(JOB_ID_LENGTH),
            taskName,
            priority,
            ttl,
            delay,
            attempts,
            backoff,
            state: (delay > 0 ? jobState.delayed : jobState.inactive),
            data
        });

        meta = await this.iDs.insert(meta);
        const jobInfo = adone.o({ meta, emitter });
        this._jobs.add(jobInfo);
        process.nextTick(() => this._enqueueJob(taskInfo, jobInfo));

        return jobInfo.meta.id;
    }

    @Public
    @Description("Returns job result")
    async getJobResult(id) {
        const jobInfo = await this._getJobById(id);
        return { state: jobInfo.meta.state, result: jobInfo.meta.result };
    }

    @Public
    @Description("Returns list of jobs")
    @Args([Object, "options"])
    listJobs({ id, taskName, state } = {}) {
        const query = {
            _type: "job"
        };

        if (is.string(id)) {
            if (id.length !== JOB_ID_LENGTH) {
                throw new x.NotValid(`Job ID is not valid: ${id}`);
            }
            query.id = id;
        }

        if (is.string(taskName)) {
            query.taskName = taskName;
        }

        if (!is.nil(state)) {
            if (!is.propertyOwned(jobState, state)) {
                throw new x.NotValid(`Invalid state value: ${state}`);
            }
            query.state = state;
        }
        return this.iDs.find(query, { _id: 0, _type: 0 });
    }

    @Public
    @Description("Removes job with specified id")
    async removeJob(id) {
        const jobInfo = await this._getJobById(id);

        try {
            this._jobs.delete(jobInfo);
            if (jobInfo.meta.delay > 0 && !is.undefined(jobInfo.timer)) {
                clearTimeout(jobInfo.timer);
            } else {
                jobInfo.zombi = true;
                const taskInfo = this._getTask(jobInfo.meta.taskName);
                taskInfo.jobs.delete(jobInfo);
            }
        } catch (err) {
            if (!(err instanceof x.NotExists)) {
                throw err;
            }
        } finally {
            await this.iDs.remove({ _id: jobInfo.meta._id });
        }
    }

    async _install(code, { force = false, volatile = true, singleton = false, concurrency = 1, description = "" } = { }, namePrefix = "") {
        const installed = [];
        const ast = this._parseCode(code);

        traverse(ast, {
            ClassDeclaration: (path) => {
                if (is.nil(path.node.superClass) || !baseClasses.includes(path.node.superClass.name)) {
                    throw new x.NotValid("Task should extend one of base task class");
                }

                const className = `${namePrefix}${path.node.id.name}`;
                const superClassName = path.node.superClass.name;

                let taskInfo = this._tasks.get(className);
                if (!force && !is.undefined(taskInfo)) {
                    return;
                }

                if (is.undefined(taskInfo)) {
                    taskInfo = this._initTaskInfo({ name: className, _type: superClassName.toLowerCase(), concurrency, description });
                    if (superClassName === "Task") {
                        taskInfo.meta.singleton = !!singleton;
                        taskInfo.meta.volatile = !!volatile;
                    }
                    taskInfo.isNew = true;
                } else {
                    if (superClassName === "Task" && taskInfo.meta.singleton !== singleton) {
                        throw new x.NotAllowed("You cannot change singleton flag on existing task");
                    }
                    taskInfo.meta.description = description;
                    taskInfo.meta.concurrency = concurrency;
                    
                    // Delete cached transformed code
                    delete taskInfo.transformedCode;
                }
                taskInfo.meta.code = this._generateTaskClass(path.node);

                const methods = [];

                path.traverse({
                    ClassMethod(path) {
                        const methodName = path.node.key.name;
                        if (superClassName === "Worker" && methodName === "run" && (path.node.params.length === 0 || path.node.params[0].name !== "job")) {
                            throw new x.NotAllowed("Not allowed run-method declaration - should be 'run(job)'");
                        }
                        if (requiredTaskMethods.includes(methodName)) {
                            methods.push(methodName);
                        }
                    }
                });

                if (methods.length !== requiredTaskMethods.length) {
                    throw new x.NotValid(`Task should have these methods: ${requiredTaskMethods.join(", ")}`);
                }
                installed.push(taskInfo);
            }
        });

        for (const taskInfo of installed) {
            if (taskInfo.isNew === true) {
                if (taskInfo._type === "task" && !taskInfo.meta.singleton && !taskInfo.meta.volatile) {
                    throw new x.NotAllowed("Only singleton task can be non-volatile");
                }
                delete taskInfo.isNew;
                this._tasks.set(taskInfo.meta.name, taskInfo);
                
                taskInfo.meta = await this.iDs.insert(taskInfo.meta);
            } else {
                await this.iDs.update( { _type: taskInfo.meta._type, name: taskInfo.meta.name }, taskInfo.meta);
            }
        }

        return { ast, installed };
    }

    async _uninstall(taskNames, cntainerId = "") {
        let uninstallCount = 0;
        for (const name of taskNames) {
            if (!this._isCompatibleName(name, cntainerId)) continue;
            const taskInfo = this._tasks.get(name);
            if (!is.undefined(taskInfo)) {
                if (taskInfo.instances.size > 0) {
                    taskInfo.zombi = true;
                } else {
                    await this._deleteTask(taskInfo);
                }
                uninstallCount++;
            }
        }

        return uninstallCount;
    }

    _initTaskInfo({ _id, name, _type, concurrency = 1, volatile = true, singleton = false, description = "" } = { }) {
        const meta = adone.o({
            _type,
            name,
            concurrency,
            description
        });

        if (!is.undefined(_id)) {
            meta._id = _id;
        }

        const taskInfo = adone.o({
            meta,
            instances: new Set(),
        });

        if (_type === "task") {
            taskInfo.meta.volatile = volatile;
            taskInfo.meta.singleton = singleton;
            taskInfo.meta.data = null;
        } else if (_type === "worker") {
            taskInfo.jobs = new SortedArray(undefined, (jobA, jobB) => jobA.meta.id === jobB.meta.id, (jobA, jobB) => jobB.meta.priority - jobA.meta.priority);
        }

        return taskInfo;
    }

    _initContainerInfo({ _id, id, type, createTime, tasks }) {
        const meta = adone.o({
            _type: "container",
            id,
            type,
            tasks,
            createTime,
            dataCode: null
        });

        if (!is.undefined(_id)) {
            meta._id = _id;
        }

        return adone.o({
            meta,
            instance: null
        });
    }

    async _enqueueJob(taskInfo, jobInfo) {
        await this._updateJobStatus(jobInfo, jobInfo.meta.state);
        if (jobInfo.meta.delay > 0) {
            jobInfo.timer = setTimeout(() => {
                delete jobInfo.timer;
                this._updateJobStatus(jobInfo, jobState.inactive).then(() => {
                    taskInfo.jobs.push(jobInfo);
                    this._processJobQueued(taskInfo);
                });
            }, jobInfo.meta.delay);
        } else {
            taskInfo.jobs.push(jobInfo);
            return this._processJobQueued(taskInfo);
        }
    }

    async _processJobQueued(taskInfo) {
        if (taskInfo.jobs.length > 0 && taskInfo.instances.size < taskInfo.meta.concurrency) {
            const jobInfo = taskInfo.jobs.pop();
            const emitter = jobInfo.emitter;
            const job = new Job(jobInfo.meta.data, jobInfo.emitter);
            let isTaskFinished = false;
            let runJob;
            let promise;
            try {
                promise = this._createTaskInstance(this.defaultContext, taskInfo);
                taskInfo.instances.add(promise);
                runJob = await promise;

                this._processJobQueueInNextTick(taskInfo);
                
                await this._updateJobStatus(jobInfo, jobState.active);
                const result = await runJob([job]);
                jobInfo.meta.result = result;
                isTaskFinished = true;
                if (jobInfo.zombi !== true) {
                    await this._updateJobStatus(jobInfo, jobState.complete);
                    await emitter.emit("complete", result);
                }
            } catch (err) {
                if (!isTaskFinished && jobInfo.zombi !== true) {
                    await this._updateJobStatus(jobInfo, jobState.failed);
                    await emitter.emit("failed", err);
                }
            } finally {
                promise && taskInfo.instances.delete(promise);
                this._processJobQueueInNextTick(taskInfo);
                this.netron.releaseInterface(emitter);
                delete jobInfo.emitter;
            }
        }
    }

    _processJobQueueInNextTick(taskInfo) {
        // Run next queued job (in parallel).
        process.nextTick(() => {
            this._processJobQueued(taskInfo);
        });
    }

    async _updateJobStatus(jobInfo, state) {
        jobInfo.meta.state = state;
        const update = { $set: { state: state } };
        if (state === jobState.complete) {
            update.$set.result = jobInfo.meta.result;
        }
        await this.iDs.update({ _id: jobInfo.meta._id }, update);
        return jobInfo.emitter.emit("state", state);
    }

    async _run(context, name, args) {
        const taskInfo = this._tasks.get(name);
        if (is.undefined(taskInfo) || taskInfo.zombi === true) {
            throw new x.NotExists("Task not exists");
        }

        let result;
        let runTask;
        if (taskInfo.meta.singleton) {
            if (taskInfo.instances.size === 0) {
                // Workaround for case where two or more calls of run() fired before instance added to set.
                const promise = this._createTaskInstance(context, taskInfo);
                taskInfo.instances.add(promise);
                runTask = await promise;
            } else {
                runTask = taskInfo.instances.only();
                if (is.promise(runTask)) {
                    runTask = await runTask;
                }
            }
            result = await runTask(args);
            if (taskInfo.zombi === true) {
                /*await */this._deleteTask(taskInfo);
            }
        } else {
            if (taskInfo.instances.size === taskInfo.meta.concurrency) {
                throw new x.LimitExceeded(`Limit of running task instances is exceeded (max ${taskInfo.meta.concurrency})`);
            }

            const promise = this._createTaskInstance(context, taskInfo);
            taskInfo.instances.add(promise);
            runTask = await promise;
            result = await runTask(args);
            taskInfo.instances.delete(promise);
            
            if (taskInfo.zombi === true && taskInfo.instances.size === 0) {    
                /*await */this._deleteTask(taskInfo);
            }
        }

        return result;
    }

    async _createTaskInstance(context, taskInfo) {
        let taskName;
        let taskCode;
        if (taskInfo.meta.name.includes(".")) {
            taskName = taskInfo.meta.name.split('.')[1];
            taskCode = "";
        } else {
            taskName = taskInfo.meta.name;
            taskCode = await this._getTaskCode(taskInfo);
        }

        const wrappedCode = `
            (function() {
                ${taskCode}
                const instance =  new ${taskName}();
                instance.manager = $taskManager;
                const rndId = adone.text.random(16);
                $instances[rndId] = instance;
                return rndId;
            })();`;

        if (!is.string(taskInfo.transformedCode)) {
            taskInfo.transformedCode = core.transform(wrappedCode, this.options.transpiler).code;
        }
        const taskClassScript = adone.std.vm.createScript(taskInfo.transformedCode, { filename: taskName, displayErrors: true });
        const scriptOptions = {
            displayErrors: true,
            breakOnSigint: false
        };

        const rndId = taskClassScript.runInContext(context, scriptOptions);
        return (args) => {
            const hexedArgs = adone.data.mpak.encode(args).toString("hex");
            return adone.std.vm.runInContext(`
                (function() {
                    const instance = $instances["${rndId}"];
                    const args = adone.data.mpak.decode(adone.ExBuffer.fromHex("${hexedArgs}"));
                    instance.running = true;
                    const result = instance.run(...args);
                    if (adone.is.promise(result)) {
                        return result.then((result) => {
                            instance.running = false;
                            return result;
                        }, (err) => {
                            instance.running = false;
                            return err;
                        });
                    } else {
                        instance.running = false;
                        return result;
                    }
                })();
            `, context, scriptOptions);
        };
    }

    _parseCode(code) {
        return parse(code, {
            sourceType: "script"
        });
    }

    _generateTaskClass(classAST) {
        const generated = generate(classAST, {
            comments: false
        });
        return generated.code;
    }

    _getTaskNames(containerId = "", subset = []) {
        const names = [...this._tasks.keys()];

        return names.filter((name) => {
            if (this._isCompatibleName(name, containerId)) {
                return subset.length === 0 || subset.includes(name);
            }
            return false;
        });
    }

    _isCompatibleName(name, containerId) {
        return ((containerId === "" && !name.includes(".")) || (containerId !== "" && name.startsWith(`${containerId}.`)));
    }

    _getTask(name) {
        const taskInfo = this._tasks.get(name);
        if (is.undefined(taskInfo)) {
            throw new x.NotExists(`Task ${name} not exists`);
        }
        return taskInfo;
    }

    async _getTaskCode(taskInfo) {
        if (!is.string(taskInfo.meta.code)) {
            const result = await this.iDs.findOne({ _type: taskInfo.meta._type, _id: taskInfo.meta._id }, { _id: 0, code: 1/*, data: 1*/ });
            if (is.null(result)) {
                throw new x.NotExists(`Task ${taskInfo.meta.name} not exists`);
            }
            taskInfo.meta.code = result.code;
            // taskInfo.meta.data = dataCode.data;
        }
        return taskInfo.meta.code;
    }

    async _getJobById(id) {
        const query = { _type: "job", id };
        const jobMeta = await this.iDs.findOne(query);
        if (is.null(jobMeta)) {
            throw new x.NotExists("Job not exists");
        }
        let jobInfo = this._jobs.get({ meta: jobMeta });
        if (!is.undefined(jobInfo)) {
            return jobInfo;
        }

        jobInfo = adone.o({ meta: jobMeta });
        this._jobs.add(jobInfo);
        return jobInfo;
    }

    _deleteTask(taskInfo) {
        this._tasks.delete(taskInfo.meta.name);
        return this.iDs.remove({ _type: taskInfo.meta._type, name: taskInfo.meta.name });
    }

    _getContainer(id) {
        const containerInfo = this._containers.get(id);
        if (is.undefined(containerInfo)) {
            throw new x.NotExists("Container not exists");
        }
        return containerInfo;
    }
}
