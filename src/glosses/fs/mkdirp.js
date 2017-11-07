const {
    is,
    std,
    fs,
    noop
} = adone;

const _mkdirp = async (path, mode) => {
    try {
        await fs.mkdir(path, mode);
        return path;
    } catch (err) {
        if (err.code === "ENOENT") {
            const dirname = std.path.dirname(path);
            const parentRes = await _mkdirp(dirname, mode);
            const res = await _mkdirp(path, mode);
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

const _mkdirpSync = (path, mode) => {
    try {
        fs.mkdirSync(path, mode);
        return path;
    } catch (err) {
        if (err.code === "ENOENT") {
            const dirname = std.path.dirname(path);
            const parentRes = _mkdirpSync(dirname, mode);
            const res = _mkdirpSync(path, mode);
            return parentRes || res;
        }
        let stat;
        try {
            stat = fs.lstatSync(path);
        } catch (_err) {
            throw err;
        }
        if (!stat.isDirectory()) {
            throw err;
        }
        return null; // nothing was created, return null
    }
};

export const mkdirp = (path, mode = 0o777 & (~process.umask())) => {
    if (is.array(path)) {
        return Promise.all(path.map((x) => mkdirp(x, mode)));
    }
    return _mkdirp(std.path.resolve(path), mode);
};

export const mkdirpSync = (path, mode = 0o777 & (~process.umask())) => {
    if (is.array(path)) {
        return path.map((x) => mkdirpSync(x, mode));
    }
    return _mkdirpSync(std.path.resolve(path), mode);
};
