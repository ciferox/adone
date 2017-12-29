const {
    is,
    x,
    lazify,
    hrtime,
    util,
    std
} = adone;

const shani = lazify({
    util: "./util"
}, adone.asNamespace(exports), require);

const SET_TIMEOUT_MAX = 2 ** 31 - 1;

const callGc = typeof gc === "undefined" ? adone.noop : gc; // eslint-disable-line

const isShaniFrame = (frame) => {
    return /adone.(?:lib|src).shani.index\.js/.test(frame);
};

/**
 * Returns the place from where a function was called
 */
const getCurrentLocation = () => {
    const err = new Error();
    const lines = err.stack.split("\n");
    let i = 1;
    while (isShaniFrame(lines[i])) {
        ++i;
    }
    const frame = lines[i];
    const match = frame.match(/\((.+):(\d+):(\d+)\)$/);
    return {
        path: match[1],
        line: Number(match[2]),
        column: Number(match[3])
    };
};

class Hook {
    constructor(block, description, callback, runtimeContext, meta) {
        this.block = block;
        this.description = description;
        this.callback = callback;
        this._timeout = adone.null;
        this._fired = false;
        this._failed = null;
        this.runtimeContext = runtimeContext;
        this.meta = meta;
    }

    fired() {
        return this._fired === true;
    }

    failed() {
        return !is.null(this._failed);
    }

    cause() {
        return this._failed;
    }

    timeout(ms = adone.null) {
        if (ms !== adone.null) {
            if (is.number(ms) && ms > SET_TIMEOUT_MAX) {
                ms = SET_TIMEOUT_MAX;
            }
            this._timeout = ms;
            return this;
        }
        if (this._timeout !== adone.null) {
            return this._timeout;
        }
        return this.block.timeout();
    }

    async run() {
        this._fired = true;
        let err = null;
        let s = hrtime();
        let uncaughtException;
        let unhandledRejection;
        try {
            let p = new Promise((resolve, reject) => {
                uncaughtException = reject;
                unhandledRejection = reject;
                process.once("uncaughtException", uncaughtException);
                process.once("unhandledRejection", unhandledRejection);
                this.runtimeContext.timeout = this.timeout.bind(this);
                if (this.callback.length) {
                    this.callback.call(this.runtimeContext, (err) => {
                        err ? reject(err) : resolve();
                    });
                } else {
                    Promise.resolve(this.callback.call(this.runtimeContext)).then(resolve, reject);
                }
            });
            const timeout = this.timeout();
            if (timeout) {
                p = adone.promise.timeout(p, timeout);
            }
            await p;
        } catch (_err) {
            if (!_err) {
                _err = new Error("Promise rejected with no or falsy reason");
            }
            err = _err;
        } finally {
            delete this.runtimeContext.timeout;
            process.removeListener("uncaughtException", uncaughtException);
            process.removeListener("unhandledRejection", unhandledRejection);
            s = hrtime(s);
        }
        this._failed = err;
        const elapsed = s[0] * 1e3 + s[1] / 1e6;
        const timeout = this.timeout();
        if (timeout && elapsed >= timeout) {
            this._failed = new x.Timeout(`Timeout of ${this.timeout()}ms exceeded`);
            if (err) {
                this._failed.original = err.original || err;
            }
            err = this._failed;
        }
        return { err, elapsed };
    }
}

const generateId = (parent) => {
    if (!parent) {
        return null;
    }
    let id = "";
    if (parent.id) {
        id += `${parent.id}.`;
    }
    id += parent.children.length + 1;

    return id;
};

class Block {
    constructor(name, parent = null, options) {
        this.name = name;
        this.hooks = {
            before: [],
            beforeEach: [],
            after: [],
            afterEach: []
        };
        this._beforeHooksFired = false;
        this._afterHooksFired = false;

        this.children = [];
        this.parent = parent;

        this._timeout = adone.null;
        this._level = null;
        this._todo = false;
        this._skip = false;
        this._cancelled = false;
        this._only = false;
        this._watch = false;
        this._options = options;
        this.id = generateId(parent);
    }

    async prepare() {
        const { _options: options } = this;
        if (!options) {
            return;
        }
        if (!this.isExclusive() && is.propertyOwned(options, "skip")) { // no explicit skip + skip option provided
            const { skip } = options;
            const type = util.typeOf(skip);
            switch (type) {
                case "boolean": {
                    if (skip) {
                        this.skip();
                    }
                    break;
                }
                case "function": {
                    if (await skip()) {
                        this.skip();
                    }
                    break;
                }
                default: {
                    throw new x.InvalidArgument("skip: only functions and booleans are allowed");
                }
            }
        }
        if (is.propertyOwned(options, "timeout")) {
            const { timeout } = options;
            const type = util.typeOf(timeout);
            switch (type) {
                case "number": {
                    if (timeout < 0) {
                        throw new x.InvalidArgument("timeout: cannot be negative");
                    }
                    this.timeout(timeout);
                    break;
                }
                case "function": {
                    const value = await timeout();
                    if (value < 0) {
                        throw new x.InvalidArgument("timeout: cannot be negative");
                    }
                    this.timeout(value);
                    break;
                }
                default: {
                    throw new x.InvalidArgument("timeout: only functions and numbers are allowed");
                }
            }
        }
    }

    addChild(child) {
        this.children.push(child);
    }

    *beforeHooks() {
        yield* this.hooks.before;
    }

    *afterHooks() {
        for (let i = this.hooks.after.length - 1; i >= 0; --i) {
            yield this.hooks.after[i];
        }
    }

    *beforeEachHooks() {
        yield* this.hooks.beforeEach;
    }

    *afterEachHooks() {
        for (let i = this.hooks.afterEach.length - 1; i >= 0; --i) {
            yield this.hooks.afterEach[i];
        }
    }

    isExclusive() {
        return this._skip === true || ((this.parent || false) && this.parent.isExclusive());
    }

    isInclusive() {
        return this._only === true;
    }

    isTodo() {
        return this._todo === true;
    }

    isCancelled() {
        return this._cancelled === true;
    }

    hasInclusive(exclusiveMode = false) {
        for (const child of this.children) {
            if (
                (child.isInclusive() && !child.isExclusive()) ||
                (
                    child instanceof Block &&
                    child.hasInclusive(exclusiveMode || child.isExclusive())
                )
            ) {
                return true;
            }
        }
        return false;
    }

    skip() {
        this._skip = true;
        this._todo = false;
        this._cancelled = false;
        return this;
    }

    only() {
        this._only = true;
        return this;
    }

    todo() {
        this.skip();
        this._todo = true;
        return this;
    }

    cancel(reason, type) {
        this.skip();
        this._cancelled = true;
        this.cancelReason = reason;
        this.cancelType = type;
        for (const i of this.children) {
            i.cancel(reason, type);
        }
    }

    slow() {
        for (const i of this.children) {
            i.slow();
        }
    }

    timeout(ms = adone.null) {
        if (ms !== adone.null) {
            if (is.number(ms) && ms > SET_TIMEOUT_MAX) {
                ms = SET_TIMEOUT_MAX;
            }
            this._timeout = ms;
            return this;
        }
        if (this._timeout !== adone.null) {
            return this._timeout;
        }
        if (this.parent) {
            return this.parent.timeout();
        }
        return null;
    }

    level(level) {
        if (!is.undefined(level)) {
            this._level = level;
            return this;
        } else if (is.null(this._level)) {
            this._level = this.parent ? this.parent.level() + 1 : 0;
        }
        return this._level;
    }

    chain() {
        if (!this.parent) {
            return this.name;
        }
        const p = this.parent.chain();
        if (!p) {
            return this.name;
        }
        return `${p} - ${this.name}`;
    }

    blockChain() {
        if (!this.parent) {
            return [this];
        }
        return [...this.parent.blockChain(), this];
    }
}

class TestModule extends adone.js.Module {
    // use native require to require external modules
    loadExtension(filename, extension) {
        if (filename.includes("node_modules")) {
            return this.exports = require(filename);
        }
        return super.loadExtension(filename, extension);
    }
}

