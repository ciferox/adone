const { is, util, fast, fs, terminal, noop } = adone;

const isTasksComposition = (descriptor) => {
    return is.plainObject(descriptor)
        && !descriptor.$handler
        && !descriptor.$from
        && !descriptor.$to;
};

const isSequentalTasks = (descriptor) => is.array(descriptor);

const onlyOnce = () => (target, key, descriptor) => {
    const { value } = descriptor;
    const map = new WeakMap();
    descriptor.value = function (...args) {
        if (!map.has(this)) {
            map.set(this, value.apply(this, args));
        }
        return map.get(this);
    };
};

class AbstractTask {
    constructor(parent, descriptor, key, options) {
        this.parent = parent;
        this.key = key;
        ({
            $description: this.description = null,
            $progress: this.progress = false,
            $notify: this.notify = false,
            $depends: this.dependencies = [],
            $before: this.before = noop,
            $after: this.after = noop
        } = descriptor);
        this.options = options;
        this.dependencies = util.arrify(
            is.function(this.dependencies)
                ? this.dependencies(this.options)
                : this.dependencies
        );
        if (is.function(this.progress)) {
            this.progress = this.progress(this.options);
        }
    }

    resolveDependencies(resolver) {
        this.dependencies = this.dependencies.map((dep) => resolver.resolve(dep, this));
    }

    hasParent() {
        return Boolean(this.parent);
    }

    getParent() {
        return this.parent;
    }

    getKey() {
        return this.key;
    }

    getDescription() {
        if (!is.null(this.description)) {
            return this.description;
        }
        const key = this.getKey();
        if (!this.hasParent()) {
            return key;
        }
        const parentDescription = this.getParent().getDescription();
        if (!parentDescription) {
            return key;
        }
        if (is.number(key)) {
            return `${parentDescription}[${key}]`;
        }
        if (is.identifier(key)) {
            return `${parentDescription}.${key}`;
        }
        return `${parentDescription}["${key}"]`;
    }

    @onlyOnce()
    async execute() {
        await Promise.all(this.dependencies.map((dep) => dep.execute()));
        await this.before(this.options);
        let bar;
        if (this.progress) {
            bar = terminal.progress({
                schema: `:spinner ${this.getDescription()} :elapsed`
            });
            bar.update(0);
        }
        const res = await this._execute();
        if (this.progress) {
            bar.complete(true);
        }
        if (this.options.watch) {
            return;
        }
        await this.after(this.options);
        return res;
    }
}

class Task extends AbstractTask {
    constructor(parent, descriptor, key, options) {
        super(parent, descriptor, key, options);
        ({
            $handler: this.handler = null,
            $from: this.from = null,
            $to: this.to = null,
            $transform: this.transform = null,
            $watch: this.watchPattern = null,
            $watchOpts: this.watchOpts = {},
            $streamOpts: this.streamOpts = {},
            $notify: this.notify = {},
            $onError: this.onError = null
        } = descriptor);
        if (is.function(this.notify)) {
            this.notify = this.notify(this.options);
        }
    }

    isHandledByUser() {
        return !is.null(this.handler);
    }

    isEmpty() {
        return !this.isHandledByUser() && (is.null(this.from) || is.null(this.to));
    }

    async _execute() {
        if (this.isHandledByUser()) {
            if (!this.options.watch || !this.watchPattern) {
                let res;
                try {
                    res = await this.handler(this.options);
                } catch (err) {
                    if (this.onError) {
                        await this.onError(err, this.options);
                        return;
                    }
                    throw err;
                }
                await this.after(res);
                return res;
            }
            const watcher = fs.watch(this.watchPattern, {
                alwaysStat: true,
                ignoreInitial: true,
                ...this.watchOpts
            });
            watcher.on("all", async (event, path, stat) => {
                try {
                    this.handler(this.options, event, path, stat);
                } catch (err) {
                    if (this.onError) {
                        await this.onError(err, this.options, event, path, stat);
                        return;
                    }
                    throw err;
                }
            });
            return;
        }
        if (this.isEmpty()) {
            return;
        }
        let stream = this.options.watch
            ? fast.watch(this.from, { ...this.streamOpts, ...this.watchOpts })
            : fast.src(this.from, this.streamOpts);
        if (this.transform) {
            stream = this.transform(stream, this.options) || stream;
        }
        if (this.notify) {
            stream.notify(this.notify);
        }
        if (this.onError) {
            stream.on("error", this.onError);
        }
        if (this.options.watch) {
            stream.dest(this.to);
            return null;
        }
        try {
            await stream.dest(this.to);
        } catch (err) {
            if (!this.onError) {
                throw err;
            }
            // must have been handled
            return;
        }
        await this.after(this.options);
    }
}

