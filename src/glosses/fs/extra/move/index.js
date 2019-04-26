export default (fs) => {
    const {
        is,
        path
    } = adone;
    
    const moveAcrossDevice = (src, dest, overwrite, cb) => {
        const opts = {
            overwrite,
            errorOnExist: true
        };
    
        fs.copy(src, dest, opts, (err) => {
            if (err) {
                return cb(err);
            }
            return fs.remove(src, cb);
        });
    };
    
    const rename = (src, dest, overwrite, cb) => {
        fs.rename(src, dest, (err) => {
            if (!err) {
                return cb();
            }
            if (err.code !== "EXDEV") {
                return cb(err);
            }
            return moveAcrossDevice(src, dest, overwrite, cb);
        });
    };
    
    const doRename = (src, dest, overwrite, cb) => {
        if (overwrite) {
            return fs.remove(dest, (err) => {
                if (err) {
                    return cb(err);
                }
                return rename(src, dest, overwrite, cb);
            });
        }
        fs.pathExists(dest, (err, destExists) => {
            if (err) {
                return cb(err);
            }
            if (destExists) {
                return cb(new Error("dest already exists."));
            }
            return rename(src, dest, overwrite, cb);
        });
    };
    
    const isSrcSubdir = (src, dest) => {
        const srcArray = src.split(path.sep);
        const destArray = dest.split(path.sep);
    
        return srcArray.reduce((acc, current, i) => {
            return acc && destArray[i] === current;
        }, true);
    };
    
    return (src, dest, opts, cb) => {
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }
    
        const overwrite = opts.overwrite || opts.clobber || false;
    
        src = path.resolve(src);
        dest = path.resolve(dest);
    
        if (src === dest) {
            return fs.access(src, cb);
        }
    
        fs.stat(src, (err, st) => {
            if (err) {
                return cb(err);
            }
    
            if (st.isDirectory() && isSrcSubdir(src, dest)) {
                return cb(new Error(`Cannot move '${src}' to a subdirectory of itself, '${dest}'.`));
            }
            fs.mkdirp(path.dirname(dest), (err) => {
                if (err) {
                    return cb(err);
                }
                return doRename(src, dest, overwrite, cb);
            });
        });
    };    
};