class Test {
    constructor(description, callback, block, runtimeContext, meta, engineOptions = {}, options = {}) {
        this.description = description;
        this.callback = callback;
        this.block = block;
        this.runtimeContext = runtimeContext;
        this._skip = false;
        this._only = false;
        this._todo = false;
        this._slow = false;
        this._cancelled = false;
        this._timeout = adone.null;
        this._beforeHooks = [];
        this._afterHooks = [];
        this._beforeHooksFired = false;
        this._afterHooksFired = false;
        this.meta = meta;
        this._engineOptions = engineOptions;
        this._options = options;
        this.id = generateId(block);
    }

    async prepare() {
        const { _options: options } = this;
        if (!options) {
            return;
        }
        if (!this.isExclusive() && is.propertyOwned(options, "skip")) { // no explicit skip + skip option provided
            const { skip } = options;
            const type = util.typeOf(skip);
            switch (type) {
                case "boolean": {
                    if (skip) {
                        this.skip();
                    }
                    break;
                }
                case "function": {
                    if (await skip()) {
                        this.skip();
                    }
                    break;
                }
                default: {
                    throw new x.InvalidArgument("skip: only functions and booleans are allowed");
                }
            }
        }
        if (is.propertyOwned(options, "timeout")) {
            const { timeout } = options;
            const type = util.typeOf(timeout);
            switch (type) {
                case "number": {
                    if (timeout < 0) {
                        throw new x.InvalidArgument("timeout: cannot be negative");
                    }
                    this.timeout(timeout);
                    break;
                }
                case "function": {
                    const value = await timeout();
                    if (value < 0) {
                        throw new x.InvalidArgument("timeout: cannot be negative");
                    }
                    this.timeout(value);
                    break;
                }
                default: {
                    throw new x.InvalidArgument("timeout: only functions and numbers are allowed");
                }
            }
        }
        const hasBefore = is.propertyOwned(options, "before");
        const hasAfter = is.propertyOwned(options, "after");
        if (hasBefore || hasAfter) {
            const handle = async (hookType) => {
                const { [hookType]: hook } = options;
                const type = util.typeOf(hook);
                switch (type) {
                    case "function": {
                        this[hookType](hook);
                        break;
                    }
                    case "Array": {
                        // supports
                        // [callback]
                        // [description, callback]
                        // [[description, callback] or callback, ...]
                        const hookWithDescription = (item) => {
                            if (item.length !== 2) {
                                throw new x.IllegalState(`${hookType}: not enough arguments for [description, callback]`);
                            }
                            if (!is.function(item[1])) {
                                throw new x.InvalidArgument(`${hookType}: callback must be a function for [description, callback]`);
                            }
                            this[hookType](...item);
                        };
                        if (hook.length !== 0) {
                            if (is.string(hook[0])) {
                                hookWithDescription(hook);
                            } else {
                                for (const item of hook) {
                                    if (is.array(item)) {
                                        if (is.string(item[0])) {
                                            hookWithDescription(item);
                                        } else {
                                            throw new x.InvalidArgument(`${hookType}: invalid value, must be [description, callback]`);
                                        }
                                    } else if (is.function(item)) {
                                        this[hookType](item);
                                    } else {
                                        throw new x.InvalidArgument(`${hookType}: invalid value, must be callback or [description, callback]`);
                                    }
                                }
                            }
                        }
                        break;
                    }
                    default: {
                        throw new x.InvalidArgument(`${hookType}: only functions and arrays are allowed`);
                    }
                }
            };
            if (hasBefore) {
                await handle("before");
            }
            if (hasAfter) {
                await handle("after");
            }
        }
    }

    async run() {
        let err = null;
        let s = hrtime();
        let uncaughtException;
        let unhandledRejection;
        try {
            let p = new Promise((resolve, reject) => {
                uncaughtException = reject;
                unhandledRejection = reject;
                process.once("uncaughtException", uncaughtException);
                process.once("unhandledRejection", unhandledRejection);
                this.runtimeContext.skip = this.skip.bind(this);
                this.runtimeContext.timeout = this.timeout.bind(this);
                if (this.callback.length) {
                    this.callback.call(this.runtimeContext, (err) => {
                        err ? reject(err) : resolve();
                    });
                } else {
                    Promise.resolve(this.callback.call(this.runtimeContext)).then(resolve, reject);
                }
            });
            const timeout = this.timeout();
            if (timeout) {
                p = adone.promise.timeout(p, timeout);
            }
            await p;
        } catch (_err) {
            if (!_err) {
                _err = new Error("Promise rejected with no or falsy reason");
            }
            err = _err;
        } finally {
            delete this.runtimeContext.skip;
            delete this.runtimeContext.timeout;

            process.removeListener("uncaughtException", uncaughtException);
            process.removeListener("unhandledRejection", unhandledRejection);
            s = hrtime(s);
        }
        const elapsed = s[0] * 1e3 + s[1] / 1e6;
        const timeout = this.timeout();
        if (timeout && elapsed >= timeout) {
            const _err = new x.Timeout(`Timeout of ${this.timeout()}ms exceeded`);
            if (err) {
                _err.original = err;
            }
            err = _err;
        }
        return { err, elapsed };
    }

    isExclusive() {
        return this._skip === true || this.block.isExclusive();
    }

    isInclusive() {
        return this._only === true;
    }

    isTodo() {
        return this._todo === true;
    }

    isCancelled() {
        return this._cancelled === true;
    }

    skip() {
        this._todo = false;
        this._cancelled = false;
        this._skip = true;
        return this;
    }

    only() {
        this._only = true;
        return this;
    }

    todo() {
        this.skip();
        this._todo = true;
        return this;
    }

    cancel(reason, type) {
        this.skip();
        this._cancelled = true;
        this.cancelReason = reason;
        this.cancelType = type;
        return this;
    }

    slow() {
        this._slow = true;
        return this;
    }

    isSlow() {
        return this._slow === true;
    }

    timeout(ms = adone.null) {
        if (ms !== adone.null) {
            if (is.number(ms) && ms > SET_TIMEOUT_MAX) {
                ms = SET_TIMEOUT_MAX;
            }
            this._timeout = ms;
            return this;
        }

        if (this._timeout !== adone.null) {
            return this._timeout;
        }

        return this.block.timeout();
    }

    after(description, callback) {
        if (adone.is.function(description)) {
            [description, callback] = ["", description];
        }
        const hook = new Hook(this.block, description, callback, this.runtimeContext, this.meta); // use current test location ??
        this._afterHooks.push(hook);
        return this;
    }

    before(description, callback) {
        if (adone.is.function(description)) {
            [description, callback] = ["", description];
        }
        const hook = new Hook(this.block, description, callback, this.runtimeContext, this.meta); // use current test location ??
        this._beforeHooks.push(hook);
        return this;
    }

    chain() {
        return `${this.block.chain()} : ${this.description}`;
    }

    *beforeHooks() {
        yield* this._beforeHooks;
    }

    *afterHooks() {
        yield* this._afterHooks;
    }
}

const chainingInterace = (cb, modifiers) => {
    const createFn = (values = {}) => {
        const fn = (...args) => cb(values, args);
        for (const mod of modifiers) {
            Object.defineProperty(fn, mod, {
                get() {
                    return createFn({ ...values, [mod]: true });
                }
            });
        }
        return fn;
    };

    return createFn();
};

/**
 * Represents a config loader which handles .shanirc.js files
 */
class ConfigLoader {
    constructor(root) {
        this.root = root;
        this._existsCache = new adone.collection.MapCache();
        this._rcCache = new adone.collection.MapCache();
    }

    getRcPath(dirname) {
        return std.path.join(dirname, ".shanirc.js");
    }

    isExists(path) {
        if (this._existsCache.has(path)) {
            return this._existsCache.get(path);
        }
        const exists = std.fs.existsSync(path);
        this._existsCache.set(path, exists);
        return exists;
    }

