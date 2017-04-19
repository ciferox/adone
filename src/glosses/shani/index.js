const { is, x, lazify } = adone;

export const util = lazify({
    request: "./request",
    mock: "./mock",
    FS: "./fs"
}, null, require);

const SET_TIMEOUT_MAX = 2 ** 31 - 1;

class Hook {
    constructor(description, callback) {
        this.description = description;
        this.callback = callback;
        this._timeout = 5000;  // global hook timeout
        this._fired = false;
        this._failed = null;
    }

    fired() {
        return this._fired === true;
    }

    failed() {
        return this._failed !== null;
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
        return this._timeout;
    }

    async run() {
        this._fired = true;
        let err = null;
        let s = process.hrtime();
        let uncaught;
        try {
            let p = new Promise((resolve, reject) => {
                uncaught = reject;
                process.once("uncaughtException", uncaught);
                if (this.callback.length) {
                    this.callback((err) => {
                        err ? reject(err) : resolve();
                    });
                } else {
                    Promise.resolve(this.callback()).then(resolve, reject);
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
            process.removeListener("uncaughtException", uncaught);
            s = process.hrtime(s);
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

class Block {
    constructor(name, parent = null) {
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
        this._skip = false;
        this._only = false;
        this._watch = false;
        this._retries = null;
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
        return this;
    }

    only() {
        this._only = true;
        return this;
    }

    timeout(ms = adone.null) {
        if (ms !== adone.null) {
            if (is.number(ms) && ms > SET_TIMEOUT_MAX) {
                ms = SET_TIMEOUT_MAX;
            }
            this._timeout = ms;
        }
        if (this._timeout !== adone.null) {
            return this._timeout;
        }
        if (this.parent) {
            return this.parent.timeout();
        }
        return null;
    }

    retries(n) {
        if (n) {
            this._retries = n;
        }
        if (this._retries) {
            return this._retries;
        }
        if (this.parent) {
            return this.parent.retries();
        }
        return null;
    }

    level(level) {
        if (level !== undefined) {
            this._level = level;
        } else if (this._level === null) {
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

class Test {
    constructor(description, callback, block) {
        this.description = description;
        this.callback = callback;
        this.block = block;
        this._skip = false;
        this._only = false;
        this._timeout = adone.null;
        this._beforeHooks = [];
        this._afterHooks = [];
        this._beforeHooksFired = false;
        this._afterHooksFired = false;
    }

    async run() {
        let err = null;
        let s = process.hrtime();
        let uncaught;
        try {
            let p = new Promise((resolve, reject) => {
                uncaught = reject;
                process.once("uncaughtException", uncaught);
                if (this.callback.length) {
                    this.callback((err) => {
                        err ? reject(err) : resolve();
                    });
                } else {
                    Promise.resolve(this.callback()).then(resolve, reject);
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
            process.removeListener("uncaughtException", uncaught);
            s = process.hrtime(s);
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

    skip() {
        this._skip = true;
        return this;
    }

    only() {
        this._only = true;
        return this;
    }

    timeout(ms = adone.null) {
        if (ms !== adone.null) {
            if (is.number(ms) && ms > SET_TIMEOUT_MAX) {
                ms = SET_TIMEOUT_MAX;
            }
            this._timeout = ms;
        }

        if (this._timeout !== adone.null) {
            return this._timeout;
        }

        return this.block.timeout();
    }

    retries(n) {
        if (n) {
            this._retries = n;
        }
        return this._retries || this.block.retries();
    }

    chain() {
        return `${this.block.chain()} : ${this.description}`;
    }

    before(description, callback) {
        if (adone.is.function(description)) {
            [description, callback] = ["", description];
        }
        this._beforeHooks.push(new Hook(description, callback));
        return this;
    }

    after(description, callback) {
        if (adone.is.function(description)) {
            [description, callback] = ["", description];
        }
        this._afterHooks.push(new Hook(description, callback));
        return this;
    }

    test(callback) {
        this.callback = callback;
        return this;
    }

    *beforeHooks() {
        yield* this._beforeHooks;
    }

    *afterHooks() {
        yield* this._afterHooks;
    }
}

export class Engine {
    constructor({
        defaultTimeout = 5000,
        firstFailExit = false,
        transpilerOptions = {},
        watch = false
    } = {}) {
        this._paths = [];  // path can be a glob or a path
        this.defaultTimeout = defaultTimeout;
        this.firstFailExit = firstFailExit;
        this.transpilerOptions = transpilerOptions;
        this.watch = watch;
    }

    include(...paths) {
        this._paths.push(...paths);
    }

    exclude(...paths) {
        this._paths.push(...paths.map((x) => `!${x}`));
    }

    context() {
        const root = new Block(null);
        root.level(-1);  // take care of the nested blocks
        root.timeout(this.defaultTimeout);
        root.retries(1);
        const stack = new adone.collection.Stack([root]);

        const describe = function (...args) {
            const callback = args.pop();
            if (!is.function(callback)) {
                throw new x.InvalidArgument("The last argument must be a function");
            }
            if (args.length === 0) {
                throw new x.InvalidArgument("A describe must have a name");
            }
            let block;
            for (const name of args) {
                block = new Block(name, stack.top);
                stack.top.addChild(block);
                stack.push(block);
            }

            if (adone.is.promise(callback.call(block))) {
                throw new Error("It is not allowed to use asynchronous functions as a describe callback");
            }
            for (let i = 0; i < args.length; ++i) {
                stack.pop();
            }
            return block;
        };

        describe.skip = (...args) => describe(...args).skip();
        describe.only = (...args) => describe(...args).only();

        const it = function (description, callback) {
            const test = new Test(description, callback, stack.top);
            stack.top.addChild(test);
            return test;
        };

        it.skip = (...args) => it(...args).skip();
        it.only = (...args) => it(...args).only();

        const before = function (description, callback) {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            stack.top.hooks.before.push(new Hook(description, callback));
        };

        const after = function (description, callback) {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            stack.top.hooks.after.push(new Hook(description, callback));
        };

        const beforeEach = function (description, callback) {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            stack.top.hooks.beforeEach.push(new Hook(description, callback));
        };

        const afterEach = function (description, callback) {
            if (adone.is.function(description)) {
                [description, callback] = ["", description];
            }
            stack.top.hooks.afterEach.push(new Hook(description, callback));
        };

        const skip = function (callback) {
            skip.promise = new Promise((resolve) => resolve(callback())).then((skipped) => {
                if (skipped) {
                    root.skip();
                }
            });
        };
        skip.promise = Promise.resolve();

        const start = function () {
            const emitter = new adone.EventEmitter();

            // mark all the skipped nodes
            (function markSkipped(block) {
                const exclusive = block.isExclusive();
                for (const node of block.children) {
                    if (exclusive && !node.isExclusive()) {
                        node.skip();
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
                            if (n.isExclusive()) {
                                continue;
                            }
                            n.only();
                            if (n instanceof Block) {
                                mark(n);
                            }
                        }
                    })(block);
                    return true;
                }
                let hasInclusive = false;
                for (const node of block.children) {
                    if (node.isExclusive()) {
                        // exclusive nodes dont have to be marked
                        continue;
                    }
                    const isBlock = node instanceof Block;

                    if (node.isInclusive()) {
                        hasInclusive = true;
                        // the node is an inclusive node, mark the parent
                        block.only();
                        if (isBlock) {
                            // is a block, should check the nested nodes,
                            checkInclusive(node);
                        }
                    } else if (isBlock) {
                        // is a block, but a non-inclusive, maybe it has some nested inclusive nodes
                        if (checkInclusive(node)) {
                            hasInclusive = true;
                            // it has, mark the parent
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

            let stopped = false;

            emitter.stop = () => {
                stopped = true;
            };

            Promise.resolve().then(async () => {
                const executor = async (block) => {
                    if (block !== root) {
                        emitter.emit("enter block", { block });
                    }
                    let failed = false;
                    let hookFailed = false;
                    if (block.children.every((x) => x.isExclusive())) {
                        for (const node of block.children) {
                            if (node instanceof Block) {
                                executor(node);  // should skip all nested the tests
                            } else {
                                emitter.emit("skip test", { block, test: node });
                            }
                        }
                    } else {
                        // at least 1 test will be executed (if no hook fails)
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
                                    hookFailed = true;
                                    break;
                                }
                            }
                            if (hookFailed) {
                                break;
                            }
                        }
                        if (!hookFailed) {  // before hook failed?
                            for (const node of block.children) {
                                if (stopped || hookFailed) {
                                    break;
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
                                    hookFailed = meta.hookFailed;
                                } else {
                                    const blocksFired = [];
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
            }).catch((err) => {
                emitter.emit("error", err);
                return true;
            }).then(() => emitter.emit("done"));

            return emitter;
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
            root,
            skip
        };
    }

    start() {
        let executing = null;
        const executingDone = () => new Promise((resolve) => {
            executing.once("done", resolve);
        });

        let stopped = false;
        const emitter = new adone.EventEmitter();
        emitter.stop = () => {
            stopped = true;
            executing && executing.stop();
        };
        const main = async (paths) => {
            const contentCache = new Map();
            const transpiledCache = new Map();
            const loader = (module, filename) => {
                if (!contentCache.has(filename)) {
                    contentCache.set(filename, adone.util.stripBom(adone.std.fs.readFileSync(filename, "utf-8")));
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

            for (const path of await adone.fs.glob(paths)) {
                if (stopped) {
                    break;
                }
                const context = this.context();
                const topass = [
                    "describe", "context",
                    "it", "specify",
                    "before", "after",
                    "beforeEach", "afterEach",
                    "skip"
                ];


                const m = new adone.js.Module(path, {
                    transform,
                    loaders: { ".js": loader }
                });

                global.$ = {};
                adone.lazify({
                    expect: () => adone.expect,
                    assert: () => adone.assert,
                    spy: () => util.mock.spy,
                    stub: () => util.mock.stub,
                    mock: () => util.mock.mock,
                    match: () => util.mock.match,
                    request: () => util.request,
                    FS: () => util.FS
                }, global.$, m.require.bind(m), { configurable: true });

                adone.lazify({
                    expect: () => global.$.expect,
                    assert: () => global.$.assert,
                    spy: () => global.$.spy,
                    stub: () => global.$.stub,
                    mock: () => global.$.mock,
                    match: () => global.$.match,
                    request: () => global.$.request,
                    FS: () => global.$.FS
                }, global, null, { configurable: true });

                for (const name of topass) {
                    global[name] = context[name];
                    global.$[name] = context[name];
                }

                try {
                    m.loadItself();
                    // eslint-disable-next-line no-await-in-loop
                    await context.skip.promise;
                    executing = context.start();
                    const events = [
                        "enter block", "exit block",
                        "start test", "end test", "skip test",
                        "start before hook", "end before hook",
                        "start after hook", "end after hook",
                        "start before each hook", "end before each hook",
                        "start after each hook", "end after each hook"
                    ];
                    for (const e of events) {
                        executing.on(e, (...data) => {
                            emitter.emit(e, ...data);
                        });
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await executingDone();
                } catch (err) {
                    err.message = `Error while loading this file: ${path}\n${err.message}`;
                    emitter.emit("error", err);
                } finally {
                    m.cache.delete(path);
                }
            }
        };

        Promise.resolve().then(() => main(this._paths)).catch((err) => {
            emitter.emit("error", err);
        }).then(() => {
            emitter.emit("done");
        });

        return emitter;
    }
}

export const consoleReporter = ({
    allTimings = false,
    timers = false,
    showHooks = false,
    keepHooks = false,
    ticks = true
} = {}) => {
    const term = adone.terminal;

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

    if (!isTTY) {
        ticks = false;
    }

    return (emitter) => {
        let pending = 0;
        let failed = 0;
        let passed = 0;
        let testsElapsed = 0;
        let totalElapsed = process.hrtime();
        const errors = [];
        const globalErrors = [];
        let timer = null;

        const elapsedToString = (elapsed, timeout, little = true) => {
            let elapsedString = adone.util.humanizeTime(elapsed);  // ms

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
                    if (ticks) {
                        const padding = "    ".repeat(Math.max(block.level() + (test ? 1 : 0), 0));
                        log(`${padding} \u2026 executing ${type} hook{escape}${hook.description ? ` ${hook.description}` : ""}{/escape}`);
                        const start = new Date();
                        if (timers) {
                            timer = setInterval(() => {
                                if (ticks) {
                                    log("\x1b[F\x1b[K", { newline: false });
                                }
                                log(`${padding} \u2026 executing ${type} hook{escape}${hook.description ? ` ${hook.description}` : ""}{/escape} (${elapsedToString(new Date() - start, hook.timeout(), true)})`);
                            }, 50);
                        }
                    }
                };
            };

            const endHookHandler = (type) => {
                type = colorizeHook(type);
                return ({ hook, block, test, meta }) => {
                    if (ticks && timers) {
                        clearInterval(timer);
                    }
                    if (keepHooks) {
                        const padding = "    ".repeat(Math.max(block.level() + (test ? 1 : 0), 0));
                        let msg = `${ticks ? "\x1b[F\x1b[K" : ""}${padding} ${meta.err ? "{red-fg}\u2717" : "{green-fg}\u2713"}{/} ${type} hook{escape}${hook.description ? `: ${hook.description}` : ""}{/escape}`;
                        const elapsedString = elapsedToString(
                            meta.elapsed,
                            hook.timeout(),
                            allTimings
                        );
                        if (elapsedString) {
                            msg = `${msg} (${elapsedString})`;
                        }
                        log(msg);
                    } else if (ticks) {
                        log("\x1b[F\x1b[K\x1b[F");
                    }
                };
            };
            emitter
                .on("start before hook", startHookHandler("before"))
                .on("start before each hook", startHookHandler("before each"))
                .on("start after hook", startHookHandler("after"))
                .on("start after each hook", startHookHandler("after each"))
                .on("end before hook", endHookHandler("before"))
                .on("end before each hook", endHookHandler("before each"))
                .on("end after hook", endHookHandler("after"))
                .on("end after each hook", endHookHandler("after each"));
        }

        let enteredBlocks = [];
        let blockLevel = 0;
        emitter
            .on("enter block", ({ block }) => {
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
            .on("start test", ({ test }) => {
                if (ticks) {
                    log(`${"    ".repeat(test.block.level() + 1)} \u2026 {grey-fg}{escape}${test.description}{/escape}{/}`);
                    if (timers) {
                        const start = new Date();
                        timer = setInterval(() => {
                            log(`\x1b[F\x1b[K${"    ".repeat(test.block.level() + 1)} \u2026 {grey-fg}{escape}${test.description}{/escape}{/} (${elapsedToString(new Date() - start, test.timeout())})`);
                        }, 50);
                    }
                }
            })
            .on("end test", ({ test, meta: { err, elapsed, skipped } }) => {
                if (ticks && timers) {
                    clearInterval(timer);
                }
                if (skipped) {
                    // shouldn't be handled here
                    return;
                }
                const timeout = test.timeout();

                const elapsedString = elapsedToString(elapsed, timeout, allTimings);
                let msg;
                if (err) {
                    msg = `{red-fg}\u2717 ${failed + 1}) {escape}${test.description}{/escape}{/}`;
                } else {
                    msg = `{green-fg}\u2713 {grey-fg}{escape}${test.description}{/escape}{/}`;
                }
                if (elapsedString) {
                    msg = `${msg} (${elapsedString})`;
                }
                if (ticks) {
                    log("\x1b[F\x1b[K", { newline: false });
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
            .on("skip test", ({ test, runtime }) => {
                const msg = `{cyan-fg}\u2212 {escape}${test.description}{/escape}{/}`;
                log(`${(runtime && ticks) ? "\x1b[F\x1b[K" : ""}${"    ".repeat(test.block.level() + 1)} ${msg}`);
                ++pending;
            })
            .on("done", () => {
                const printColorDiff = (diff) => {
                    log("{red-fg}- actual{/red-fg} {green-fg}+ expected{/green-fg}\n");
                    let msg = "";
                    for (let i = 0; i < diff.length; i++) {
                        let value = adone.text.splitLines(diff[i].value);

                        if (value[value.length - 1]) {
                            if (i < diff.length - 1) {
                                value[value.length - 1] += "\n";
                            }
                        } else {
                            value = value.slice(0, -1);
                        }

                        if (diff[i].added) {
                            msg += `{green-fg}{escape}+${value.join("+")}{/escape}{/green-fg}`;
                        } else if (diff[i].removed) {
                            msg += `{red-fg}{escape}-${value.join("-")}{/escape}{/red-fg}`;
                        } else {
                            msg += `{escape} ${value.join(" ")}{/escape}`;
                        }
                    }

                    log(msg);
                };

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
                        log(`${idx}) {escape}${[...stack].join(" \u279c ")} : ${failed.description}{/escape}`);
                        log();

                        if (err.name && err.message) {
                            log(`{red-fg}{escape}${err.name}: ${err.message}{/escape}{/}`);
                        } else {
                            log(`{red-fg}{escape}${err}{/escape}{/}`);
                        }

                        if (err.expected && err.actual) {
                            if (
                                adone.is.string(err.expected) &&
                                adone.is.string(err.actual) &&
                                (
                                    adone.text.splitLines(err.expected).length > 1 ||
                                    adone.text.splitLines(err.actual).length > 1
                                )
                            ) {
                                printColorDiff(adone.util.diff.lines(err.actual, err.expected));
                            } else if (adone.is.sameType(err.expected, err.actual)) {
                                printColorDiff(adone.util.diff.objects(err.actual, err.expected));
                            }
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
                totalElapsed = process.hrtime(totalElapsed);
                testsElapsed = adone.util.humanizeTime(testsElapsed);
                totalElapsed = adone.util.humanizeTime(
                    totalElapsed[0] * 1e3 + totalElapsed[1] / 1e6
                );
                log(`    {green-fg}${passed} passing{/} {grey-fg}(${testsElapsed}){/}`);
                if (pending) {
                    log(`{cyan-fg}    ${pending} pending{/}`);
                }
                if (failed) {
                    log(`{red-fg}    ${failed} failing{/}`);
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
