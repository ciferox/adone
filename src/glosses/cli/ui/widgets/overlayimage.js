
const helpers = require("../helpers");

export default class OverlayImage extends adone.cli.ui.widget.Element {
    constructor(options = { }) {
        super(options);

        if (options.w3m) {
            OverlayImage.w3mdisplay = options.w3m;
        }

        if (is.nil(OverlayImage.hasW3MDisplay)) {
            if (adone.std.fs.existsSync(OverlayImage.w3mdisplay)) {
                OverlayImage.hasW3MDisplay = true;
            } else if (options.search !== false) {
                const file = helpers.findFile("/usr", "w3mimgdisplay")
                    || helpers.findFile("/lib", "w3mimgdisplay")
                    || helpers.findFile("/bin", "w3mimgdisplay");
                if (file) {
                    OverlayImage.hasW3MDisplay = true;
                    OverlayImage.w3mdisplay = file;
                } else {
                    OverlayImage.hasW3MDisplay = false;
                }
            }
        }

        this.on("hide", () => {
            this._lastFile = this.file;
            this.clearImage();
        });

        this.on("show", () => {
            if (!this._lastFile) {
                return; 
            }
            this.setImage(this._lastFile);
        });

        this.on("detach", () => {
            this._lastFile = this.file;
            this.clearImage();
        });

        this.on("attach", () => {
            if (!this._lastFile) {
                return; 
            }
            this.setImage(this._lastFile);
        });

        this.onScreenEvent("resize", () => {
            this._needsRatio = true;
        });

        // Get images to overlap properly. Maybe not worth it:
        // this.onScreenEvent('render', function() {
        //   this.screen.program.flush();
        //   if (!this._noImage) return;
        //   function display(el, next) {
        //     if (el.type === 'w3mimage' && el.file) {
        //       el.setImage(el.file, next);
        //     } else {
        //       next();
        //     }
        //   }
        //   function done(el) {
        //     el.children.forEach(recurse);
        //   }
        //   function recurse(el) {
        //     display(el, function() {
        //       var pending = el.children.length;
        //       el.children.forEach(function(el) {
        //         display(el, function() {
        //           if (!--pending) done(el);
        //         });
        //       });
        //     });
        //   }
        //   recurse(this.screen);
        // });

        this.onScreenEvent("render", () => {
            this.screen.program.flush();
            if (!this._noImage) {
                this.setImage(this.file);
            }
        });

        if (this.options.file || this.options.img) {
            this.setImage(this.options.file || this.options.img);
        }
    }

    spawn(file, args, opt, callback) {
        const spawn = require("child_process").spawn;
        let ps;

        opt = opt || {};
        ps = spawn(file, args, opt);

        ps.on("error", (err) => {
            if (!callback) {
                return; 
            }
            return callback(err);
        });

        ps.on("exit", (code) => {
            if (!callback) {
                return;
            }
            if (code !== 0) {
                return callback(new Error(`Exit Code: ${code}`));
            }
            return callback(null, code === 0);
        });

        return ps;
    }