    getConfigFor(dirname) {
        if (this._rcCache.has(dirname)) {
            return this._rcCache.get(dirname);
        }
        const p = this.getRcPath(dirname);
        let config;
        if (!this.isExists(p)) {
            config = null;
        } else {
            config = adone.require(p);
            if (config.default) {
                config = config.default;
            }
        }
        this._rcCache.set(dirname, config);
        return config;
    }

    async loadConfigFor(path, context) {
        let dirname = std.path.dirname(path);
        const configChain = [];
        do {
            const config = this.getConfigFor(dirname);
            if (config) {
                configChain.unshift(config);
            }
            dirname = std.path.dirname(dirname);
        } while (dirname !== this.root);

        for (const fn of configChain) {
            // apply all init functions from the root
            // todo: apply from the leaf ? with optional parent init
            await fn(context);
        }
    }
}

export class Engine {
    constructor({
        defaultTimeout = 5000,
        defaultHookTimeout = 5000,
        transpilerOptions = {},
        callGc = false,
        watch = false,
        skipSlow = false,
        onlySlow = false,
        root = process.cwd()
    } = {}) {
        this._paths = []; // path can be a glob or a path
        this.defaultTimeout = defaultTimeout;
        this.defaultHookTimeout = defaultHookTimeout;
        this.transpilerOptions = transpilerOptions;
        this.callGc = callGc;
        this.watch = watch;
        this.skipSlow = skipSlow;
        this.onlySlow = onlySlow;
        this.configLoader = new ConfigLoader(root);
    }

    include(...paths) {
        this._paths.push(...paths);
    }

    exclude(...paths) {
        this._paths.push(...paths.map((x) => `!${x}`));
    }

