/* eslint-disable func-style */
/* eslint-disable camelcase */
const {
    is,
    std: { path, fs },
    util: { arrify }
} = adone;

const current = (process.versions && process.versions.node && process.versions.node.split(".")) || [];

const data = {
    assert: true,
    async_hooks: ">= 8",
    buffer_ieee754: "< 0.9.7",
    buffer: true,
    child_process: true,
    cluster: true,
    console: true,
    constants: true,
    crypto: true,
    _debugger: "< 8",
    dgram: true,
    dns: true,
    domain: true,
    events: true,
    freelist: "< 6",
    fs: true,
    "fs/promises": ">= 10 && < 10.1",
    _http_agent: ">= 0.11.1",
    _http_client: ">= 0.11.1",
    _http_common: ">= 0.11.1",
    _http_incoming: ">= 0.11.1",
    _http_outgoing: ">= 0.11.1",
    _http_server: ">= 0.11.1",
    http: true,
    http2: ">= 8.8",
    https: true,
    inspector: ">= 8.0.0",
    _linklist: "< 8",
    module: true,
    net: true,
    "node-inspect/lib/_inspect": ">= 7.6.0",
    "node-inspect/lib/internal/inspect_client": ">= 7.6.0",
    "node-inspect/lib/internal/inspect_repl": ">= 7.6.0",
    os: true,
    path: true,
    perf_hooks: ">= 8.5",
    process: ">= 1",
    punycode: true,
    querystring: true,
    readline: true,
    repl: true,
    smalloc: ">= 0.11.5 && < 3",
    _stream_duplex: ">= 0.9.4",
    _stream_transform: ">= 0.9.4",
    _stream_wrap: ">= 1.4.1",
    _stream_passthrough: ">= 0.9.4",
    _stream_readable: ">= 0.9.4",
    _stream_writable: ">= 0.9.4",
    stream: true,
    string_decoder: true,
    sys: true,
    timers: true,
    _tls_common: ">= 0.11.13",
    _tls_legacy: ">= 0.11.3 && < 10",
    _tls_wrap: ">= 0.11.3",
    tls: true,
    trace_events: ">= 10",
    tty: true,
    url: true,
    util: true,
    "v8/tools/arguments": ">= 10",
    "v8/tools/codemap": [">= 4.4.0 && < 5", ">= 5.2.0"],
    "v8/tools/consarray": [">= 4.4.0 && < 5", ">= 5.2.0"],
    "v8/tools/csvparser": [">= 4.4.0 && < 5", ">= 5.2.0"],
    "v8/tools/logreader": [">= 4.4.0 && < 5", ">= 5.2.0"],
    "v8/tools/profile_view": [">= 4.4.0 && < 5", ">= 5.2.0"],
    "v8/tools/splaytree": [">= 4.4.0 && < 5", ">= 5.2.0"],
    v8: ">= 1",
    vm: true,
    worker_threads: ">= 11.7",
    zlib: true
};


function specifierIncluded(specifier) {
    const parts = specifier.split(" ");
    const op = parts.length > 1 ? parts[0] : "=";
    const versionParts = (parts.length > 1 ? parts[1] : parts[0]).split(".");

    for (let i = 0; i < 3; ++i) {
        const cur = Number(current[i] || 0);
        const ver = Number(versionParts[i] || 0);
        if (cur === ver) {
            continue; // eslint-disable-line no-restricted-syntax, no-continue
        }
        if (op === "<") {
            return cur < ver;
        } else if (op === ">=") {
            return cur >= ver;
        }
        return false;

    }
    return op === ">=";
}

function matchesRange(range) {
    const specifiers = range.split(/ ?&& ?/);
    if (specifiers.length === 0) {
        return false;
    }
    for (let i = 0; i < specifiers.length; ++i) {
        if (!specifierIncluded(specifiers[i])) {
            return false;
        }
    }
    return true;
}

