const { is } = adone;

export class Command extends adone.shell.Base {
    constructor() {
        super("cd");
    }
    _execute(options, dir) {
        if (!dir) {
            dir = adone.std.os.homedir();
        }

        if (dir === "-") {
            if (!is.string(process.env.OLDPWD)) {
                this.error("Could not find previous directory");
            } else {
                dir = process.env.OLDPWD;
            }
        }

        try {
            const curDir = process.cwd();
            process.chdir(dir);
            process.env.OLDPWD = curDir;
        } catch (err) {
            let msg;
            switch (err.code) {
                case "ENOENT":
                    msg = `The directory '${dir}' does not exist`;
                    break;
                case "EACCES":
                    msg = `Permission denied: '${dir}'`;
                    break;
                default:
                    msg = err.message;
                    break;
            }
            this.error(msg);
        }
        return "";
    }
}
