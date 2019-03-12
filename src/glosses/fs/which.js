const {
    fs,
    is,
    std
} = adone;
const isWindows = is.windows || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
const COLON = isWindows ? ";" : ":";

const getNotFoundError = (cmd) => {
    const err = new adone.error.NotFoundException(`Not found: ${cmd}`);
    err.code = "ENOENT";
    return err;
};

const getPathInfo = (cmd, { colon = COLON, path = process.env.PATH || "", pathExt = process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" } = {}) => {
    let env = path.split(colon);
    let ext = [""];

    let extExe = "";
    if (isWindows) {
        env.unshift(process.cwd());
        extExe = pathExt;
        ext = extExe.split(colon);


        // Always test the cmd itself first.  isexe will check to make sure
        // it's found in the pathExt set.
        if (cmd.includes(".") && ext[0] !== "") {
            ext.unshift("");
        }
    }

    // If it has a slash, then we don't bother searching the pathenv.
    // just check the file itself, and that's it.
    if (cmd.match(/\//) || isWindows && cmd.match(/\\/)) {
        env = [""];
    }

    return {
        env,
        ext,
        extExe
    };
};

export const which = async (cmd, { colon, path, pathExt, all = false, nothrow = false } = {}) => {
    const info = getPathInfo(cmd, { colon, path, pathExt });
    const pathEnv = info.env;
    const ext = info.ext;
    const pathExtExe = info.extExe;
    const found = [];

    for (let i = 0, l = pathEnv.length; i < l; i++) {
        let pathPart = pathEnv[i];
        if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"') {
            pathPart = pathPart.slice(1, -1);
        }

        let p = std.path.join(pathPart, cmd);
        if (!pathPart && /^\.[\\/]/.test(cmd)) {
            p = cmd.slice(0, 2) + p;
        }
        for (let j = 0, ll = ext.length; j < ll; j++) {
            const cur = p + ext[j];
            let isExe;
            try {
                // eslint-disable-next-line no-await-in-loop
                isExe = await fs.isExecutable(cur, {
                    pathExt: pathExtExe
                });
                if (isExe) {
                    if (all) {
                        found.push(cur);
                    } else {
                        return cur;
                    }
                }
            } catch (ex) {
                //
            }
        }
    }

    if (all && found.length) {
        return found;
    }

    if (nothrow) {
        return null;
    }

    throw getNotFoundError(cmd);
};

export const whichSync = (cmd, { colon, path, pathExt, all = false, nothrow = false } = {}) => {
    const info = getPathInfo(cmd, { colon, path, pathExt });
    const pathEnv = info.env;
    const ext = info.ext;
    const pathExtExe = info.extExe;
    const found = [];

    for (let i = 0, l = pathEnv.length; i < l; i++) {
        let pathPart = pathEnv[i];
        if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"') {
            pathPart = pathPart.slice(1, -1);
        }

        let p = std.path.join(pathPart, cmd);
        if (!pathPart && /^\.[\\/]/.test(cmd)) {
            p = cmd.slice(0, 2) + p;
        }
        for (let j = 0, ll = ext.length; j < ll; j++) {
            const cur = p + ext[j];
            let isExe;
            try {
                isExe = fs.isExecutableSync(cur, { pathExt: pathExtExe });
                if (isExe) {
                    if (all) {
                        found.push(cur);
                    } else {
                        return cur;
                    }
                }
            } catch (ex) {
                //
            }
        }
    }

    if (all && found.length) {
        return found;
    }

    if (nothrow) {
        return null;
    }

    throw getNotFoundError(cmd);
};
