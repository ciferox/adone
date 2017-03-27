
const {
    std: { path: { normalize, basename, extname, resolve, parse, sep } },
    net: { http: { server: { helper: { resolvePath } } } },
    fs,
    x, is
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

const type = (file) => extname(basename(file, ".gz"));

const decode = (path) => {
    try {
        return decodeURIComponent(path);
    } catch (err) {
        return -1;
    }
};

export default async function send(ctx, path, opts = {}) {
    if (!ctx) {
        throw new x.InvalidArgument("context is required");
    }
    if (!path) {
        throw new x.InvalidArgument("pathname is required");
    }

    const { index, maxage = 0, hidden = false, setHeaders } = opts;
    const root = opts.root ? normalize(resolve(opts.root)) : "";
    const trailingSlash = path[path.length - 1] === "/";
    path = path.substr(parse(path).root.length);


    const format = opts.format === false ? false : true;
    const extensions = is.array(opts.extensions) ? opts.extensions : false;
    const gzip = opts.gzip === false ? false : true;

    if (setHeaders && !is.function(setHeaders)) {
        throw new x.InvalidArgument("option setHeaders must be function");
    }

    const encoding = ctx.acceptsEncodings("gzip", "deflate", "identity");

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
        return { sent: false };
    }

    // serve gzipped file when possible
    if (encoding === "gzip" && gzip && (await fs.exists(`${path}.gz`))) {
        path = `${path}.gz`;
        ctx.set("Content-Encoding", "gzip");
        ctx.res.removeHeader("Content-Length");
    }

    if (extensions && !/\..*$/.exec(path)) {
        for (let ext of extensions) {
            if (!is.string(ext)) {
                throw new x.InvalidArgument("option extensions must be array of strings or false");
            }
            if (!/^\./.exec(ext)) {
                ext = `.${ext}`;
            }
            if (await fs.exists(path + ext)) {  // eslint-disable-line no-await-in-loop
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
            return { sent: false };
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
        ctx.set("Cache-Control", `max-age=${maxage / 1000 | 0}`);
    }
    ctx.type = type(path);
    ctx.body = fs.createReadStream(path);

    return { path, sent: true };
}
