const { is, fs, std } = adone;

export default class Editor {
    constructor({ text = "", editor = null, path = null, ext = "" } = {}) {
        this.text = text;
        this.path = path;
        if (is.string(path) && ext.length > 0 && !path.endsWith(ext)) {
            path += ext;
        }
        this.ext = ext;
        const ed = editor || Editor.DEFAULT;
        const args = ed.split(/\s+/);
        this.bin = args.shift();
        this.args = args;
    }

    spawn() {
        return std.child_process.spawn(this.bin, this.args.concat([this.path]), {
            stdio: "inherit"
        });
    }

    async run() {
        if (is.null(this.path)) {
            this.path = await fs.tmpName({ ext: this.ext });
        }
        await fs.writeFile(this.path, this.text);
        const childProcess = this.spawn();
        await new Promise((resolve) => {
            childProcess.on("exit", () => {
                resolve();
            });
        });

        this.text = await fs.readFile(this.path, { encoding: "utf8" });
        return this.text;
    }

    cleanup() {
        return fs.unlink(this.path);
    }

    static async edit(options) {
        const editor = new Editor(options);
        const response = await editor.run();
        await editor.cleanup();
        return response;
    }

    static DEFAULT = process.env.VISUAL || process.env.EDITOR || (/^win/.test(process.platform) ? "notepad" : "vim");
}
