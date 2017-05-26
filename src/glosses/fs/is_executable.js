const { is } = adone;

let syncCheck;
let asyncCheck;

if (is.win32) {
    const checkPathExt = (path, options) => {
        let pathext = !is.undefined(options.pathExt) ? options.pathExt : process.env.PATHEXT;

        if (!pathext) {
            return true;
        }

        pathext = pathext.split(";");
        if (pathext.indexOf("") !== -1) {
            return true;
        }
        for (let i = 0; i < pathext.length; i++) {
            const p = pathext[i].toLowerCase();
            if (p && path.substr(-p.length).toLowerCase() === p) {
                return true;
            }
        }
        return false;
    };

    const checkStat = (stat, path, options) => {
        if (!stat.isSymbolicLink() && !stat.isFile()) {
            return false;
        }
        return checkPathExt(path, options);
    };

    asyncCheck = (path, options, cb) => {
        adone.std.fs.stat(path, (er, stat) => {
            cb(er, er ? false : checkStat(stat, path, options));
        });
    };

    syncCheck = (path, options) => checkStat(adone.std.fs.statSync(path), path, options);
} else {
    const checkMode = (stat, options) => {
        const mod = stat.mode;
        const uid = stat.uid;
        const gid = stat.gid;

        const myUid = !is.undefined(options.uid) ? options.uid : process.getuid && process.getuid();
        const myGid = !is.undefined(options.gid) ? options.gid : process.getgid && process.getgid();

        const u = parseInt("100", 8);
        const g = parseInt("010", 8);
        const o = parseInt("001", 8);
        const ug = u | g;

        return Boolean((mod & o) || (mod & g) && gid === myGid || (mod & u) && uid === myUid || (mod & ug) && myUid === 0);
    };

    const checkStat = (stat, options) => stat.isFile() && checkMode(stat, options);

    asyncCheck = (path, options, callback) => {
        adone.std.fs.stat(path, (err, stat) => {
            callback(err, err ? false : checkStat(stat, options));
        });
    };

    syncCheck = (path, options) => checkStat(adone.std.fs.statSync(path), options);
}

export const isExecutable = (path, options = {}) => {
    return new Promise((resolve, reject) => {
        asyncCheck(path, options, (err, result) => {
            // ignore EACCES because that just means we aren't allowed to run it
            if (err) {
                if (err.code === "EACCES" || options.ignoreErrors) {
                    return resolve(result);
                }
                return reject(err);
            }
            resolve(result);
        });
    });
};

export const isExecutableSync = (path, options = {}) => {
    try {
        return syncCheck(path, options);
    } catch (err) {
        if (options.ignoreErrors || err.code === "EACCES") {
            return false;
        }
        throw err;
    }
};
