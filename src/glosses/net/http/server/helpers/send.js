const {
    std: { path: { normalize, basename, extname, resolve, parse, sep } },
    net: { http: { server: { helper: { resolvePath } } } },
    fs,
    error,
    is
} = adone;

const isHidden = (root, path) => {
    path = path.substr(root.length).split(sep);
    for (let i = 0; i < path.length; i++) {
        if (path[i][0] === ".") {
            return true;
        }
    }
    return false;
};

const type = (file, ext) => ext !== "" ? extname(basename(file, ext)) : extname(file);

const decode = (path) => {
    try {
        return decodeURIComponent(path);
    } catch (err) {
        return -1;
    }
};

export default async function send(ctx, path, opts = {}) {
    if (!ctx) {
        throw new error.InvalidArgument("context is required");
    }
    if (!path) {
        throw new error.InvalidArgument("pathname is required");
    }

    const { index, maxage = 0, hidden = false, immutable = false, setHeaders } = opts;
    const root = opts.root ? normalize(resolve(opts.root)) : "";
    const trailingSlash = path[path.length - 1] === "/";
    path = path.substr(parse(path).root.length);

    const brotli = opts.brotli !== false;
    const format = opts.format === false ? false : true;
    const extensions = is.array(opts.extensions) ? opts.extensions : false;
    const gzip = opts.gzip === false ? false : true;

    if (setHeaders && !is.function(setHeaders)) {
        throw new error.InvalidArgument("option setHeaders must be function");
    }

    path = decode(path);

    if (path === -1) {
        return ctx.throw(400, "failed to decode");
    }

    // index file support
    if (index && trailingSlash) {
        path += index;
    }

    path = resolvePath(root, path);

    if (!hidden && isHidden(root, path)) {
        return { sent: false, hidden: true };
    }
    let encodingExt = "";
    // serve brotli file when possible otherwise gzipped file when possible
    if (brotli && ctx.acceptsEncodings("br", "deflate", "identity") === "br" && (await fs.exists(`${path}.br`))) {
        path = `${path}.br`;
        ctx.set("Content-Encoding", "br");
        ctx.res.removeHeader("Content-Length");
        encodingExt = ".br";
    } else if (gzip && ctx.acceptsEncodings("gzip", "deflate", "identity") === "gzip" && (await fs.exists(`${path}.gz`))) {
        path = `${path}.gz`;
        ctx.set("Content-Encoding", "gzip");
        ctx.res.removeHeader("Content-Length");
        encodingExt = ".gz";
    }

    if (extensions && !/\.[^/]*$/.exec(path)) {
        for (let ext of extensions) {
            if (!is.string(ext)) {
                throw new error.InvalidArgument("option extensions must be array of strings or false");
            }
            if (!/^\./.exec(ext)) {
                ext = `.${ext}`;
            }
            if (await fs.exists(path + ext)) { // eslint-disable-line no-await-in-loop
                path = `${path}${ext}`;
                break;
            }
        }
    }

    let stats;
    try {
        stats = await fs.stat(path);
        // Format the path to serve static file servers and not require a trailing slash for directories,
        // so that you can do both `/directory` and `/directory/`
        if (stats.isDirectory()) {
            if (format && index) {
                path += `/${index}`;
                stats = await fs.stat(path);
            } else {
                return { path, directory: true, sent: false };
            }
        }
    } catch (err) {
        if (["ENOENT", "ENAMETOOLONG", "ENOTDIR"].includes(err.code)) {
            return { sent: false, notFound: true, code: err.code };
        }
        err.status = 500;
        throw err;
    }

    if (setHeaders) {
        setHeaders(ctx.res, path, stats);
    }

    ctx.set("Content-Length", stats.size);
    if (!ctx.response.get("Last-Modified")) {
        ctx.set("Last-Modified", stats.mtime.toUTCString());
    }
    if (!ctx.response.get("Cache-Control")) {
        const directives = [`max-age=${maxage / 1000 | 0}`];
        if (immutable) {
            directives.push("immutable");
        }
        ctx.set("Cache-Control", directives.join(","));
    }
    ctx.type = type(path, encodingExt);
    ctx.body = fs.createReadStream(path);

    return { path, sent: true };
}
