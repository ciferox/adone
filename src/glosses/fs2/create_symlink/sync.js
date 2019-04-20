const {
    fs2,
    path
} = adone;
const { graceful } = fs2;

const symlinkPathsSync = (srcpath, dstpath) => {
    let exists;
    if (path.isAbsolute(srcpath)) {
        exists = graceful.existsSync(srcpath);
        if (!exists) {
            throw new Error("absolute srcpath does not exist");
        }
        return {
            toCwd: srcpath,
            toDst: srcpath
        };
    }
    const dstdir = path.dirname(dstpath);
    const relativeToDst = path.join(dstdir, srcpath);
    exists = graceful.existsSync(relativeToDst);
    if (exists) {
        return {
            toCwd: relativeToDst,
            toDst: srcpath
        };
    }
    exists = graceful.existsSync(srcpath);
    if (!exists) {
        throw new Error("relative srcpath does not exist");
    }
    return {
        toCwd: srcpath,
        toDst: path.relative(dstdir, srcpath)
    };
};

const symlinkTypeSync = (srcpath, type) => {
    let stats;

    if (type) {
        return type;
    }
    try {
        stats = graceful.lstatSync(srcpath);
    } catch (e) {
        return "file";
    }
    return (stats && stats.isDirectory()) ? "dir" : "file";
};

const createSymlinkSync = (srcpath, dstpath, type) => {
    const destinationExists = graceful.existsSync(dstpath);
    if (destinationExists) {
        return undefined;
    }

    const relative = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative.toDst;
    type = symlinkTypeSync(relative.toCwd, type);
    const dir = path.dirname(dstpath);
    const exists = graceful.existsSync(dir);
    if (exists) {
        return graceful.symlinkSync(srcpath, dstpath, type);
    }
    fs2.mkdirpSync(dir);
    return graceful.symlinkSync(srcpath, dstpath, type);
};
createSymlinkSync.symlinkPathsSync = symlinkPathsSync;
createSymlinkSync.symlinkTypeSync = symlinkTypeSync;
export default createSymlinkSync;
