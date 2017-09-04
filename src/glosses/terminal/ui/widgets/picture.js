
const pictureTube = require("picture-tube");
const fs = adone.std.fs;
const streams = require("memory-streams");
const MemoryStream = require("memorystream");

export default class Picture extends adone.terminal.ui.widget.Element {
    constructor(options) {
        super(options);
        options.cols = options.cols || 50;
        if (options.file || options.base64) {
            this.setImage(options);
        }
    }

    setImage(options) {
        const tube = pictureTube({ cols: options.cols });

        if (options.file) {
            fs.createReadStream(options.file).pipe(tube); 
        } else if (options.base64) {
            const memStream = new MemoryStream();
            memStream.pipe(tube);
            const buf = new Buffer(options.base64, "base64");
            memStream.write(buf);
            memStream.end();
        }

        this.writer = new streams.WritableStream();
        tube.pipe(this.writer);

        tube.on("end", () => {
            if (options.onReady) {
                options.onReady();
            }
        });
    }

    render() {
        this.setContent(this.writer.toString());
        return super.render();
    }

    getOptionsPrototype() {
        return {
            base64: "AAAA",
            cols: 1
        };
    }
}
Picture.prototype.type = "picture";
