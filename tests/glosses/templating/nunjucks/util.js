const { std: { path }, templating: { nunjucks: { Environment, Template, FileSystemLoader: Loader } } } = adone;

const templatesPath = path.resolve(__dirname, "templates");

let numAsyncs;
let doneHandler;

beforeEach(() => {
    numAsyncs = 0;
    doneHandler = null;
});

function equal(str, ctx, str2, env) {
    if (typeof ctx === "string") {
        env = str2;
        str2 = ctx;
        ctx = null;
    }

    const res = render(str, ctx, {}, env);
    expect(res).to.be.equal(str2);
}

function finish(done) {
    if (numAsyncs > 0) {
        doneHandler = done;
    } else {
        done();
    }
}

function normEOL(str) {
    if (!str) {
        return str;
    }
    return str.replace(/\r\n|\r/g, "\n");
}

function render(str, ctx, opts, env, cb) {
    if (typeof ctx === "function") {
        cb = ctx;
        ctx = null;
        opts = null;
        env = null;
    } else if (typeof opts === "function") {
        cb = opts;
        opts = null;
        env = null;
    } else if (typeof env === "function") {
        cb = env;
        env = null;
    }

    opts = opts || {};
    opts.dev = true;
    const e = env || new Environment(new Loader(templatesPath), opts);

    let name;
    if (opts.filters) {
        for (name in opts.filters) {
            e.addFilter(name, opts.filters[name]);
        }
    }

    if (opts.asyncFilters) {
        for (name in opts.asyncFilters) {
            e.addFilter(name, opts.asyncFilters[name], true);
        }
    }

    if (opts.extensions) {
        for (name in opts.extensions) {
            e.addExtension(name, opts.extensions[name]);
        }
    }

    ctx = ctx || {};
    const t = new Template(str, e);

    if (!cb) {
        return t.render(ctx);
    } else {
        numAsyncs++;
        t.render(ctx, (err, res) => {
            if (err && !opts.noThrow) {
                throw err;
            }

            cb(err, normEOL(res));

            numAsyncs--;

            if (numAsyncs === 0 && doneHandler) {
                doneHandler();
            }
        });
    }
}

module.exports.render = render;
module.exports.equal = equal;
module.exports.finish = finish;
module.exports.normEOL = normEOL;