function versionIncluded(specifierValue) {
    if (is.boolean(specifierValue)) {
        return specifierValue;
    }
    if (specifierValue && typeof specifierValue === "object") {
        for (let i = 0; i < specifierValue.length; ++i) {
            if (matchesRange(specifierValue[i])) {
                return true;
            }
        }
        return false;
    }
    return matchesRange(specifierValue);
}



const core = {};
for (const mod in data) { // eslint-disable-line no-restricted-syntax
    if (Object.prototype.hasOwnProperty.call(data, mod)) {
        core[mod] = versionIncluded(data[mod]);
    }
}


const getNodeModulesDirs = function getNodeModulesDirs(absoluteStart, modules) {
    let prefix = "/";
    if ((/^([A-Za-z]:)/).test(absoluteStart)) {
        prefix = "";
    } else if ((/^\\\\/).test(absoluteStart)) {
        prefix = "\\\\";
    }

    const paths = [absoluteStart];
    let parsed = path.parse(absoluteStart);
    while (parsed.dir !== paths[paths.length - 1]) {
        paths.push(parsed.dir);
        parsed = path.parse(parsed.dir);
    }

    return paths.reduce((dirs, aPath) => {
        return dirs.concat(modules.map((moduleDir) => {
            return path.join(prefix, aPath, moduleDir);
        }));
    }, []);
};

const nodeModulesPaths = function (start, opts, request) {
    const modules = opts && opts.moduleDirectory
        ? [].concat(opts.moduleDirectory)
        : ["node_modules"];

    if (opts && is.function(opts.paths)) {
        return opts.paths(
            request,
            start,
            () => {
                return getNodeModulesDirs(start, modules);
            },
            opts
        );
    }

    const dirs = getNodeModulesDirs(start, modules);
    return opts && opts.paths ? dirs.concat(opts.paths) : dirs;
};

const normalizeOptions = function (x, opts) {
    /**
     * This file is purposefully a passthrough. It's expected that third-party
     * environments will override it at runtime in order to inject special logic
     * into `resolve` (by manipulating the options). One such example is the PnP
     * code path in Yarn.
     */

    return opts || {};
};


const caller = () => adone.util.getCallsites()[2].getFileName();

const defaultIsFile = function (file) {
    let stat;
    try {
        stat = fs.statSync(file);
    } catch (e) {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
            return false;
        }
        throw e;
    }
    return stat.isFile() || stat.isFIFO();
};

const defaultIsDir = function (dir) {
    let stat;
    try {
        stat = fs.statSync(dir);
    } catch (e) {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
            return false;
        }
        throw e;
    }
    return stat.isDirectory();
};

