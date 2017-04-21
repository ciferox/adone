
const helpers = require("../helpers");

export default class FileManager extends adone.cui.widget.List {
    constructor(options = { }) {
        options.parseTags = true;
        // options.label = ' {blue-fg}%path{/blue-fg} ';
        super(options);

        this.cwd = options.cwd || process.cwd();
        this.file = this.cwd;
        this.value = this.cwd;

        if (options.label && ~options.label.indexOf("%path")) {
            this._label.setContent(options.label.replace("%path", this.cwd));
        }

        this.on("select", (item) => {
            const value = item.content.replace(/\{[^{}]+\}/g, "").replace(/@$/, "");
            const file = adone.std.path.resolve(this.cwd, value);

            return adone.std.fs.stat(file, (err, stat) => {
                if (err) {
                    return this.emit("error", err, file);
                }
                this.file = file;
                this.value = file;
                if (stat.isDirectory()) {
                    this.emit("cd", file, this.cwd);
                    this.cwd = file;
                    if (options.label && ~options.label.indexOf("%path")) {
                        this._label.setContent(options.label.replace("%path", file));
                    }
                    this.refresh();
                } else {
                    this.emit("file", file);
                }
            });
        });
    }

    refresh(cwd, callback) {
        if (!callback) {
            callback = cwd;
            cwd = null;
        }

        if (cwd) this.cwd = cwd;
        else cwd = this.cwd;

        return adone.std.fs.readdir(cwd, (err, list) => {
            if (err && err.code === "ENOENT") {
                this.cwd = cwd !== process.env.HOME ? process.env.HOME : "/";
                return this.refresh(callback);
            }

            if (err) {
                if (callback) return callback(err);
                return this.emit("error", err, cwd);
            }

            let dirs = [];
            let files = [];

            list.unshift("..");

            list.forEach((name) => {
                const f = adone.std.path.resolve(cwd, name);
                let stat;

                try {
                    stat = adone.std.fs.lstatSync(f);
                } catch (e) { }

                if ((stat && stat.isDirectory()) || name === "..") {
                    dirs.push({
                        name: name,
                        text: "{brightblue-fg}" + name + "{/brightblue-fg}/",
                        dir: true
                    });
                } else if (stat && stat.isSymbolicLink()) {
                    files.push({
                        name: name,
                        text: "{brightcyan-fg}" + name + "{/brightcyan-fg}@",
                        dir: false
                    });
                } else {
                    files.push({
                        name,
                        text: name,
                        dir: false
                    });
                }
            });

            dirs = helpers.asort(dirs);
            files = helpers.asort(files);

            list = dirs.concat(files).map((data) => {
                return data.text;
            });

            this.setItems(list);
            this.select(0);
            this.screen.render();

            this.emit("refresh");

            if (callback) callback();
        });
    }

    pick(cwd, callback) {
        if (!callback) {
            callback = cwd;
            cwd = null;
        }

        let focused = this.screen.focused === this;
        let hidden = this.hidden;
        let onfile;
        let oncancel;

        const resume = () => {
            this.removeListener("file", onfile);
            this.removeListener("cancel", oncancel);
            if (hidden) {
                this.hide();
            }
            if (!focused) {
                this.screen.restoreFocus();
            }
            this.screen.render();
        };

        this.on("file", onfile = (file) => {
            resume();
            return callback(null, file);
        });

        this.on("cancel", oncancel = () => {
            resume();
            return callback();
        });

        this.refresh(cwd, (err) => {
            if (err) return callback(err);

            if (hidden) {
                this.show();
            }

            if (!focused) {
                this.screen.saveFocus();
                this.focus();
            }

            this.screen.render();
        });
    }

    reset(cwd, callback) {
        if (!callback) {
            callback = cwd;
            cwd = null;
        }
        this.cwd = cwd || this.options.cwd;
        this.refresh(callback);
    }
}
FileManager.prototype.type = "file-manager";