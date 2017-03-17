export class Command extends adone.shell.Base {
    constructor() {
        super("cat", { canReceivePipe: true });
    }

    async _execute(options, ...files) {
        let cat = this.readFromPipe();

        if (files.length === 0 && adone.is.nil(cat)) {
            this.error("No paths given");
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(await adone.fs.exists(file))) {
                this.error(`No such file or directory: ${file}`);
            }
            cat += await adone.fs.readFile(file, { encoding: "utf8" });
        }

        return cat;
    }
}