const resolve = function (x, options) {
    if (!is.string(x)) {
        throw new TypeError("Path must be a string.");
    }
    const opts = normalizeOptions(x, options);

    const isFile = opts.isFile || defaultIsFile;
    const isDirectory = opts.isDirectory || defaultIsDir;
    const readFileSync = opts.readFileSync || fs.readFileSync;

    const extensions = opts.extensions || [".js"];
    const basedir = opts.basedir || path.dirname(caller());
    const parent = opts.filename || basedir;

    opts.paths = opts.paths || [];

    // ensure that `basedir` is an absolute path at this point, resolving against the process' current working directory
    let absoluteStart = path.resolve(basedir);

    if (!opts.preserveSymlinks) {
        try {
            absoluteStart = fs.realpathSync(absoluteStart);
        } catch (realPathErr) {
            if (realPathErr.code !== "ENOENT") {
                throw realPathErr;
            }
        }
    }

    if (opts.basedir && !isDirectory(absoluteStart)) {
        const dirError = new TypeError(`Provided basedir "${opts.basedir}" is not a directory${opts.preserveSymlinks ? "" : ", or a symlink to a directory"}`);
        dirError.code = "INVALID_BASEDIR";
        throw dirError;
    }

    if ((/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[/\\])/).test(x)) {
        let res = path.resolve(absoluteStart, x);
        if (x === ".." || x.slice(-1) === "/") {
            res += "/";
        }
        const m = loadAsFile(res) || loadAsDirectory(res);
        if (m) {
            return m;
        }
    } else if (core[x]) {
        return x;
    } else {
        const locations = [undefined];
        if (opts.searchGlobal) {
            locations.push(
                path.join(adone.system.env.home(), ".node_modules"),
                path.join(adone.system.env.home(), ".node_libraries"),
                path.join(path.dirname(process.execPath), "..", "lib", "node")
            );
        }

        for (const loc of locations) {
            const n = loadNodeModules(x, absoluteStart, loc);
            if (n) {
                return n;
            }
        }
    }

    if (core[x]) {
        return x;
    }

    const err = new Error(`Cannot find module '${x}' from '${parent}'`);
    err.code = "MODULE_NOT_FOUND";
    throw err;

    function loadAsFile(x) {
        const pkg = loadpkg(path.dirname(x));

        if (pkg && pkg.dir && pkg.pkg && opts.pathFilter) {
            const rfile = path.relative(pkg.dir, x);
            const r = opts.pathFilter(pkg.pkg, x, rfile);
            if (r) {
                x = path.resolve(pkg.dir, r); // eslint-disable-line no-param-reassign
            }
        }

        if (isFile(x)) {
            return x;
        }

        for (let i = 0; i < extensions.length; i++) {
            const file = x + extensions[i];
            if (isFile(file)) {
                return file;
            }
        }
    }

    function loadpkg(dir) {
        if (dir === "" || dir === "/") {
            return;
        }
        if (process.platform === "win32" && (/^\w:[/\\]*$/).test(dir)) {
            return;
        }
        if ((/[/\\]node_modules[/\\]*$/).test(dir)) {
            return;
        }

        const pkgfile = path.join(dir, "package.json");

        if (!isFile(pkgfile)) {
            return loadpkg(path.dirname(dir));
        }

        const body = readFileSync(pkgfile);

        let pkg;
        try {
            pkg = JSON.parse(body);
        } catch (jsonErr) { }

        if (pkg && opts.packageFilter) {
            pkg = opts.packageFilter(pkg, pkgfile, dir);
        }

        return { pkg, dir };
    }

    function loadAsDirectory(x) {
        const pkgfile = path.join(x, "/package.json");
        if (isFile(pkgfile)) {
            let pkg;
            try {
                const body = readFileSync(pkgfile, "UTF8");
                pkg = JSON.parse(body);
            } catch (e) { }

            if (opts.packageFilter) {
                pkg = opts.packageFilter(pkg, x);
            }

            if (pkg.main) {
                if (!is.string(pkg.main)) {
                    const mainError = new TypeError(`package “${pkg.name}” \`main\` must be a string`);
                    mainError.code = "INVALID_PACKAGE_MAIN";
                    throw mainError;
                }
                if (pkg.main === "." || pkg.main === "./") {
                    pkg.main = "index";
                }
                try {
                    const m = loadAsFile(path.resolve(x, pkg.main));
                    if (m) {
                        return m;
                    }
                    const n = loadAsDirectory(path.resolve(x, pkg.main));
                    if (n) {
                        return n;
                    }
                } catch (e) { }
            }
        }

        return loadAsFile(path.join(x, "/index"));
    }

    function loadNodeModules(x, start, dirs) {
        dirs = dirs
            ? arrify(dirs)
            : nodeModulesPaths(start, opts, x);

        for (let i = 0; i < dirs.length; i++) {
            const dir = dirs[i];
            const m = loadAsFile(path.join(dir, "/", x));
            if (m) {
                return m;
            }
            const n = loadAsDirectory(path.join(dir, "/", x));
            if (n) {
                return n;
            }
        }
    }
};

resolve.nodeModulesPaths = nodeModulesPaths;
resolve.core = core;
resolve.isCore = (x) => core[x];

export default resolve;