    context() {
        const root = new Block(null);
        root.level(-1); // take care of the nested blocks
        root.timeout(this.defaultTimeout);
        const stack = adone.collection.Stack.from([root]);

        const runtimeContext = {};

        const _describe = (...args) => {
            const callback = args.pop();

            if (!is.function(callback)) {
                throw new x.InvalidArgument("The last argument must be a function");
            }

            const options = args.length > 0 && is.plainObject(args[args.length - 1]) ? args.pop() : null;

            if (args.length === 0) {
                throw new x.InvalidArgument("A describe must have a name");
            }
            for (let i = 0; i < args.length - 1; ++i) {
                const block = new Block(args[i], stack.top);
                stack.top.addChild(block);
                stack.push(block);
            }
            const block = new Block(args[args.length - 1], stack.top, options);
            stack.top.addChild(block);
            stack.push(block);

            runtimeContext.skip = block.skip.bind(block);
            runtimeContext.timeout = block.timeout.bind(block);

            if (is.promise(callback.call(runtimeContext))) {
                throw new Error("It is not allowed to use asynchronous functions as a describe callback");
            }

            delete runtimeContext.skip;
            delete runtimeContext.timeout;

            for (let i = 0; i < args.length; ++i) {
                stack.pop();
            }
            return block;
        };

        const describe = chainingInterace((modifiers, args) => {
            const block = _describe(...args);
            for (const [k, v] of Object.entries(modifiers)) {
                if (v) {
                    block[k]();
                }
            }
            return block;
        }, ["skip", "only", "slow", "todo"]);

        const _it = (description, options, callback) => {
            if (is.function(options)) {
                [options, callback] = [null, options];
            }
            const meta = { location: getCurrentLocation() };
            const test = new Test(description, callback, stack.top, runtimeContext, meta, {}, options);
            stack.top.addChild(test);
            return test;
        };

        const it = chainingInterace((modifiers, args) => {
            const test = _it(...args);
            for (const [k, v] of Object.entries(modifiers)) {
                if (v) {
                    test[k]();
                }
            }
            return test;
        }, ["skip", "only", "slow", "todo"]);

        const before = (description, callback) => {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            const meta = { location: getCurrentLocation() };
            const hook = new Hook(stack.top, description, callback, runtimeContext, meta);
            stack.top.hooks.before.push(hook);
        };

        const after = (description, callback) => {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            const meta = { location: getCurrentLocation() };
            const hook = new Hook(stack.top, description, callback, runtimeContext, meta);
            stack.top.hooks.after.push(hook);
        };

        const beforeEach = (description, callback) => {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            const meta = { location: getCurrentLocation() };
            const hook = new Hook(stack.top, description, callback, runtimeContext, meta);
            stack.top.hooks.beforeEach.push(hook);
        };

        const afterEach = (description, callback) => {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            const meta = { location: getCurrentLocation() };
            const hook = new Hook(stack.top, description, callback, runtimeContext, meta);
            stack.top.hooks.afterEach.push(hook);
        };

        // debug..
        const printStructure = (block = root, level = 0) => {
            for (const t of block.children) {
                const n = t instanceof Block ? t.name : t.description;
                if (t.isInclusive()) {
                    console.log("    ".repeat(level), "+", n);
                } else if (t.isTodo()) {
                    console.log("    ".repeat(level), "?", n);
                } else if (t.isExclusive()) {
                    console.log("    ".repeat(level), "-", n);
                } else {
                    console.log("    ".repeat(level), " ", n);
                }
                if (t instanceof Block) {
                    printStructure(t, level + 1);
                }
            }
        };

        const start = () => {
            const emitter = new adone.event.EventEmitter();
            let stopped = false;

            emitter.stop = () => {
                stopped = true;
            };

            (async () => {
                // walk through the tree and prepare the nodes, sequentially
                await (async function prepare(block) {
                    for (const child of block.children) {
                        await child.prepare(); // eslint-disable-line
                        if (child instanceof Block) {
                            await prepare(child); // eslint-disable-line
                        }
                    }
                })(root);

                if (this.onlySlow) {
                    // remove all non-slow nodes
                    (function removeNonSlow(block) {
                        const children = block.children;
                        let hasSlowNodes = false;
                        for (let i = 0; i < children.length; ++i) {
                            const node = children[i];
                            if (node instanceof Block) {
                                // if it has slow nodes, we must not remove it
                                if (removeNonSlow(node)) {
                                    hasSlowNodes = true;
                                } else {
                                    // it has no slow nested nodes, we can remove it
                                    children.splice(i--, 1);
                                }
                            } else {
                                // this is a test node
                                if (!node.isSlow()) {
                                    children.splice(i--, 1);
                                } else {
                                    hasSlowNodes = true;
                                }
                            }
                        }
                        return hasSlowNodes;
                    })(root);
                }

                if (this.skipSlow) {
                    // skip all slow nodes
                    (function skipSlow(block) {
                        for (const node of block.children) {
                            if (node instanceof Block) {
                                skipSlow(node);
                            } else if (node.isSlow()) {
                                node.skip();
                            }
                        }
                    })(root);
                }

                // mark all the skipped nodes
                (function markSkipped(block) {
                    const exclusive = block.isExclusive();
                    const todo = block.isTodo();
                    for (const node of block.children) {
                        if (exclusive) {
                            todo ? node.todo() : node.skip();
                        }
                        if (node instanceof Block) {
                            markSkipped(node);
                        }
                    }
                })(root);

                // mark all the paths to the inclusive nodes if there are
                const hasInclusive = (function checkInclusive(block) {
                    if (block.isInclusive() && !block.hasInclusive()) {
                        // there are no inclusive nested nodes, but the parent is inclusive, mark all the nodes
                        (function mark(node) {
                            for (const n of node.children) {
                                // if (n.isExclusive()) {
                                //     continue;
                                // }
                                n.only();
                                if (n instanceof Block) {
                                    mark(n);
                                }
                            }
                        })(block);
                        return true;
                    }
                    let hasInclusive = false;

                    // mark all inclusive nodes
                    for (const node of block.children) {
                        if (node.isExclusive() || !node.isInclusive()) {
                            continue;
                        }
                        hasInclusive = true;
                        // inclusive node
                        // mark the parent
                        block.only();
                        if (node instanceof Block) {
                            // go further
                            checkInclusive(node);
                        }
                    }

                    if (!hasInclusive) {
                        // no inclusive children, check all the nested nodes
                        for (const node of block.children) {
                            if (node.isExclusive()) {
                                // sorry
                                continue;
                            }
                            if (node instanceof Block && checkInclusive(node)) {
                                hasInclusive = true;
                                // mark the parent
                                block.only();
                            }
                        }
                    }

                    return hasInclusive;
                })(root);

                if (hasInclusive) {
                    // remove all the non-inclusive nodes
                    (function deleteNonInclusive(block) {
                        block.children = block.children.filter((node) => {
                            return node.isInclusive();
                        });
                        // we have only inclusive nodes, go deeper
                        for (const node of block.children) {
                            if (node instanceof Block) {
                                deleteNonInclusive(node);
                            }
                        }
                    })(root);
                }

                (function deleteChildrenWithNoTests(block) {
                    for (let i = 0; i < block.children.length; ++i) {
                        const child = block.children[i];
                        if (child instanceof Test) {
                            continue;
                        }
                        // no tests
                        if (child.children.length === 0) {
                            block.children.splice(i--, 1);
                            continue;
                        }
                        deleteChildrenWithNoTests(child);
                        // no tests after reducing
                        if (child.children.length === 0) {
                            block.children.splice(i--, 1);
                        }
                    }
                })(root);

                const executor = async (block) => {
                    if (block !== root) {
                        emitter.emit("enter block", { block });
                    }
                    let failed = false;
                    let hookFailed = false;
                    if (block.children.every((x) => x.isExclusive())) {
                        for (const node of block.children) {
                            if (node instanceof Block) {
                                executor(node); // should skip all nested the tests
                            } else {
                                emitter.emit("skip test", { block, test: node });
                            }
                        }
                    } else {
                        // at least 1 test will be executed (if no hook fails)
                        let err;
                        for (const parentBlock of block.blockChain()) {
                            if (stopped) {
                                break;
                            }
                            for (const hook of parentBlock.beforeHooks()) {
                                if (stopped) {
                                    break;
                                }
                                if (hook.failed()) {
                                    hookFailed = true;
                                    break;
                                }
                                if (hook.fired()) {
                                    continue;
                                }
                                emitter.emit("start before hook", { block, hook });
                                // eslint-disable-next-line no-await-in-loop
                                const meta = await hook.run();
                                emitter.emit("end before hook", { block, hook, meta });
                                if (meta.err) {
                                    err = meta.err;
                                    err.hook = hook; // ..
                                    hookFailed = true;
                                    break;
                                }
                            }
                            if (hookFailed) {
                                break;
                            }
                        }
                        for (const node of block.children) {
                            if (stopped) {
                                break;
                            }
                            if (hookFailed) {
                                node.cancel(err, "beforeHook");
                            }
                            if (node instanceof Test && node.isExclusive()) {
                                emitter.emit("skip test", { block, test: node, runtime: false });
                                continue;
                            }
                            if (node instanceof Block) {
                                // eslint-disable-next-line no-await-in-loop
                                const meta = await executor(node);
                                failed = failed || meta.failed;
                                // hookFailed should be always false here, so just assign
                                // hookFailed = meta.hookFailed;
                            } else {
                                const blocksFired = [];
                                let hookFailed = false;
                                let err;
                                for (const parentBlock of block.blockChain()) {
                                    if (stopped) {
                                        break;
                                    }
                                    for (const hook of parentBlock.beforeEachHooks()) {
                                        if (stopped) {
                                            break;
                                        }
                                        emitter.emit("start before each hook", { block, test: node, hook });
                                        // eslint-disable-next-line no-await-in-loop
                                        const meta = await hook.run();
                                        emitter.emit("end before each hook", { block, test: node, hook, meta });
                                        if (meta.err) {
                                            err = meta.err;
                                            err.hook = hook;
                                            hookFailed = true;
                                            break;
                                        }
                                    }
                                    blocksFired.push(parentBlock);
                                    if (hookFailed) {
                                        break;
                                    }
                                }
                                if (!stopped) {
                                    if (hookFailed) {
                                        node.cancel(err, "beforeEach");
                                        emitter.emit("skip test", { block, test: node, runtime: false });
                                    } else {
                                        for (const hook of node.beforeHooks()) {
                                            if (stopped) {
                                                break;
                                            }
                                            emitter.emit("start before test hook", { block, test: node, hook });
                                            // eslint-disable-next-line no-await-in-loop
                                            const meta = await hook.run();
                                            emitter.emit("end before test hook", { block, test: node, hook, meta });
                                            if (meta.err) {
                                                err = meta.err;
                                                err.hook = hook;
                                                hookFailed = true;
                                                break;
                                            }
                                        }
                                        if (!stopped) {
                                            if (hookFailed) {
                                                node.cancel(err, "beforeTest");
                                                emitter.emit("skip test", { block, test: node, runtime: false });
                                                continue;
                                            } else {
                                                emitter.emit("start test", { block, test: node });
                                                let meta;
                                                if (!hookFailed) {
                                                    // eslint-disable-next-line no-await-in-loop
                                                    meta = await node.run();
                                                } else {
                                                    meta = { elapsed: 0, err: new Error("Rejected due the hook fail") };
                                                }

                                                // it can be skipped in runtime
                                                meta.skipped = node.isExclusive();
                                                if (meta.skipped) {
                                                    emitter.emit("skip test", { block, test: node, runtime: true });
                                                }

                                                emitter.emit("end test", { block, test: node, meta });
                                                if (meta.err) {
                                                    failed = true;
                                                }
                                            }
                                        }
                                    }
                                    for (const hook of node.afterHooks()) {
                                        emitter.emit("start after test hook", { block, test: node, hook });
                                        // eslint-disable-next-line no-await-in-loop
                                        const meta = await hook.run();
                                        emitter.emit("end after test hook", { block, test: node, hook, meta });
                                        if (meta.err) {
                                            hookFailed = true;
                                            break;
                                        }
                                    }
                                }
                                for (const parentBlock of blocksFired.reverse()) {
                                    for (const hook of parentBlock.afterEachHooks()) {
                                        emitter.emit("start after each hook", { block, test: node, hook });
                                        // eslint-disable-next-line no-await-in-loop
                                        const meta = await hook.run();
                                        emitter.emit("end after each hook", { block, test: node, hook, meta });
                                        if (meta.err) {
                                            hookFailed = true;
                                        }
                                    }
                                }
                            }
                        }
                        for (const hook of block.afterHooks()) {
                            if (hook.fired()) {
                                continue;
                            }
                            emitter.emit("start after hook", { block, hook });
                            // eslint-disable-next-line no-await-in-loop
                            const meta = await hook.run();
                            emitter.emit("end after hook", { block, hook, meta });
                            if (meta.err) {
                                hookFailed = true;
                            }
                        }
                    }

                    if (block !== root) {
                        emitter.emit("exit block", { block });
                    }
                    return { failed, hookFailed };
                };

                return executor(root);
            })()
                .catch((err) => {
                    emitter.emit("error", err);
                })
                .catch(() => { })
                .then(() => {
                    emitter.emit("done");
                });
            return emitter;
        };

        const structure = () => {
            /**
             * @param {Block} node
             */
            const analyze = (node) => {
                const result = {};

                for (const child of node.children) {
                    if (child instanceof Block) {
                        result[`${child.id} ${child.name}`] = analyze(child);
                    } else {
                        result[child.id] = child.description;
                    }
                }
                return result;
            };

            return analyze(root);
        };

        return {
            describe,
            context: describe,
            it,
            specify: it,
            before,
            after,
            beforeEach,
            afterEach,
            start,
            structure,
            root,
            runtime: runtimeContext,
            skip: () => {
                root.skip();
            },
            timeout: (ms) => root.timeout(ms),
            prefix: (...names) => {
                for (const name of names) {
                    const block = new Block(name, stack.top);
                    stack.top.addChild(block);
                    stack.push(block);
                }
            }
        };
    }

