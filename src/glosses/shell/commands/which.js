const { is, std } = adone;

const splitPath = (p) => (is.string(p) ? p.split(std.path.delimiter) : []);
const checkPath = async (pathName) => {
    try {
        return await adone.fs.is.file(pathName);
    } catch (err) {
        return false;
    }
};

export class Command extends adone.shell.Base {
    constructor() {
        super("which", {
            allowGlobbing: false,
            cmdOptions: {
                a: "all"
            }
        });
    }

    async _execute(options, cmd) {
        if (!cmd) {
            this.error("Must specify command");
        }

        const pathEnv = process.env.path || process.env.Path || process.env.PATH;
        const pathArray = splitPath(pathEnv);

        const queryMatches = [];

        if (cmd.indexOf("/") === -1) {
            let pathExtArray = [""];
            if (is.win32) {
                const pathExtEnv = process.env.PATHEXT || ".com;.exe;.bat;.cmd;.vbs;.vbe;.js;.jse;.wsf;.wsh";
                pathExtArray = splitPath(pathExtEnv.toUpperCase());
            }

            for (let k = 0; k < pathArray.length; k++) {
                if (queryMatches.length > 0 && !options.all) {
                    break;
                }

                let attempt = std.path.resolve(pathArray[k], cmd);

                if (is.win32) {
                    attempt = attempt.toUpperCase();
                }

                const match = attempt.match(/\.[^<>:"/\|?*.]+$/);
                if (match && pathExtArray.indexOf(match[0]) >= 0) {
                    if (await checkPath(attempt)) {
                        queryMatches.push(attempt);
                        break;
                    }
                } else {
                    for (let i = 0; i < pathExtArray.length; i++) {
                        const ext = pathExtArray[i];
                        const newAttempt = attempt + ext;
                        if (await checkPath(newAttempt)) {
                            queryMatches.push(newAttempt);
                            break;
                        }
                    }
                }
            }
        } else if (await checkPath(cmd)) {
            queryMatches.push(std.path.resolve(cmd));
        }

        if (queryMatches.length > 0) {
            return options.all ? queryMatches : queryMatches[0];
        }
        return options.all ? [] : null;
    }
}