class TasksComposition extends AbstractTask {
    constructor(parent, descriptor, key, options) {
        super(parent, descriptor, key, options);
        this.tasks = {};
    }

    addTask(id, task) {
        this.tasks[id] = task;
    }

    hasTask(id) {
        return Boolean(this.tasks[id]);
    }

    getTask(id) {
        return this.tasks[id];
    }

    _execute() {
        return Promise.all(util.entries(this.tasks).map(async ([id, task]) => {
            return [id, await task.execute()];
        }));
    }

    [Symbol.iterator]() {
        return util.values(this.tasks)[Symbol.iterator]();
    }
}

class SequentalTasks extends AbstractTask {
    constructor(parent, key) {
        super(parent, {}, key, {});
        this.tasks = [];
    }

    hasParent() {
        return super.getParent().hasParent();
    }

    getParent() {
        return super.getParent().getParent();
    }

    addTask(task) {
        this.tasks.push(task);
    }

    async _execute() {
        const results = [];
        for (const task of this.tasks) {
            // eslint-disable-next-line
            results.push(await task.execute());
        }
        return results;
    }

    [Symbol.iterator]() {
        return this.tasks[Symbol.iterator]();
    }
}

// declaration
let parseValue = null;

const parseComposition = (parent, rawStructure, key, options) => {
    const composition = new TasksComposition(parent, rawStructure, key, options);
    for (const [key, value] of util.entries(rawStructure)) {
        if (key.startsWith("$")) {
            continue;
        }
        composition.addTask(key, parseValue(composition, value, key, options));
    }
    return composition;
};

const parseSequence = (parent, rawSequence, key, options) => {
    const sequence = new SequentalTasks(parent, key);
    for (const [idx, value] of util.enumerate(rawSequence)) {
        sequence.addTask(parseValue(sequence, value, idx, options));
    }
    return sequence;
};

const parseTask = (parent, descriptor, key, options) => {
    if (is.function(descriptor)) {
        descriptor = { $handler: descriptor, $description: descriptor.name };
    }
    return new Task(parent, descriptor, key, options);
};

parseValue = (parent, value, key, options) => {
    if (isSequentalTasks(value)) {
        return parseSequence(parent, value, key, options);
    }
    if (isTasksComposition(value)) {
        return parseComposition(parent, value, key, options);
    }
    return parseTask(parent, value, key, options);
};

class Path {
    constructor(path) {
        this.path = Path.parse(path);
    }

    isRelative() {
        return !this.isAbsolute();
    }

    isAbsolute() {
        return this.path[0] === "";
    }

    [Symbol.iterator]() {
        return this.path[Symbol.iterator]();
    }

    static parse(path) {
        // empty path ?
        const parts = path.split("/");
        return parts;
    }
}

class Resolver {
    resolve(dep, task) {
        const path = new Path(dep);
        let node = task.getParent();
        if (path.isAbsolute()) {
            while (node.hasParent()) {
                node = node.getParent();
            }
        }
        for (const part of path) {
            if (!(node instanceof TasksComposition)) {
                throw new Error("must be tasks composition");
            }
            if (part === "..") {
                if (!node.hasParent()) {
                    throw new Error("failed to get parent node");
                } else {
                    node = node.getParent();
                }
            } else if (node.hasTask(part)) {
                node = node.getTask(part);
            } else {
                throw new Error(`task ${part} not found`);
            }
        }
        return node;
    }
}


const resolveDependencies = (schema, resolver = new Resolver()) => {
    if (schema instanceof Task) {
        schema.resolveDependencies(resolver);
        return;
    }
    for (const t of schema) {
        resolveDependencies(t, resolver);
    }
};

export class Builder {
    constructor(schema, options = {}) {
        this.schema = new TasksComposition(null, {}, "", {});
        this.schema.addTask("", parseValue(this.schema, schema, "", options));
        resolveDependencies(this.schema);
    }

    async execute(options) {
        await this.schema.execute(options);
    }
}
