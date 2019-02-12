import { prettifyError } from "./x";
import * as compiler from "./compiler";
import builtinFilters from "./filters";
import { FileSystemLoader } from "./loaders";
import * as runtime from "./runtime";
import globals from "./globals";
import builtinTests from "./tests";
const { std: { path, vm }, is, util, error } = adone;
const { Frame } = runtime;

class Context {
    constructor(ctx, blocks, env) {
        this.env = env || new Environment(); // eslint-disable-line no-use-before-define

        this.ctx = util.clone(ctx, { deep: false });

        this.blocks = {};
        this.exported = [];

        for (const name in blocks) {
            this.addBlock(name, blocks[name]);
        }
    }

    lookup(name) {
        if (is.propertyOwned(this.env.globals, name) && !is.propertyOwned(this.ctx, name)) {
            return this.env.globals[name];
        }
        return this.ctx[name];
    }

    setVariable(name, val) {
        this.ctx[name] = val;
    }

    getVariables() {
        return this.ctx;
    }

    addBlock(name, block) {
        this.blocks[name] = this.blocks[name] || [];
        this.blocks[name].push(block);
        return this;
    }

    getBlock(name) {
        if (!this.blocks[name]) {
            throw new error.UnknownException(`unknown block "${name}"`);
        }

        return this.blocks[name][0];
    }

    getSuper(env, name, block, frame, runtime, cb) {
        const idx = this.blocks[name] ? this.blocks[name].indexOf(block) : -1;
        const blk = this.blocks[name][idx + 1];
        const context = this;

        if (idx === -1 || !blk) {
            throw new error.IllegalStateException(`no super block available for "${name}"`);
        }

        blk(env, context, frame, runtime, cb);
    }

    addExport(name) {
        this.exported.push(name);
    }

    getExported() {
        const exported = {};
        for (let i = 0; i < this.exported.length; i++) {
            const name = this.exported[i];
            exported[name] = this.ctx[name];
        }
        return exported;
    }
}

export class Template {
    constructor(src, env, path, eagerCompile) {
        this.env = env || new Environment(); // eslint-disable-line no-use-before-define

        if (is.object(src)) {
            switch (src.type) {
                case "code": {
                    this.tmplProps = src.obj;
                    break;
                }
                case "string": {
                    this.tmplStr = src.obj;
                    break;
                }
            }
        } else if (is.string(src)) {
            this.tmplStr = src;
        } else {
            throw new error.InvalidArgumentException("src must be a string or an object describing the source");
        }

        this.path = path;

        if (eagerCompile) {
            try {
                this._compile();
            } catch (err) {
                throw prettifyError(this.path, this.env.opts.dev, err); // remove?
            }
        } else {
            this.compiled = false;
        }
    }

    render(ctx, parentFrame, cb) {
        if (is.function(ctx)) {
            [ctx, cb] = [{}, ctx];
            cb = ctx;
        } else if (is.function(parentFrame)) {
            [parentFrame, cb] = [null, parentFrame];
        }

        let forceAsync = true;
        if (parentFrame) {
            // If there is a frame, we are being called from internal code of another template,
            // and the internal system depends on the sync/async nature of the parent template
            // to be inherited, so force an async callback
            forceAsync = false;
        }

        try {
            this.compile();
        } catch (_err) {
            const err = prettifyError(this.path, this.env.opts.dev, _err); // remove?
            if (cb) {
                process.nextTick(cb, err);
                return;
            }
            throw err;

        }

        const context = new Context(ctx || {}, this.blocks, this.env);
        const frame = parentFrame ? parentFrame.push(true) : new Frame();
        frame.topLevel = true;
        let syncResult = null;

        this.rootRenderFunc(
            this.env,
            context,
            frame || new Frame(),
            runtime,
            (err, res) => {
                if (err) {
                    err = prettifyError(this.path, this.env.opts.dev, err); // remove?
                }

                if (cb) {
                    if (forceAsync) {
                        process.nextTick(cb, err, res);
                    } else {
                        cb(err, res);
                    }
                } else {
                    if (err) {
                        throw err;
                    }
                    syncResult = res;
                }
            }
        );

        return syncResult;
    }


