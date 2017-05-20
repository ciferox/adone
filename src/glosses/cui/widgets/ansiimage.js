
const cp = require("child_process");
const colors = require("../colors");
const tng = require("../tng");

export default class ANSIImage extends adone.cui.widget.Element {
    constructor(options = {}) {
        options.shrink = true;
        super(options);

        this.scale = this.options.scale || 1.0;
        this.options.animate = this.options.animate !== false;
        this._noFill = true;

        if (this.options.file) {
            this.setImage(this.options.file);
        }

        this.screen.on("prerender", () => {
            const lpos = this.lpos;
            if (!lpos) {
                return; 
            }
            // prevent image from blending with itthis if there are alpha channels
            this.screen.clearRegion(lpos.xi, lpos.xl, lpos.yi, lpos.yl);
        });

        this.on("destroy", () => {
            this.stop();
        });
    }

    setImage(file) {
        this.file = typeof file === "string" ? file : null;

        if (/^https?:/.test(file)) {
            file = ANSIImage.curl(file);
        }

        let width = this.position.width;
        let height = this.position.height;

        if (width != null) {
            width = this.width;
        }

        if (height != null) {
            height = this.height;
        }

        try {
            this.setContent("");

            this.img = tng(file, {
                colors,
                width,
                height,
                scale: this.scale,
                ascii: this.options.ascii,
                speed: this.options.speed,
                filename: this.file
            });

            if (width == null || height == null) {
                this.width = this.img.cellmap[0].length;
                this.height = this.img.cellmap.length;
            }

            if (this.img.frames && this.options.animate) {
                this.play();
            } else {
                this.cellmap = this.img.cellmap;
            }
        } catch (e) {
            this.setContent(`Image Error: ${e.message}`);
            this.img = null;
            this.cellmap = null;
        }
    }

    play() {
        const self = this;
        if (!this.img) {
            return;
        }
        return this.img.play((bmp, cellmap) => {
            self.cellmap = cellmap;
            self.screen.render();
        });
    }

    pause() {
        if (!this.img) {
            return; 
        }
        return this.img.pause();
    }

    stop() {
        if (!this.img) {
            return;
        }
        return this.img.stop();
    }

    clearImage() {
        this.stop();
        this.setContent("");
        this.img = null;
        this.cellmap = null;
    }

    render() {
        const coords = super.render();
        if (!coords) {
            return; 
        }

        if (this.img && this.cellmap) {
            this.img.renderElement(this.cellmap, this);
        }

        return coords;
    }

    static curl(url) {
        try {
            return cp.execFileSync("curl",
                ["-s", "-A", "", url],
                { stdio: ["ignore", "pipe", "ignore"] });
        } catch (e) { }
        try {
            return cp.execFileSync("wget",
                ["-U", "", "-O", "-", url],
                { stdio: ["ignore", "pipe", "ignore"] });
        } catch (e) { }
        throw new Error("curl or wget failed.");
    }
}
ANSIImage.prototype.type = "ansiimage";