    // TODO: refactor the shit
    _process(cb, { wrapLogFunctions = true } = {}) {
        const emitter = new adone.event.EventEmitter();

        const main = async (paths) => {
            const contentCache = new Map();
            const transpiledCache = new Map();
            const loader = (module, filename) => {
                if (!contentCache.has(filename)) {
                    contentCache.set(filename, adone.text.stripBom(adone.std.fs.readFileSync(filename, "utf-8")));
                }
                const content = contentCache.get(filename);
                module._compile(content, filename);
            };
            const transpile = adone.js.Module.transforms.transpile(this.transpilerOptions);
            const transform = (content, filename) => {
                if (!transpiledCache.has(filename)) {
                    transpiledCache.set(filename, transpile(content, filename));
                }
                return transpiledCache.get(filename);
            };
            adone.assertion.loadMockInterface();

            // stub all the log functions to see the source

            const getSource = () => {
                const { stack } = new Error();
                const res = stack.split("\n")[3].trim().match(/\((.+?):(\d+):(\d+)\)/);
                if (is.null(res)) {
                    return null;
                }
                return {
                    filename: res[1],
                    line: Number(res[2]),
                    column: Number(res[3])
                };
            };

            const cwd = process.cwd();

            const stub = {
                wrappers: [],
                stub(obj, ...props) {
                    for (const prop of props) {
                        const method = obj[prop];
                        obj[prop] = function (...args) {
                            try {
                                const source = getSource();
                                if (!is.null(source)) {
                                    const location = `${adone.std.path.relative(cwd, source.filename)}:${source.line}:${source.column}`;
                                    if (prop === "dir") {
                                        // it does not support rest args..
                                        args[0] = [location, args[0]];
                                    } else {
                                        args.unshift(`[${location}]`);
                                    }
                                }
                            } catch (err) {
                                // just skip
                            }

                            return method.apply(this, args);
                        };
                        obj[prop].restore = () => obj[prop] = method;
                        this.wrappers.push(obj[prop]);
                    }
                },
                restore() {
                    for (const wrapper of this.wrappers) {
                        wrapper.restore();
                    }
                }
            };

            if (wrapLogFunctions) {
                stub.stub(console, "log", "error", "debug", "info", "dir", "warn");
                stub.stub(adone, "log", "fatal", "error", "warn", "info", "debug", "trace");
            }

            for (const path of (await adone.fs.glob(paths)).sort()) {
                const context = this.context();
                const topass = [
                    "describe", "context",
                    "it", "specify",
                    "before", "after",
                    "beforeEach", "afterEach",
                    "skip"
                ];

                const dirname = std.path.dirname(path);


                try {
                    // load config if exists
                    await this.configLoader.loadConfigFor(path, context);
                } catch (err) {
                    err.message = `Error while loading config for this file: ${path}\n${err.message}`;
                    emitter.emit("error", err);
                    continue; // ?
                }

                const m = new TestModule(path, {
                    transform,
                    loaders: { ".js": loader }
                });

                global.$ = {};
                adone.lazify({
                    expect: () => adone.expect,
                    assert: () => adone.assert,
                    spy: () => shani.util.spy,
                    stub: () => shani.util.stub,
                    mock: () => shani.util.mock,
                    match: () => shani.util.match,
                    request: () => shani.util.request,
                    nock: () => shani.util.nock,
                    FS: () => shani.util.FS,
                    include: () => (p) => m.require(p, { cache: false }),
                    fakeClock: () => util.fakeClock,
                    system: () => shani.util.system,
                    forkProcess: () => shani.util.system.process.bindFork(dirname),
                    forkProcessSync: () => shani.util.system.process.bindForkSync(dirname),
                    nodeRequire: () => require // only for hacks and absolute paths
                }, global.$, m.require.bind(m), { configurable: true });

                adone.lazify({
                    expect: () => global.$.expect,
                    assert: () => global.$.assert,
                    spy: () => global.$.spy,
                    stub: () => global.$.stub,
                    mock: () => global.$.mock,
                    match: () => global.$.match,
                    request: () => global.$.request,
                    nock: () => global.$.nock,
                    include: () => global.$.include,
                    FS: () => global.$.FS,
                    fakeClock: () => global.$.fakeClock,
                    system: () => global.$.system,
                    forkProcess: () => global.$.forkProcess,
                    forkProcessSync: () => global.$.forkProcessSync,
                    nodeRequire: () => require // only for hacks and absolute paths
                }, global, null, { configurable: true });

                for (const name of topass) {
                    global[name] = context[name];
                    global.$[name] = context[name];
                }

                try {
                    m.loadItself();
                } catch (err) {
                    err.message = `Error while loading this file: ${path}\n${err.message}`;
                    emitter.emit("error", err);
                    continue; // ?
                }

                let mustContinue = true;
                try {
                    const res = await cb(context, path);
                    if (is.boolean(res)) {
                        mustContinue = res;
                    }
                } finally {
                    m.cache.delete(path);
                    if (this.callGc) {
                        callGc();
                    }
                }
                if (!mustContinue) {
                    break;
                }
            }
            if (wrapLogFunctions) {
                stub.restore();
            }
        };

        Promise.resolve().then(() => main(this._paths)).catch((err) => {
            emitter.emit("error", err);
        }).then(() => {
            emitter.emit("done");
        });

        return emitter;
    }

    start() {
        let mustContinue = true;

        let executing = null;
        const executingDone = () => new Promise((resolve, reject) => {
            executing.once("error", reject);
            executing.once("done", resolve);
        });

        const emitter = this._process(async (context) => {
            executing = context.start();
            const events = [
                "enter block", "exit block",
                "start test", "end test", "skip test",
                "start before hook", "end before hook",
                "start after hook", "end after hook",
                "start before each hook", "end before each hook",
                "start before test hook", "end before test hook",
                "start after each hook", "end after each hook",
                "start after test hook", "end after test hook"
            ];
            for (const e of events) {
                executing.on(e, (...data) => {
                    emitter.emit(e, ...data);
                });
            }

            // eslint-disable-next-line no-await-in-loop
            await executingDone();

            return mustContinue;
        });

        emitter.stop = () => {
            mustContinue = false;
            if (executing) {
                executing.stop();
            }
        };

        return emitter;
    }

    structure() {
        const emitter = this._process(async (context, path) => {
            emitter.emit("structure", path, context.structure());
        }, { wrapLogFunctions: false });
        return emitter;
    }
}

const filterShaniFrames = (frames) => {
    for (let i = 0; i < frames.length; ++i) {
        if (isShaniFrame(frames[i])) {
            return frames.slice(0, i);
        }
    }
    return frames;
};