    getExported(ctx, parentFrame, cb) {
        if (is.function(ctx)) {
            [ctx, cb] = [{}, ctx];
        }

        if (is.function(parentFrame)) {
            [parentFrame, cb] = [null, parentFrame];
        }

        // Catch compile errors for async rendering
        try {
            this.compile();
        } catch (e) {
            if (cb) {
                return cb(e);
            }
            throw e;

        }

        const frame = parentFrame ? parentFrame.push() : new Frame();
        frame.topLevel = true;

        // Run the rootRenderFunc to populate the context with exported vars
        const context = new Context(ctx || {}, this.blocks, this.env);
        this.rootRenderFunc(this.env,
            context,
            frame,
            runtime,
            (err) => {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, context.getExported());
                }
            });
    }

    compile() {
        if (!this.compiled) {
            this._compile();
        }
    }

    _compile() {
        let props;

        if (this.tmplProps) {
            props = this.tmplProps;
        } else {
            const source = compiler.compile(
                this.tmplStr,
                this.env.asyncFilters,
                this.env.extensionsList,
                this.path,
                this.env.opts
            );

            const func = vm.runInThisContext(source);
            props = func();
        }

        this.blocks = this._getBlocks(props);
        this.rootRenderFunc = props.root;
        this.compiled = true;
    }

    _getBlocks(props) {
        const blocks = {};

        for (const k in props) {
            if (k.startsWith("b_")) {
                blocks[k.slice(2)] = props[k];
            }
        }

        return blocks;
    }
}

export class Environment {
    constructor(loaders, opts = {}) {
        this.opts = opts;
        this.opts.dev = Boolean(opts.dev);

        this.opts.autoescape = !is.nil(opts.autoescape) ? opts.autoescape : true;

        this.opts.throwOnUndefined = Boolean(opts.throwOnUndefined);
        this.opts.trimBlocks = Boolean(opts.trimBlocks);
        this.opts.lstripBlocks = Boolean(opts.lstripBlocks);

        this.loaders = [];

        if (!loaders) {
            // The filesystem loader is only available server-side
            this.loaders = [new FileSystemLoader("views")];
        } else {
            this.loaders = is.array(loaders) ? loaders : [loaders];
        }

        this.initCache();

        this.globals = globals();
        this.filters = {};
        this.tests = {};
        this.asyncFilters = [];
        this.extensions = {};
        this.extensionsList = [];

        for (const name in builtinFilters) {
            this.addFilter(name, builtinFilters[name]);
        }
        for (const test in builtinTests) {
            this.addTest(test, builtinTests[test]);
        }
    }

    initCache() {
        // Caching and cache busting
        const { loaders } = this;
        for (let i = 0; i < loaders.length; ++i) {
            const loader = loaders[i];
            loader.cache = {};

            if (is.function(loader.on)) {
                loader.on("update", (template) => {
                    loader.cache[template] = null;
                });
            }
        }
    }

    addExtension(name, extension) {
        extension._name = name;
        this.extensions[name] = extension;
        this.extensionsList.push(extension);
        return this;
    }

    removeExtension(name) {
        const extension = this.getExtension(name);
        if (!extension) {
            return;
        }

        const i = this.extensionsList.indexOf(extension);
        if (i === -1) {
            return;
        }
        this.extensionsList = this.extensionsList.filter((_, j) => j !== i);
        delete this.extensions[name];
    }

    getExtension(name) {
        return this.extensions[name];
    }

    hasExtension(name) {
        return Boolean(this.extensions[name]);
    }

    addGlobal(name, value) {
        this.globals[name] = value;
        return this;
    }

    getGlobal(name) {
        if (is.undefined(this.globals[name])) {
            throw new error.IllegalStateException(`global not found: ${name}`);
        }
        return this.globals[name];
    }

    addFilter(name, func, async) {
        const wrapped = func;

        if (async) {
            this.asyncFilters.push(name);
        }
        this.filters[name] = wrapped;
        return this;
    }

    getFilter(name) {
        if (!this.filters[name]) {
            throw new error.UnknownException(`filter not found: ${name}`);
        }
        return this.filters[name];
    }

    addTest(name, func) {
        this.tests[name] = func;
        return this;
    }

    getTest(name) {
        if (!this.tests[name]) {
            throw new Error(`test not found: ${name}`);
        }
        return this.tests[name];
    }

