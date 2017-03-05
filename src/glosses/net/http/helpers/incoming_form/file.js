import adone from "adone";
const { std: { crypto, fs }, EventEmitter, is } = adone;

export default class File extends EventEmitter {
    constructor(properties) {
        super();
        this.size = 0;
        this.path = null;
        this.name = null;
        this.type = null;
        this.hash = null;
        this.lastModifiedDate = null;

        this._writeStream = null;

        for (const key in properties) {
            this[key] = properties[key];
        }

        if (is.string(this.hash)) {
            this.hash = crypto.createHash(properties.hash);
        } else {
            this.hash = null;
        }
    }

    open() {
        this._writeStream = new fs.WriteStream(this.path);
    }

    toJSON() {
        const json = {
            size: this.size,
            path: this.path,
            name: this.name,
            type: this.type,
            mtime: this.lastModifiedDate,
            length: this.length,
            filename: this.filename,
            mime: this.mime
        };
        if (this.hash && this.hash !== "") {
            json.hash = this.hash;
        }
        return json;
    }

    write(buffer, cb) {
        const self = this;
        if (self.hash) {
            self.hash.update(buffer);
        }
        this._writeStream.write(buffer, () => {
            self.lastModifiedDate = new Date();
            self.size += buffer.length;
            self.emit("progress", self.size);
            if (cb) {
                cb();
            }
        });
    }

    end(cb) {
        const self = this;
        if (self.hash) {
            self.hash = self.hash.digest("hex");
        }
        this._writeStream.end(() => {
            self.emit("end");
            if (cb) {
                cb();
            }
        });
    }
}