export const consoleReporter = ({
    allTimings = false,
    timers = false,
    showHooks = false,
    keepHooks = false
} = {}) => {
    const term = adone.runtime.term;

    const { isTTY } = process.stdout;

    const { text: { unicode: { symbol } } } = adone;

    const ansiRegexp = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;
    const parse = (str) => {
        str = term.parse(str);
        if (!isTTY) {
            str = str.replace(ansiRegexp, "");
        }
        return str;
    };

    const log = (message = "", { newline = true } = {}) => {
        process.stdout.write(parse(message));
        if (newline) {
            process.stdout.write("\n");
        }
    };

    return (emitter) => {
        let pending = 0;
        let failed = 0;
        let passed = 0;
        let todos = 0;
        const cancelled = [];
        const hooksFails = [];
        let testsElapsed = 0;
        let totalElapsed = hrtime();
        const errors = [];
        const globalErrors = [];
        let bar = null;

        const elapsedToString = (elapsed, timeout, little = true) => {
            let elapsedString = adone.util.humanizeTime(elapsed); // ms

            const k = elapsed / timeout;
            if (k < 0.25) {
                if (little) {
                    elapsedString = `{green-fg}${elapsedString}{/}`;
                } else {
                    elapsedString = "";
                }
            } else if (k < 0.75) {
                elapsedString = `{yellow-fg}${elapsedString}{/}`;
            } else {
                elapsedString = `{red-fg}${elapsedString}{/}`;
            }
            return elapsedString;
        };

        if (showHooks) {
            const colorizeHook = (type) => {
                return type
                    .replace("before", "{#d9534f-fg}before{/}")
                    .replace("after", "{#0275d8-fg}after{/}")
                    .replace("each", "{#5cb85c-fg}each{/}");
            };

            const startHookHandler = (type) => {
                type = colorizeHook(type);
                return ({ block, hook, test }) => {
                    const padding = "    ".repeat(Math.max(block.level() + (test ? 1 : 0), 0));
                    const options = {
                        schema: `${padding}:spinner ${type} hook {grey-fg}{escape}${hook.description}{/escape}{/}:suffix`
                    };
                    if (timers || allTimings) {
                        options.timeFormatter = (x) => elapsedToString(x, hook.timeout());
                    }
                    bar = adone.runtime.term.progress(options);
                    bar.update(0, {
                        suffix: timers ? " (:elapsed)" : ""
                    });
                };
            };

            const endHookHandler = () => {
                return ({ meta: { err } }) => {
                    if (!keepHooks) {
                        bar.complete();
                        bar.clear();
                    } else {
                        bar.complete(!err, {
                            suffix: allTimings ? " (:elapsed)" : ""
                        });
                    }
                };
            };
            emitter
                .on("start before hook", startHookHandler("before"))
                .on("start before each hook", startHookHandler("before each"))
                .on("start before test hook", startHookHandler("before test"))
                .on("start after hook", startHookHandler("after"))
                .on("start after each hook", startHookHandler("after each"))
                .on("start after test hook", startHookHandler("after test"))
                .on("end before hook", endHookHandler("before"))
                .on("end before each hook", endHookHandler("before each"))
                .on("end before test hook", endHookHandler("before test"))
                .on("end after hook", endHookHandler("after"))
                .on("end after each hook", endHookHandler("after each"))
                .on("end after test hook", endHookHandler("after test"));
        }

        const endHookHandler = (type) => {
            return ({ hook, meta: { err }, block }) => {
                if (err) {
                    hooksFails.push([hook, err, type, block]);
                }
            };
        };

        emitter
            .on("end before hook", endHookHandler("before"))
            .on("end before each hook", endHookHandler("before each"))
            .on("end before test hook", endHookHandler("before test"))
            .on("end after hook", endHookHandler("after"))
            .on("end after each hook", endHookHandler("after each"))
            .on("end after test hook", endHookHandler("after test"));

        let enteredBlocks = [];
        let blockLevel = 0;

        const createTestBar = (test) => {
            const padding = "    ".repeat(test.block.level() + 1);
            const options = {
                schema: `${padding}:spinner {:tag}{escape}${test.description}{/escape}{/}:suffix`
            };
            if (timers || allTimings) {
                options.timeFormatter = (x) => elapsedToString(x, test.timeout());
            }
            return adone.runtime.term.progress(options);
        };

        let firstBlock = true;

        const reportOnThrow = (f) => function (...args) {
            try {
                return f.apply(this, args);
            } catch (err) {
                emitter.emit("reporterError", err);
            }
        };

        Error.stackTraceLimit = 100;

        emitter
            .on("enter block", reportOnThrow(({ block }) => {
                if (firstBlock) {
                    log();
                    firstBlock = false;
                }
                if (enteredBlocks[blockLevel] !== block.name) {
                    enteredBlocks = enteredBlocks.slice(0, blockLevel);
                    enteredBlocks.push(block.name);
                    log(`${"    ".repeat(blockLevel)} {escape}${block.name}{/escape}`);
                }
                ++blockLevel;
            }))
            .on("exit block", () => {
                --blockLevel;
            })
            .on("start test", reportOnThrow(({ test }) => {
                bar = createTestBar(test);
                bar.update(0, {
                    tag: "grey-fg",
                    suffix: timers ? " (:elapsed)" : ""
                });
            }))
            .on("end test", reportOnThrow(({ test, meta: { err, elapsed, skipped } }) => {
                if (skipped) {
                    // shouldn't be handled here
                    return;
                }

                bar.complete(!err, {
                    tag: err ? "red-fg" : "grey-fg",
                    prefix: err ? `${failed + 1})` : "",
                    suffix: allTimings ? " (:elapsed)" : ""
                });
                testsElapsed += elapsed;
                if (err) {
                    ++failed;
                    errors.push([test, err]);
                } else {
                    ++passed;
                }
            }))
            .on("skip test", reportOnThrow(({ test, runtime }) => {
                if (!runtime) {
                    bar = createTestBar(test);
                }
                if (test.isTodo()) {
                    bar.complete("{yellow-fg}?{/yellow-fg}", {
                        tag: "yellow-fg",
                        suffix: ""
                    });
                    ++todos;
                } else if (test.isCancelled()) {
                    bar.complete("{magenta-fg}#{/magenta-fg}", {
                        tag: "magenta-fg",
                        suffix: ""
                    });
                    cancelled.push(test);
                } else {
                    bar.complete(`{cyan-fg}${symbol.minus}{/cyan-fg}`, {
                        tag: "cyan-fg",
                        suffix: ""
                    });
                    ++pending;
                }
            }))
            .on("done", reportOnThrow(() => {
                if (errors.length) {
                    log();
                    log("Errors:\n");
                    for (const [idx, [failed, err]] of adone.util.enumerate(errors, 1)) {
                        // print block chain
                        const stack = new adone.collection.Stack();
                        let block = failed.block;
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) {escape}${[...stack].join(` ${symbol.arrowRight}  `)} : ${failed.description}{/escape}`);
                        log(`    at ${failed.meta.location.path}:${failed.meta.location.line}:${failed.meta.location.column}`);
                        log();

                        if (err.name && err.message) {
                            log(`{red-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{red-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (err.expected && err.actual) {
                            log();
                            log(adone.text.indent(shani.util.diff.getDiff(err.actual, err.expected), 2));
                        }
                        log();
                        if (adone.is.string(err.stack)) {
                            const stackMsg = filterShaniFrames(err.stack.split("\n")).slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                if (hooksFails.length) {
                    log();
                    log("Hooks fails:\n");
                    for (let [idx, [hook, err, type, block]] of adone.util.enumerate(hooksFails, 1)) {
                        // print block chain
                        const stack = new adone.collection.Stack();
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) ${type} hook failed: {escape}${[...stack].join(` ${symbol.arrowRight}  `)} ${hook.description ? `: ${hook.description}` : ""}{/escape}`);
                        log(`    at ${hook.meta.location.path}:${hook.meta.location.line}:${hook.meta.location.column}`);
                        log();

                        if (err.name && err.message) {
                            log(`{red-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{red-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                    }
                }

                if (cancelled.length) {
                    log();
                    log("Cancel reasons:\n");
                    for (const [idx, test] of adone.util.enumerate(cancelled, 1)) {
                        const err = test.cancelReason;
                        const hook = err.hook;
                        const type = test.cancelType;
                        let block = test.block;
                        // print block chain
                        const stack = new adone.collection.Stack();
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) {escape}${[...stack].join(` ${symbol.arrowRight}  `)} : ${test.description}{/escape} was cancelled due to ${type} fail:`);
                        log(`    hook at ${hook.meta.location.path}:${hook.meta.location.line}:${hook.meta.location.column}`);
                        log(`    test at ${test.meta.location.path}:${test.meta.location.line}:${test.meta.location.column}`);
                        log();

                        if (err.name && err.message) {
                            log(`{magenta-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{magenta-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                if (globalErrors.length) {
                    log();
                    log("Global errors:\n");
                    for (const [idx, err] of adone.util.enumerate(globalErrors, 1)) {
                        if (err.name && err.message) {
                            log(`{#ff9500-fg}${idx}) {escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{#ff9500-fg}${idx}) {escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                log();
                totalElapsed = hrtime(totalElapsed);
                testsElapsed = adone.util.humanizeTime(testsElapsed);
                totalElapsed = adone.util.humanizeTime(
                    totalElapsed[0] * 1e3 + totalElapsed[1] / 1e6
                );
                log(`    {green-fg}${passed} passed{/} {grey-fg}(${testsElapsed}){/}`);
                if (pending) {
                    log(`{cyan-fg}    ${pending} skipped{/}`);
                }
                if (failed) {
                    log(`{red-fg}    ${failed} failed{/}`);
                }
                if (hooksFails.length) {
                    log(`{red-fg}    ${hooksFails.length} ${adone.util.pluralizeWord("hook", hooksFails.length)} failed{/}`);
                }
                if (todos) {
                    log(`{yellow-fg}    ${todos} todo{/}`);
                }
                if (cancelled.length) {
                    log(`{magenta-fg}    ${cancelled.length} cancelled{/}`);
                }
                if (globalErrors.length) {
                    log(`{#ff9500-fg}    ${globalErrors.length} error${globalErrors.length > 1 ? "s" : ""}{/}`);
                }
                log();
                log(`{grey-fg}    Total elapsed: ${totalElapsed}{/}`);
                log();
            }))
            .on("error", (err) => {
                globalErrors.push(err);
            });
    };
};

export const minimalReporter = () => {
    const term = adone.runtime.term;

    const { isTTY } = process.stdout;

    const { text: { unicode: { symbol } } } = adone;

    const ansiRegexp = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;
    const parse = (str) => {
        str = term.parse(str);
        if (!isTTY) {
            str = str.replace(ansiRegexp, "");
        }
        return str;
    };

    const log = (message = "", { newline = true } = {}) => {
        process.stdout.write(parse(message));
        if (newline) {
            process.stdout.write("\n");
        }
    };

    return (emitter) => {
        let pending = 0;
        let failed = 0;
        let passed = 0;
        let todos = 0;
        const errors = [];
        const globalErrors = [];

        console.log();

        const totalBar = adone.runtime.term.progress({
            schema: "    :spinner {green-fg}:passed{/green-fg} {red-fg}:failed{/red-fg} {cyan-fg}:pending{/cyan-fg} {yellow-fg}:todos{/yellow-fg} :elapsed"
        });

        const testsBar = adone.runtime.term.progress({
            schema: "    :path"
        });

        totalBar.tick(0, { passed, failed, pending, todos });

        testsBar.tick(0, { path: "" });

        const reportOnThrow = (f) => function (...args) {
            try {
                return f.apply(this, args);
            } catch (err) {
                emitter.emit("reporterError", err);
            }
        };

        const path = [];

        const updatePath = (escape) => {
            const p = path.join(` ${symbol.arrowRight}  `);
            testsBar.tick(0, {
                path: escape ? `{escape}${p}{/escape}` : p
            });
        };

        const colorizeHook = (type) => {
            return type
                .replace("before", "{#d9534f-fg}before{/}")
                .replace("after", "{#0275d8-fg}after{/}")
                .replace("each", "{#5cb85c-fg}each{/}");
        };

        const startHookHandler = (type) => {
            type = colorizeHook(type);
            return ({ hook }) => {
                path.push(`${type} hook${hook.description ? ` : {escape}${hook.description}{/escape}` : ""}`);
                updatePath();
            };
        };

        const endHookHandler = () => {
            return () => {
                path.pop();
                updatePath();
            };
        };
        emitter
            .on("start before hook", startHookHandler("before"))
            .on("start before each hook", startHookHandler("before each"))
            .on("start before test hook", startHookHandler("before test"))
            .on("start after hook", startHookHandler("after"))
            .on("start after each hook", startHookHandler("after each"))
            .on("start after test hook", startHookHandler("after test"))
            .on("end before hook", endHookHandler("before"))
            .on("end before each hook", endHookHandler("before each"))
            .on("end before test hook", endHookHandler("before test"))
            .on("end after hook", endHookHandler("after"))
            .on("end after each hook", endHookHandler("after each"))
            .on("end after test hook", endHookHandler("after test"));

        Error.stackTraceLimit = 100;

        emitter
            .on("enter block", reportOnThrow(({ block }) => {
                path.push(`{escape}${block.name}{/escape}`);
                updatePath();
            }))
            .on("exit block", () => {
                path.pop();
                updatePath();
            })
            .on("start test", reportOnThrow(({ test }) => {
                path.push(`{escape}${test.description}{/escape}`);
                updatePath();
            }))
            .on("end test", reportOnThrow(({ test, meta: { err, skipped } }) => {
                path.pop();
                updatePath();
                if (skipped) {
                    // shouldn't be handled here
                    return;
                }

                if (err) {
                    ++failed;
                    errors.push([test, err]);
                } else {
                    ++passed;
                }
                totalBar.tick(0, { passed, failed });
            }))
            .on("skip test", reportOnThrow(({ test }) => {
                test.isTodo()
                    ? ++todos
                    : ++pending;
                totalBar.tick(0, { pending, todos });
            }))
            .on("done", reportOnThrow(() => {
                totalBar.complete(failed === 0 && globalErrors.length === 0);
                testsBar.complete();

                if (errors.length) {
                    log();
                    for (const [idx, [failed, err]] of adone.util.enumerate(errors, 1)) {
                        // print block chain
                        const stack = new adone.collection.Stack();
                        let block = failed.block;
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) {escape}${[...stack].join(` ${symbol.arrowRight}  `)} ${symbol.arrowRight}  ${failed.description}{/escape}`);
                        log();

                        if (err.name && err.message) {
                            log(`{red-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{red-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (err.expected && err.actual) {
                            if (err.expected && err.actual) {
                                log();
                                log(adone.text.indent(shani.util.diff.getDiff(err.actual, err.expected), 2));
                            }
                        }
                        log();
                        if (adone.is.string(err.stack)) {
                            const stackMsg = filterShaniFrames(err.stack.split("\n")).slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                if (globalErrors.length) {
                    log();
                    log("Global errors:\n");
                    for (const [idx, err] of adone.util.enumerate(globalErrors, 1)) {
                        if (err.name && err.message) {
                            log(`{#ff9500-fg}${idx}) {escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{#ff9500-fg}${idx}) {escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                if (globalErrors.length) {
                    log(`{#ff9500-fg}    ${globalErrors.length} error${globalErrors.length > 1 ? "s" : ""}{/}`);
                }
            }))
            .on("error", (err) => {
                globalErrors.push(err);
            });
    };
};

export const simpleReporter = ({
    allTimings = false,
    showHooks = false
} = {}) => {
    const term = adone.runtime.term;
    const { text: { unicode: { symbol } } } = adone;

    const { isTTY } = process.stdout;
    const ansiRegexp = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;
    const parse = (str) => {
        str = term.parse(str);
        if (!isTTY) {
            str = str.replace(ansiRegexp, "");
        }
        return str;
    };

    const log = (message = "", { newline = true } = {}) => {
        process.stdout.write(parse(message));
        if (newline) {
            process.stdout.write("\n");
        }
    };

    return (emitter) => {
        let pending = 0;
        let failed = 0;
        let passed = 0;
        let todos = 0;
        const cancelled = [];
        const hooksFails = [];
        let testsElapsed = 0;
        let totalElapsed = hrtime();
        const errors = [];
        const globalErrors = [];

        const elapsedToString = (elapsed, timeout, little = true) => {
            let elapsedString = adone.util.humanizeTime(elapsed); // ms

            const k = elapsed / timeout;
            if (k < 0.25) {
                if (little) {
                    elapsedString = `{green-fg}${elapsedString}{/}`;
                } else {
                    elapsedString = "";
                }
            } else if (k < 0.75) {
                elapsedString = `{yellow-fg}${elapsedString}{/}`;
            } else {
                elapsedString = `{red-fg}${elapsedString}{/}`;
            }
            return elapsedString;
        };

        if (showHooks) {
            const colorizeHook = (type) => {
                return type
                    .replace("before", "{#d9534f-fg}before{/}")
                    .replace("after", "{#0275d8-fg}after{/}")
                    .replace("each", "{#5cb85c-fg}each{/}");
            };

            const endHookHandler = (type) => {
                type = colorizeHook(type);
                return ({ hook, block, test, meta }) => {
                    const padding = "    ".repeat(Math.max(block.level() + (test ? 1 : 0), 0));
                    let msg = `${padding} ${meta.err ? `{red-fg}${symbol.cross}` : `{green-fg}${symbol.tick}`}{/} ${type} hook{escape}${hook.description ? `: ${hook.description}` : ""}{/escape}`;
                    const elapsedString = elapsedToString(
                        meta.elapsed,
                        hook.timeout(),
                        allTimings
                    );
                    if (elapsedString) {
                        msg = `${msg} (${elapsedString})`;
                    }
                    log(msg);
                };
            };
            emitter
                .on("end before hook", endHookHandler("before"))
                .on("end before each hook", endHookHandler("before each"))
                .on("end before test hook", endHookHandler("before test"))
                .on("end after hook", endHookHandler("after"))
                .on("end after each hook", endHookHandler("after each"))
                .on("end after test hook", endHookHandler("after test"));
        }


        const endHookHandler = (type) => {
            return ({ hook, meta: { err }, block }) => {
                if (err) {
                    hooksFails.push([hook, err, type, block]);
                }
            };
        };

        emitter
            .on("end before hook", endHookHandler("before"))
            .on("end before each hook", endHookHandler("before each"))
            .on("end before test hook", endHookHandler("before test"))
            .on("end after hook", endHookHandler("after"))
            .on("end after each hook", endHookHandler("after each"))
            .on("end after test hook", endHookHandler("after test"));

        let enteredBlocks = [];
        let blockLevel = 0;
        let firstBlock = true;

        Error.stackTraceLimit = 100;

        emitter
            .on("enter block", ({ block }) => {
                if (firstBlock) {
                    log();
                    firstBlock = false;
                }
                if (enteredBlocks[blockLevel] !== block.name) {
                    enteredBlocks = enteredBlocks.slice(0, blockLevel);
                    enteredBlocks.push(block.name);
                    log(`${"    ".repeat(blockLevel)} {escape}${block.name}{/escape}`);
                }
                ++blockLevel;
            })
            .on("exit block", () => {
                --blockLevel;
            })
            .on("end test", ({ test, meta: { err, elapsed, skipped } }) => {
                if (skipped) {
                    // shouldn't be handled here
                    return;
                }
                const timeout = test.timeout();

                const elapsedString = elapsedToString(elapsed, timeout, allTimings);
                let msg;
                if (err) {
                    msg = `{red-fg}${symbol.cross} ${failed + 1}) {escape}${test.description}{/escape}{/}`;
                } else {
                    msg = `{green-fg}${symbol.tick} {grey-fg}{escape}${test.description}{/escape}{/}`;
                }
                if (elapsedString) {
                    msg = `${msg} (${elapsedString})`;
                }
                log(`${"    ".repeat(test.block.level() + 1)} ${msg} ${" ".repeat(10)}`);
                testsElapsed += elapsed;
                if (err) {
                    ++failed;
                    errors.push([test, err]);
                } else {
                    ++passed;
                }
            })
            .on("skip test", ({ test }) => {
                let msg;
                if (test.isTodo()) {
                    msg = `{yellow-fg}? {escape}${test.description}{/escape}{/}`;
                    ++todos;
                } else if (test.isCancelled()) {
                    msg = `{magenta-fg}# {escape}${test.description}{/escape}{/}`;
                    cancelled.push(test);
                } else {
                    msg = `{cyan-fg}\u2212 {escape}${test.description}{/escape}{/}`;
                    ++pending;
                }
                log(`${"    ".repeat(test.block.level() + 1)} ${msg}`);
            })
            .on("done", () => {
                if (errors.length) {
                    log();
                    log("Errors:\n");
                    for (const [idx, [failed, err]] of adone.util.enumerate(errors, 1)) {
                        // print block chain
                        const stack = new adone.collection.Stack();
                        let block = failed.block;
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) {escape}${[...stack].join(` ${symbol.arrowRight}  `)} : ${failed.description}{/escape}`);
                        log(`    at ${failed.meta.location.path}:${failed.meta.location.line}:${failed.meta.location.column}`);
                        log();

                        if (err.name && err.message) {
                            log(`{red-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{red-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (err.expected && err.actual) {
                            if (err.expected && err.actual) {
                                log();
                                log(adone.text.indent(shani.util.diff.getDiff(err.actual, err.expected), 2));
                            }
                        }
                        if (adone.is.string(err.stack)) {
                            const stackMsg = filterShaniFrames(err.stack.split("\n")).slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                if (hooksFails.length) {
                    log();
                    log("Hooks fails:\n");
                    for (let [idx, [hook, err, type, block]] of adone.util.enumerate(hooksFails, 1)) {
                        // print block chain
                        const stack = new adone.collection.Stack();
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) ${type} hook failed: {escape}${[...stack].join(` ${symbol.arrowRight}  `)} ${hook.description ? `: ${hook.description}` : ""}{/escape}`);
                        log(`    at ${hook.meta.location.path}:${hook.meta.location.line}:${hook.meta.location.column}`);
                        log();

                        if (err.name && err.message) {
                            log(`{red-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{red-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                    }
                }

                if (cancelled.length) {
                    log();
                    log("Cancel reasons:\n");
                    for (const [idx, test] of adone.util.enumerate(cancelled, 1)) {
                        const err = test.cancelReason;
                        const hook = err.hook;
                        const type = test.cancelType;
                        let block = test.block;
                        // print block chain
                        const stack = new adone.collection.Stack();
                        do {
                            stack.push(block.name);
                            block = block.parent;
                        } while (block && block.level() >= 0);
                        log(`${idx}) {escape}${[...stack].join(` ${symbol.arrowRight}  `)} : ${test.description}{/escape} was cancelled due to ${type} fail:`);
                        log(`    hook at ${hook.meta.location.path}:${hook.meta.location.line}:${hook.meta.location.column}`);
                        log(`    test at ${test.meta.location.path}:${test.meta.location.line}:${test.meta.location.column}`);
                        log();

                        if (err.name && err.message) {
                            log(`{magenta-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{magenta-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                if (globalErrors.length) {
                    log();
                    log("Global errors:\n");
                    for (const [idx, err] of adone.util.enumerate(globalErrors, 1)) {
                        if (err.name && err.message) {
                            log(`{#ff9500-fg}${idx}) {escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{#ff9500-fg}${idx}) {escape}${err}{/escape}{/}`);
                        }

                        if (adone.is.string(err.stack)) {
                            const stackMsg = err.stack.split("\n").slice(1).map((x) => `    ${x.trim()}`).join("\n");
                            log(`{grey-fg}{escape}${stackMsg}{/escape}{/}`);
                        }
                        log();
                    }
                }

                log();
                totalElapsed = hrtime(totalElapsed);
                testsElapsed = adone.util.humanizeTime(testsElapsed);
                totalElapsed = adone.util.humanizeTime(
                    totalElapsed[0] * 1e3 + totalElapsed[1] / 1e6
                );
                log(`    {green-fg}${passed} passed{/} {grey-fg}(${testsElapsed}){/}`);
                if (pending) {
                    log(`{cyan-fg}    ${pending} skipped{/}`);
                }
                if (failed) {
                    log(`{red-fg}    ${failed} failed{/}`);
                }
                if (hooksFails.length) {
                    log(`{red-fg}    ${hooksFails.length} ${adone.util.pluralizeWord("hook", hooksFails.length)} failed{/}`);
                }
                if (todos) {
                    log(`{yellow-fg}    ${todos} todo{/}`);
                }
                if (cancelled.length) {
                    log(`{magenta-fg}    ${cancelled.length} cancelled{/}`);
                }
                if (globalErrors.length) {
                    log(`{#ff9500-fg}    ${globalErrors.length} error${globalErrors.length > 1 ? "s" : ""}{/}`);
                }
                log();
                log(`{grey-fg}    Total elapsed: ${totalElapsed}{/}`);
                log();
            })
            .on("error", (err) => {
                globalErrors.push(err);
            });
    };
};
