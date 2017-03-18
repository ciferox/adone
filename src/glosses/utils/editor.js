const { fs, std } = adone;

export default class Editor {
    constructor(text = "") {
        this.text = text;
        const ed = /^win/.test(process.platform) ? "notepad" : "vim";
        const editor = process.env.VISUAL || process.env.EDITOR || ed;
        const args = editor.split(/\s+/);
        this.bin = args.shift();
        this.args = args;
    }

    async run() {
        this.tempFile = await fs.tmpName();
        await fs.writeFile(this.tempFile, this.text);
        const childProcess = std.child_process.spawn(this.bin, this.args.concat([this.tempFile]), {
            stdio: "inherit"
        });
        await new Promise((resolve) => {
            childProcess.on("exit", () => {
                resolve();
            });
        });

        this.text = await fs.readFile(this.tempFile, { encoding: "utf8" });
        return this.text;
    }

    cleanup() {
        return fs.unlink(this.tempFile);
    }

    static async edit(text = "") {
        const editor = new Editor(text);
        const response = await editor.run();
        await editor.cleanup();
        return response;
    }
}
