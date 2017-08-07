const { is } = adone;
const isWindows = is.windows || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
const COLON = isWindows ? ";" : ":";

const getNotFoundError = (cmd) => {
    const err = new Error(`not found: ${cmd}`);
    err.code = "ENOENT";
    return err;
};

const getPathInfo = (cmd, opt) => {
    const colon = opt.colon || COLON;
    let pathEnv = opt.path || process.env.PATH || "";
    let pathExt = [""];

    pathEnv = pathEnv.split(colon);

    let pathExtExe = "";
    if (isWindows) {
        pathEnv.unshift(process.cwd());
        pathExtExe = (opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM");
        pathExt = pathExtExe.split(colon);


        // Always test the cmd itself first.  isexe will check to make sure
        // it's found in the pathExt set.
        if (cmd.indexOf(".") !== -1 && pathExt[0] !== "") {
            pathExt.unshift("");
        }
    }

    // If it has a slash, then we don't bother searching the pathenv.
    // just check the file itself, and that's it.
    if (cmd.match(/\//) || isWindows && cmd.match(/\\/)) {
        pathEnv = [""];
    }

    return {
        env: pathEnv,
        ext: pathExt,
        extExe: pathExtExe
    };
};

export const which = async (cmd, opt = {}) => {
    const info = getPathInfo(cmd, opt);
    const pathEnv = info.env;
    const pathExt = info.ext;
    const pathExtExe = info.extExe;
    const found = [];

    for (let i = 0, l = pathEnv.length; i < l; i++) {
        let pathPart = pathEnv[i];
        if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"') {
            pathPart = pathPart.slice(1, -1);
        }

        let p = adone.std.path.join(pathPart, cmd);
        if (!pathPart && /^\.[\\\/]/.test(cmd)) {
            p = cmd.slice(0, 2) + p;
        }
        for (let j = 0, ll = pathExt.length; j < ll; j++) {
            const cur = p + pathExt[j];
            let is;
            try {
                is = await adone.fs.is.executable(cur, {
                    pathExt: pathExtExe
                });
                if (is) {
                    if (opt.all) {
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

    if (opt.all && found.length) {
        return found;
    }

    throw getNotFoundError(cmd);
};

export const whichSync = (cmd, opt = {}) => {
    const info = getPathInfo(cmd, opt);
    const pathEnv = info.env;
    const pathExt = info.ext;
    const pathExtExe = info.extExe;
    const found = [];

    for (let i = 0, l = pathEnv.length; i < l; i++) {
        let pathPart = pathEnv[i];
        if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"') {
            pathPart = pathPart.slice(1, -1);
        }

        let p = adone.std.path.join(pathPart, cmd);
        if (!pathPart && /^\.[\\\/]/.test(cmd)) {
            p = cmd.slice(0, 2) + p;
        }
        for (let j = 0, ll = pathExt.length; j < ll; j++) {
            const cur = p + pathExt[j];
            let is;
            try {
                is = adone.fs.is.executableSync(cur, { pathExt: pathExtExe });
                if (is) {
                    if (opt.all) {
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

    if (opt.all && found.length) {
        return found;
    }

    if (opt.nothrow) {
        return null;
    }

    throw getNotFoundError(cmd);
};