    resolveTemplate(loader, parentName, filename) {
        const isRelative = (loader.isRelative && parentName) ? loader.isRelative(filename) : false;
        return (isRelative && loader.resolve) ? loader.resolve(parentName, filename) : filename;
    }

    getTemplate(name, eagerCompile, parentName, ignoreMissing, cb) {
        const that = this;
        let tmpl = null;
        if (name && name.raw) {
            // this fixes autoescape for templates referenced in symbols
            name = name.raw;
        }

        if (is.function(parentName)) {
            cb = parentName;
            parentName = null;
            eagerCompile = eagerCompile || false;
        }

        if (is.function(eagerCompile)) {
            cb = eagerCompile;
            eagerCompile = false;
        }

        if (name instanceof Template) {
            tmpl = name;
        } else if (!is.string(name)) {
            throw new error.InvalidArgumentException(`template names must be a string: ${name}`);
        } else {
            const { loaders } = this;
            for (let i = 0; i < loaders.length; i++) {
                const loader = loaders[i];
                const _name = this.resolveTemplate(loader, parentName, name);
                tmpl = loader.cache[_name];
                if (tmpl) {
                    break;
                }
            }
        }

        if (tmpl) {
            if (eagerCompile) {
                tmpl.compile();
            }

            if (cb) {
                cb(null, tmpl);
            } else {
                return tmpl;
            }
        } else {
            // TODO PROMISES

            let syncResult;

            const createTemplate = (err, info) => {
                if (!info && !err) {
                    if (!ignoreMissing) {
                        err = new Error(`template not found: ${name}`);
                    }
                }

                if (err) {
                    if (cb) {
                        cb(err);
                    } else {
                        throw err;
                    }
                } else {
                    let tmpl;
                    if (info) {
                        tmpl = new Template(info.src, this, info.path, eagerCompile);

                        if (!info.noCache) {
                            info.loader.cache[name] = tmpl;
                        }
                    } else {
                        tmpl = new Template("", this, "", eagerCompile);
                    }

                    if (cb) {
                        cb(null, tmpl);
                    } else {
                        syncResult = tmpl;
                    }
                }
            };

            util.asyncIter(this.loaders, (loader, i, next, done) => {
                const handle = (err, src) => {
                    if (err) {
                        done(err);
                    } else if (src) {
                        src.loader = loader;
                        done(null, src);
                    } else {
                        next();
                    }
                };

                // Resolve name relative to parentName
                name = that.resolveTemplate(loader, parentName, name);

                if (loader.async) {
                    loader.getSource(name, handle);
                } else {
                    handle(null, loader.getSource(name));
                }
            }, createTemplate);

            return syncResult;
        }
    }

    express(app) {
        const env = this;

        class NunjucksView {
            constructor(name, opts) {
                this.name = name;
                this.path = name;
                this.defaultEngine = opts.defaultEngine;
                this.ext = path.extname(name);
                if (!this.ext && !this.defaultEngine) {
                    throw new error.IllegalStateException("No default engine was specified and no extension was provided.");
                }
                if (!this.ext) {
                    this.name += (this.ext = (this.defaultEngine[0] !== "." ? "." : "") + this.defaultEngine);
                }
            }

            render(opts, cb) {
                env.render(this.name, opts, cb);
            }
        }

        app.set("view", NunjucksView);
        app.set("nunjucksEnv", this);
        return this;
    }

    render(name, ctx, cb) {
        if (is.function(ctx)) {
            [ctx, cb] = [null, ctx];
        }
        // TODO remove sync

        // We support a synchronous API to make it easier to migrate
        // existing code to async. This works because if you don't do
        // anything async work, the whole thing is actually run
        // synchronously.
        let syncResult = null;

        this.getTemplate(name, (err, tmpl) => {
            if (err && cb) {
                process.nextTick(cb, err);
            } else if (err) {
                throw err;
            } else {
                syncResult = tmpl.render(ctx, cb);
            }
        });

        return syncResult;
    }

    renderString(src, ctx, opts, cb) {
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }
        opts = opts || {};

        const tmpl = new Template(src, this, opts.path);
        return tmpl.render(ctx, cb);
    }
}

Environment.prototype.waterfall = util.asyncWaterfall;
