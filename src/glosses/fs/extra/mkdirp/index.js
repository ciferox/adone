export default (fs) => {
    const {
        is,
        path
    } = adone;
    
    const invalidWin32Path = require("./win32").invalidWin32Path;
    
    const o777 = parseInt("0777", 8);
    
    const mkdirp = (p, opts, callback, made) => {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        } else if (!opts || typeof opts !== "object") {
            opts = { mode: opts };
        }
    
        if (process.platform === "win32" && invalidWin32Path(p)) {
            const errInval = new Error(`${p} contains invalid WIN32 path characters.`);
            errInval.code = "EINVAL";
            return callback(errInval);
        }
    
        let mode = opts.mode;
    
        if (is.undefined(mode)) {
            mode = o777 & (~process.umask());
        }
        if (!made) {
            made = null;
        }
    
        callback = callback || function () { };
        p = path.resolve(p);
    
        fs.mkdir(p, mode, (er) => {
            if (!er) {
                made = made || p;
                return callback(null, made);
            }
            switch (er.code) {
                case "ENOENT":
                    if (path.dirname(p) === p) {
                        return callback(er);
                    }
                    mkdirp(path.dirname(p), opts, (er, made) => {
                        if (er) {
                            callback(er, made);
                        } else {
                            mkdirp(p, opts, callback, made);
                        }
                    });
                    break;
    
                // In the case of any other error, just see if there's a dir
                // there already.  If so, then hooray!  If not, then something
                // is borked.
                default:
                    fs.stat(p, (er2, stat) => {
                        // if the stat fails, then that's super weird.
                        // let the original error be the failure reason.
                        if (er2 || !stat.isDirectory()) {
                            callback(er, made);
                        } else {
                            callback(null, made);
                        }
                    });
                    break;
            }
        });
    };
    
    return mkdirp;    
};