    setImage(img, callback) {
        if (this._settingImage) {
            this._queue = this._queue || [];
            this._queue.push([img, callback]);
            return;
        }
        this._settingImage = true;

        const reset = () => {
            this._settingImage = false;
            this._queue = this._queue || [];
            const item = this._queue.shift();
            if (item) {
                this.setImage(item[0], item[1]);
            }
        };

        if (OverlayImage.hasW3MDisplay === false) {
            reset();
            if (!callback) {
                return; 
            }
            return callback(new Error("W3M Image Display not available."));
        }

        if (!img) {
            reset();
            if (!callback) {
                return; 
            }
            return callback(new Error("No image."));
        }

        this.file = img;

        return this.getPixelRatio((err, ratio) => {
            if (err) {
                reset();
                if (!callback) {
                    return; 
                }
                return callback(err);
            }

            return this.renderImage(img, ratio, (err, success) => {
                if (err) {
                    reset();
                    if (!callback) {
                        return;
                    }
                    return callback(err);
                }

                if (this.shrink || this.options.autofit) {
                    delete this.shrink;
                    delete this.options.shrink;
                    this.options.autofit = true;
                    return this.imageSize((err, size) => {
                        if (err) {
                            reset();
                            if (!callback) {
                                return;
                            }
                            return callback(err);
                        }

                        if (this._lastSize
                            && ratio.tw === this._lastSize.tw
                            && ratio.th === this._lastSize.th
                            && size.width === this._lastSize.width
                            && size.height === this._lastSize.height
                            && this.aleft === this._lastSize.aleft
                            && this.atop === this._lastSize.atop) {
                            reset();
                            if (!callback) {
                                return; 
                            }
                            return callback(null, success);
                        }

                        this._lastSize = {
                            tw: ratio.tw,
                            th: ratio.th,
                            width: size.width,
                            height: size.height,
                            aleft: this.aleft,
                            atop: this.atop
                        };

                        this.position.width = size.width / ratio.tw | 0;
                        this.position.height = size.height / ratio.th | 0;

                        this._noImage = true;
                        this.screen.render();
                        this._noImage = false;

                        reset();
                        return this.renderImage(img, ratio, callback);
                    });
                }

                reset();
                if (!callback) {
                    return;
                }
                return callback(null, success);
            });
        });
    }

    renderImage(img, ratio, callback) {
        if (adone.std.child_process.execSync) {
            callback = callback || ((err, result) => result);
            try {
                return callback(null, this.renderImageSync(img, ratio));
            } catch (e) {
                return callback(e);
            }
        }

        if (OverlayImage.hasW3MDisplay === false) {
            if (!callback) {
                return;
            }
            return callback(new Error("W3M Image Display not available."));
        }

        if (!ratio) {
            if (!callback) {
                return; 
            }
            return callback(new Error("No ratio."));
        }

        // clearImage unsets these:
        const _file = this.file;
        const _lastSize = this._lastSize;
        return this.clearImage((err) => {
            if (err) {
                return callback(err);
            }

            this.file = _file;
            this._lastSize = _lastSize;

            const opt = {
                stdio: "pipe",
                env: process.env,
                cwd: process.env.HOME
            };

            const ps = this.spawn(OverlayImage.w3mdisplay, [], opt, (err, success) => {
                if (!callback) {
                    return;
                }
                return err
                    ? callback(err)
                    : callback(null, success);
            });

            const width = this.width * ratio.tw | 0;
            const height = this.height * ratio.th | 0;
            const aleft = this.aleft * ratio.tw | 0;
            const atop = this.atop * ratio.th | 0;

            const input = `0;1;${
                aleft};${
                atop};${
                width};${
                height};;;;;${
                img
            }\n4;\n3;\n`;

            this._props = {
                aleft,
                atop,
                width,
                height
            };

            ps.stdin.write(input);
            ps.stdin.end();
        });
    }

    clearImage(callback) {
        if (adone.std.child_process.execSync) {
            callback = callback || ((err, result) => result);
            try {
                return callback(null, this.clearImageSync());
            } catch (e) {
                return callback(e);
            }
        }

        if (OverlayImage.hasW3MDisplay === false) {
            if (!callback) {
                return; 
            }
            return callback(new Error("W3M Image Display not available."));
        }

        if (!this._props) {
            if (!callback) {
                return; 
            }
            return callback(null);
        }

        const opt = {
            stdio: "pipe",
            env: process.env,
            cwd: process.env.HOME
        };

        const ps = this.spawn(OverlayImage.w3mdisplay, [], opt, (err, success) => {
            if (!callback) {
                return;
            }
            return err ? callback(err) : callback(null, success);
        });

        let width = this._props.width + 2;
        let height = this._props.height + 2;
        let aleft = this._props.aleft;
        let atop = this._props.atop;

        if (this._drag) {
            aleft -= 10;
            atop -= 10;
            width += 10;
            height += 10;
        }

        const input = `6;${
            aleft};${
            atop};${
            width};${
            height
        }\n4;\n3;\n`;

        delete this.file;
        delete this._props;
        delete this._lastSize;

        ps.stdin.write(input);
        ps.stdin.end();
    }

