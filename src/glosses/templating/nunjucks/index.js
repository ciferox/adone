import adone from "adone";
const { is } = adone;

const nunjucks = adone.lazify({
    Environment: ["./environment", (x) => x.Environment],
    Template: ["./environment", (x) => x.Template],
    Loader: ["./loaders", (x) => x.Loader],
    FileSystemLoader: ["./loaders", (x) => x.FileSystemLoader],
    PrecompiledLoader: ["./loaders", (x) => x.PrecompiledLoader],
    compiler: "./compiler",
    parser: "./parser",
    lexer: "./lexer",
    runtime: "./runtime",
    x: "./x",
    nodes: "./nodes",
    installJinjaCompat: "./jinja_compat"
}, exports, require);

// A single instance of an environment, since this is so commonly used
let environment = null;

export const configure = (templatesPath, opts) => {
    opts = opts || {};
    if (is.object(templatesPath)) {
        [templatesPath, opts] = [null, templatesPath];
    }

    const TemplateLoader = new nunjucks.FileSystemLoader(templatesPath, {
        watch: opts.watch,
        noCache: opts.noCache
    });

    environment = new nunjucks.env.Environment(TemplateLoader, opts);

    if (opts && opts.express) {
        environment.express(opts.express);
    }

    return environment;
};

export const compile = (src, env, path, eagerCompile) => {
    if (is.null(environment)) {
        configure();
    }
    return new module.exports.Template(src, env, path, eagerCompile);
};

export const render = (name, ctx, cb) => {
    if (is.null(environment)) {
        configure();
    }

    return environment.render(name, ctx, cb);
};

export const renderString = (src, ctx, cb) => {
    if (!environment) {
        configure();
    }

    return environment.renderString(src, ctx, cb);
};
