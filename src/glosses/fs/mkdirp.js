const {
    is,
    std,
    fs,
    noop
} = adone;

const mkdirp = async (path, mode) => {
    try {
        await fs.mkdir(path, mode);
        return path;
    } catch (err) {
        if (err.code === "ENOENT") {
            const dirname = std.path.dirname(path);
            const parentRes = await mkdirp(dirname, mode);
            const res = await mkdirp(path, mode);
            return parentRes || res;
        }
        const stat = await fs.lstat(path).catch(noop);
        if (!stat || !stat.isDirectory()) {
            // stat request failed or this is not a directory
            throw err;
        }
        return null; // nothing was created, return null
    }
};

export default function mkdir(path, mode = 0o777 & (~process.umask())) {
    if (is.array(path)) {
        return Promise.all(path.map((x) => mkdir(x, mode)));
    }
    return mkdirp(std.path.resolve(path), mode);
}
