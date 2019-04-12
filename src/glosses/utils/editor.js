const {
    is,
    fs,
    process: { exec }
} = adone;

export default class Editor {
    constructor({ text = "", editor = null, path = null, ext = "" } = {}) {
        this.text = text;
        this.path = path;
        if (is.string(path) && ext.length > 0 && !path.endsWith(ext)) {
            path += ext;
        }
        this.ext = ext;
        const ed = editor || adone.system.env.editor();
        const args = ed.split(/\s+/);
        this.bin = args.shift();
        this.args = args;
    }

    spawn({ detached = false } = {}) {
        const child = exec(this.bin, [...this.args, this.path], {
            detached
        });
        if (detached) {
            child.unref();
        }
        return child;
    }

    async run({ save = false, detached } = {}) {
        if (is.null(this.path)) {
            this.path = await fs.tmpName({ ext: this.ext });
        }
        await fs.writeFile(this.path, this.text);
        await this.spawn({ detached });
        if (!save) {
            this.text = await fs.readFile(this.path, { encoding: "utf8" });
            return this.text;
        }
    }

    cleanup() {
        return fs.unlink(this.path);
    }

    static async edit(options) {
        const editor = new Editor(options);
        const response = await editor.run(adone.util.pick(options, ["save", "detached"]));
        if (!options.save) {
            await editor.cleanup();
            return response;
        }
    }
}
