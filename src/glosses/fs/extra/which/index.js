import { join, getPathInfo, getNotFoundError } from "./helpers";
const {
    is
} = adone;

export default (fs) => {
    return (cmd, options, callback) => {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        const info = getPathInfo(cmd, options);
        const pathEnv = info.env;
        const pathExt = info.ext;
        const pathExtExe = info.extExe;
        const found = [];
        (function F(i, l) {
            if (i === l) {
                if (options.all && found.length) {
                    return callback(null, found);
                }
                return callback(getNotFoundError(cmd));
            }

            let pathPart = pathEnv[i];
            if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"') {
                pathPart = pathPart.slice(1, -1);
            }

            let p = join(pathPart, cmd);
            if (!pathPart && (/^\.[\\\/]/).test(cmd)) {
                p = cmd.slice(0, 2) + p;
            }
            (function E(ii, ll) {
                if (ii === ll) {
                    return F(i + 1, l);
                }
                const ext = pathExt[ii];
                fs.isExecutable(p + ext, { pathExt: pathExtExe }, (er, is) => {
                    if (!er && is) {
                        if (options.all) {
                            found.push(p + ext);
                        } else {
                            return callback(null, p + ext);
                        }
                    }
                    return E(ii + 1, ll);
                });
            })(0, pathExt.length);
        })(0, pathEnv.length);
    };
};
