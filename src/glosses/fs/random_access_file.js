
const { is, fs, std: { path, constants: c }, x } = adone;

export default class RandomAccessFile extends adone.EventEmitter {
    constructor(filename, options) {
        super();

        if (options.cwd) {
            filename = path.resolve(options.cwd, filename);
        }
        this.filename = filename;
        this.fd = 0;
        this.readable = options.readable === true;
        this.writable = options.writable === true;
        this.appendable = options.appendable === true;
        this.mtime = options.mtime;
        this.atime = options.atime;
        this.length = 0;
    }

    async read(length, offset = null) {
        if (!this.readable) {
            throw new x.IllegalState("File is not readable");
        }

        const buf = Buffer.alloc(length);
        let bytes = 0;
        for ( ; length > 0; ) {
            if (!this.fd) {
                throw new x.IllegalState("File is closed");
            }
            // eslint-disable-next-line
            bytes = await fs.fd.read(this.fd, buf, buf.length - length, length, offset);
            if (bytes === 0) {
                throw new x.IllegalState("Could not satisfy length");
            }
            if (is.number(offset)) {
                offset += bytes;
            }
            length -= bytes;
        }
        return buf;
    }

    async write(buf, offset = null) {
        if (!this.writable) {
            throw new x.IllegalState("File is not writable");
        }

        let length = buf.length;
        let bytes = 0;
        for ( ; length > 0; ) {
            if (!this.fd) {
                throw new x.IllegalState("File is closed");
            }
            // eslint-disable-next-line
            bytes = await fs.fd.write(this.fd, buf, buf.length - length, length, offset);
            length -= bytes;
            if (is.number(offset)) {
                offset += bytes;
            }
        }

        if (!is.number(offset)) {
            offset = await fs.fd.seek(this.fd, 0, 1);
        }
        if (offset > this.length) {
            this.length = offset;
        }
        return bytes;
    }

    async close() {
        if (!this.fd) {
            return;
        }
        await fs.fd.close(this.fd);
        this.fd = 0;
        this.emit("close");
    }

    async end(opts = {}) {
        const atime = opts.atime || this.atime;
        const mtime = opts.mtime || this.mtime;

        if (!atime && !mtime) {
            //
        } else if (atime && mtime) {
            await fs.fd.utimes(this.fd, atime, mtime);
        } else {
            const stats = await fs.fd.stat(this.fd);
            await fs.fd.utimes(this.fd, atime || stats.atime, mtime || stats.mtime);
        }
    }

    async truncate(size) {
        await fs.fd.truncate(this.fd, size);
        this.length = size;
    }

    unlink() {
        return fs.unlink(this.filename);
    }

    _mode() {
        if (this.appendable) {
            if (this.writable && !this.readable) {
                return c.O_APPEND | c.O_CREAT | c.O_WRONLY;
            }
            this.readable = true;
            this.writable = true;
            return c.O_APPEND | c.O_CREAT | c.O_RDWR;
        }
        if (this.readable && this.writable) {
            return c.O_RDWR | c.O_CREAT;
        }
        if (this.writable) {
            return c.O_WRONLY | c.O_CREAT;
        }
        return c.O_RDONLY;
    }

    static async open(filename, options = {}) {
        options.readable = (options.readable !== false);
        options.writable = (options.writable !== false);
        const raf = new RandomAccessFile(filename, options);
        const dir = path.dirname(filename);

        if (dir) {
            await adone.fs.mkdir(dir);
        }

        let fd;
        try {
            fd = await fs.fd.open(filename, raf._mode());
        } catch (err) {
            if (err && err.code === "EACCES" && raf.writable) {
                raf.writable = false;
                fd = await fs.fd.open(filename, raf._mode());
            }
        }

        raf.fd = fd;
        raf.emit("open");

        if (is.number(options.truncate) && options.truncate >= 0) {
            await raf.truncate(options.truncate);
        } else {
            const stats = await fs.fd.stat(fd);
            raf.length = stats.size;
        }

        return raf;
    }
}
