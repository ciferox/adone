export class Command extends adone.shell.Base {
    constructor() {
        super("pwd", { allowGlobbing: false });
    }

    _execute() {
        return adone.std.path.resolve(process.cwd());
    }
}
