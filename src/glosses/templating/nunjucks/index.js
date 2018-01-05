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
}, adone.asNamespace(exports), require);

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

    environment = new nunjucks.Environment(TemplateLoader, opts);

    if (opts && opts.express) {
        environment.express(opts.express);
    }

    return environment;
};

export const compile = (src, env, path, eagerCompile) => {
    if (is.null(environment)) {
        configure();
    }
    return new nunjucks.Template(src, env, path, eagerCompile);
};

export const renderSync = (name, ctx) => {
    if (is.null(environment)) {
        configure();
    }
    return environment.render(name, ctx);
};

export const render = async (name, ctx) => {
    if (is.null(environment)) {
        configure();
    }

    return new Promise((resolve, reject) => {
        environment.render(name, ctx, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

export const renderStringSync = (src, ctx) => {
    if (!environment) {
        configure();
    }

    return environment.renderString(src, ctx);
};

export const renderString = async (src, ctx) => {
    if (!environment) {
        configure();
    }

    return new Promise((resolve, reject) => {
        environment.renderString(src, ctx, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};
