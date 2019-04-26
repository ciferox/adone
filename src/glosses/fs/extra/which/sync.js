import { join, getPathInfo, getNotFoundError } from "./helpers";

export default (fs) => {
    return (cmd, { colon, path, pathExt, all = false, nothrow = false } = {}) => {
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

            let p = join(pathPart, cmd);
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
};
