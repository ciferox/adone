export default (fs) => {
    const {
        is,
        path
    } = adone;
    
    const invalidWin32Path = require("./win32").invalidWin32Path;
    
    const o777 = parseInt("0777", 8);
    
    const mkdirpSync = (p, opts, made) => {
        if (!opts || typeof opts !== "object") {
            opts = { mode: opts };
        }
    
        let mode = opts.mode;
    
        if (process.platform === "win32" && invalidWin32Path(p)) {
            const errInval = new Error(`${p} contains invalid WIN32 path characters.`);
            errInval.code = "EINVAL";
            throw errInval;
        }
    
        if (is.undefined(mode)) {
            mode = o777 & (~process.umask());
        }
        if (!made) {
            made = null;
        }
    
        p = path.resolve(p);
    
        try {
            fs.mkdirSync(p, mode);
            made = made || p;
        } catch (err0) {
            if (err0.code === "ENOENT") {
                if (path.dirname(p) === p) {
                    throw err0;
                }
                made = mkdirpSync(path.dirname(p), opts, made);
                mkdirpSync(p, opts, made);
            } else {
                // In the case of any other error, just see if there's a dir there
                // already. If so, then hooray!  If not, then something is borked.
                let stat;
                try {
                    stat = fs.statSync(p);
                } catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) {
                    throw err0;
                }
            }
        }
    
        return made;
    };
    
    return mkdirpSync;    
};
