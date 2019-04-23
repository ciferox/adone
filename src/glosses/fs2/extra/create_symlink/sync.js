export default (fs) => {
    const {
        path
    } = adone;
    
    const symlinkPathsSync = (srcpath, dstpath) => {
        let exists;
        if (path.isAbsolute(srcpath)) {
            exists = fs.existsSync(srcpath);
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
        exists = fs.existsSync(relativeToDst);
        if (exists) {
            return {
                toCwd: relativeToDst,
                toDst: srcpath
            };
        }
        exists = fs.existsSync(srcpath);
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
            stats = fs.lstatSync(srcpath);
        } catch (e) {
            return "file";
        }
        return (stats && stats.isDirectory()) ? "dir" : "file";
    };
    
    const createSymlinkSync = (srcpath, dstpath, type) => {
        const destinationExists = fs.existsSync(dstpath);
        if (destinationExists) {
            return undefined;
        }
    
        const relative = symlinkPathsSync(srcpath, dstpath);
        srcpath = relative.toDst;
        type = symlinkTypeSync(relative.toCwd, type);
        const dir = path.dirname(dstpath);
        const exists = fs.existsSync(dir);
        if (exists) {
            return fs.symlinkSync(srcpath, dstpath, type);
        }
        fs.mkdirpSync(dir);
        return fs.symlinkSync(srcpath, dstpath, type);
    };
    createSymlinkSync.symlinkPathsSync = symlinkPathsSync;
    createSymlinkSync.symlinkTypeSync = symlinkTypeSync;
    return createSymlinkSync;    
};
