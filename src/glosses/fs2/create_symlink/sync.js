const {
    fs2,
    path
} = adone;
const { base } = fs2;

const symlinkPathsSync = (srcpath, dstpath) => {
    let exists;
    if (path.isAbsolute(srcpath)) {
        exists = base.existsSync(srcpath);
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
    exists = base.existsSync(relativeToDst);
    if (exists) {
        return {
            toCwd: relativeToDst,
            toDst: srcpath
        };
    }
    exists = base.existsSync(srcpath);
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
        stats = base.lstatSync(srcpath);
    } catch (e) {
        return "file";
    }
    return (stats && stats.isDirectory()) ? "dir" : "file";
};

const createSymlinkSync = (srcpath, dstpath, type) => {
    const destinationExists = base.existsSync(dstpath);
    if (destinationExists) {
        return undefined;
    }

    const relative = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative.toDst;
    type = symlinkTypeSync(relative.toCwd, type);
    const dir = path.dirname(dstpath);
    const exists = base.existsSync(dir);
    if (exists) {
        return base.symlinkSync(srcpath, dstpath, type);
    }
    fs2.mkdirpSync(dir);
    return base.symlinkSync(srcpath, dstpath, type);
};
createSymlinkSync.symlinkPathsSync = symlinkPathsSync;
createSymlinkSync.symlinkTypeSync = symlinkTypeSync;
export default createSymlinkSync;