    imageSize(callback) {
        const img = this.file;

        if (adone.std.child_process.execSync) {
            callback = callback || ((err, result) => result);
            try {
                return callback(null, this.imageSizeSync());
            } catch (e) {
                return callback(e);
            }
        }

        if (OverlayImage.hasW3MDisplay === false) {
            if (!callback) {
                return;
            }
            return callback(new Error("W3M Image Display not available."));
        }

        if (!img) {
            if (!callback) {
                return;
            }
            return callback(new Error("No image."));
        }

        const opt = {
            stdio: "pipe",
            env: process.env,
            cwd: process.env.HOME
        };

        const ps = this.spawn(OverlayImage.w3mdisplay, [], opt);

        let buf = "";

        ps.stdout.setEncoding("utf8");

        ps.stdout.on("data", (data) => {
            buf += data;
        });

        ps.on("error", (err) => {
            if (!callback) {
                return; 
            }
            return callback(err);
        });

        ps.on("exit", () => {
            if (!callback) {
                return;
            }
            const size = buf.trim().split(/\s+/);
            return callback(null, {
                raw: buf.trim(),
                width: Number(size[0]),
                height: Number(size[1])
            });
        });

        const input = `5;${img}\n`;

        ps.stdin.write(input);
        ps.stdin.end();
    }

    termSize(callback) {
        if (adone.std.child_process.execSync) {
            callback = callback || ((err, result) => result);
            try {
                return callback(null, this.termSizeSync());
            } catch (e) {
                return callback(e);
            }
        }

        if (OverlayImage.hasW3MDisplay === false) {
            if (!callback) {
                return; 
            }
            return callback(new Error("W3M Image Display not available."));
        }

        const opt = {
            stdio: "pipe",
            env: process.env,
            cwd: process.env.HOME
        };

        const ps = this.spawn(OverlayImage.w3mdisplay, ["-test"], opt);

        let buf = "";

        ps.stdout.setEncoding("utf8");

        ps.stdout.on("data", (data) => {
            buf += data;
        });

        ps.on("error", (err) => {
            if (!callback) {
                return;
            }
            return callback(err);
        });

        ps.on("exit", () => {
            if (!callback) {
                return; 
            }

            if (!buf.trim()) {
                // Bug: w3mimgdisplay will sometimes
                // output nothing. Try again:
                return this.termSize(callback);
            }

            const size = buf.trim().split(/\s+/);

            return callback(null, {
                raw: buf.trim(),
                width: Number(size[0]),
                height: Number(size[1])
            });
        });

        ps.stdin.end();
    }

    getPixelRatio(callback) {
        if (adone.std.child_process.execSync) {
            callback = callback || ((err, result) => result);
            try {
                return callback(null, this.getPixelRatioSync());
            } catch (e) {
                return callback(e);
            }
        }

        // XXX We could cache this, but sometimes it's better
        // to recalculate to be pixel perfect.
        if (this._ratio && !this._needsRatio) {
            return callback(null, this._ratio);
        }

        return this.termSize((err, dimensions) => {
            if (err) {
                return callback(err); 
            }

            this._ratio = {
                tw: dimensions.width / this.screen.width,
                th: dimensions.height / this.screen.height
            };

            this._needsRatio = false;

            return callback(null, this._ratio);
        });
    }

    renderImageSync(img, ratio) {
        if (OverlayImage.hasW3MDisplay === false) {
            throw new Error("W3M Image Display not available.");
        }

        if (!ratio) {
            throw new Error("No ratio.");
        }

        // clearImage unsets these:
        const _file = this.file;
        const _lastSize = this._lastSize;

        this.clearImageSync();

        this.file = _file;
        this._lastSize = _lastSize;

        const width = this.width * ratio.tw | 0;
        const height = this.height * ratio.th | 0;
        const aleft = this.aleft * ratio.tw | 0;
        const atop = this.atop * ratio.th | 0;

        const input = `0;1;${
            aleft};${
            atop};${
            width};${
            height};;;;;${
            img
        }\n4;\n3;\n`;

        this._props = {
            aleft,
            atop,
            width,
            height
        };

        try {
            adone.std.child_process.execFileSync(OverlayImage.w3mdisplay, [], {
                env: process.env,
                encoding: "utf8",
                input,
                timeout: 1000
            });
        } catch (e) {

        }

        return true;
    }

    clearImageSync() {
        if (OverlayImage.hasW3MDisplay === false) {
            throw new Error("W3M Image Display not available.");
        }

        if (!this._props) {
            return false;
        }

        let width = this._props.width + 2;
        let height = this._props.height + 2;
        let aleft = this._props.aleft;
        let atop = this._props.atop;

        if (this._drag) {
            aleft -= 10;
            atop -= 10;
            width += 10;
            height += 10;
        }

        const input = `6;${
            aleft};${
            atop};${
            width};${
            height
        }\n4;\n3;\n`;

        delete this.file;
        delete this._props;
        delete this._lastSize;

        try {
            adone.std.child_process.execFileSync(OverlayImage.w3mdisplay, [], {
                env: process.env,
                encoding: "utf8",
                input,
                timeout: 1000
            });
        } catch (e) {

        }

        return true;
    }

    imageSizeSync() {
        const img = this.file;

        if (OverlayImage.hasW3MDisplay === false) {
            throw new Error("W3M Image Display not available.");
        }

        if (!img) {
            throw new Error("No image.");
        }

        let buf = "";
        const input = `5;${img}\n`;

        try {
            buf = adone.std.child_process.execFileSync(OverlayImage.w3mdisplay, [], {
                env: process.env,
                encoding: "utf8",
                input,
                timeout: 1000
            });
        } catch (e) { }

        const size = buf.trim().split(/\s+/);

        return {
            raw: buf.trim(),
            width: Number(size[0]),
            height: Number(size[1])
        };
    }

    termSizeSync(_, recurse) {
        if (OverlayImage.hasW3MDisplay === false) {
            throw new Error("W3M Image Display not available.");
        }

        let buf = "";

        try {
            buf = adone.std.child_process.execFileSync(OverlayImage.w3mdisplay, ["-test"], {
                env: process.env,
                encoding: "utf8",
                timeout: 1000
            });
        } catch (e) {

        }

        if (!buf.trim()) {
            // Bug: w3mimgdisplay will sometimes
            // output nothing. Try again:
            recurse = recurse || 0;
            if (++recurse === 5) {
                throw new Error("Term size not determined.");
            }
            return this.termSizeSync(_, recurse);
        }

        const size = buf.trim().split(/\s+/);

        return {
            raw: buf.trim(),
            width: Number(size[0]),
            height: Number(size[1])
        };
    }

    getPixelRatioSync() {
        // XXX We could cache this, but sometimes it's better
        // to recalculate to be pixel perfect.
        if (this._ratio && !this._needsRatio) {
            return this._ratio;
        }
        this._needsRatio = false;

        const dimensions = this.termSizeSync();

        this._ratio = {
            tw: dimensions.width / this.screen.width,
            th: dimensions.height / this.screen.height
        };

        return this._ratio;
    }

    displayImage(callback) {
        return this.screen.displayImage(this.file, callback);
    }
}
OverlayImage.prototype.type = "overlayimage";
OverlayImage.w3mdisplay = "/usr/lib/w3m/w3mimgdisplay";
