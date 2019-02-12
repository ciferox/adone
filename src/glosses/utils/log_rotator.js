const {
    is,
    event,
    util,
    fs,
    std,
    error,
    compressor,
    noop
} = adone;

/**
 * Represents a log file rotator.
 */
export default class LogRotator extends event.Emitter {
    /**
     * @param {string | number} target filepath
     * @param {number} checkInterval rotator reads file's stats with this delay
     * @param {number} maxFiles maximum number of files at time
     * @param {number | string} maxSize maximum size of the file that triggers rotation
     * @param {boolean} compress compress old log files with gz
     */
    constructor(target, {
        checkInterval = 60000,
        maxSize = 10 * 1024 * 1024,
        maxFiles = 10,
        compress = true
    }) {
        super();
        this.target = target;
        this.checkInterval = util.parseTime(checkInterval);
        this.maxSize = util.parseSize(maxSize);

        if (!this.checkInterval) {
            throw new error.InvalidArgumentException("invalid checkInterval");
        }

        if (!this.maxSize) {
            throw new error.InvalidArgumentException("invalid maxSize");
        }

        this.maxFiles = maxFiles;
        this.compress = compress;
        this.__check = this._check.bind(this);
        this._stopped = true;
        this._rotating = false;
        this._dirname = std.path.dirname(this.target);
        this._basename = std.path.basename(this.target);
    }

    /**
     * Returns filepath for a file with the given index
     */
    _getFilePath(index) {
        let path = std.path.resolve(this._dirname, `${this._basename}.${index}`);
        if (this.compress) {
            path += ".gz";
        }
        return path;
    }

    /**
     * Completes a rotate iteration
     */
    async rotate() {
        this._rotating = true;
        let fd = null;
        try {
            /**
             * Rotate previous files and delete the oldest one
             */
            for (let i = this.maxFiles - 1; i >= 0; --i) {
                const a = this._getFilePath(i);
                if (i === this.maxFiles - 1) {
                    // eslint-disable-next-line no-await-in-loop
                    await fs.unlink(a).catch(noop);
                } else {
                    const b = this._getFilePath(i + 1);
                    // eslint-disable-next-line no-await-in-loop
                    await fs.rename(a, b).catch(noop);
                }
            }

            /**
             * Write the current file as the earliest file
             */
            fd = await fs.open(this.target, "r+");
            let src = fs.createReadStream(null, {
                fd,
                autoClose: false
            });
            if (this.compress) {
                src = src.pipe(compressor.gz.compressStream());
            }
            const dst = src.pipe(fs.createWriteStream(this._getFilePath(0)));
            await new Promise((resolve, reject) => {
                dst.once("finish", resolve).once("error", reject);
            });

            /**
             * Truncate the target
             */
            await fs.ftruncate(fd, 0);

            await fs.close(fd);
            fd = null;
        } catch (err) {
            this.emit("rotateError", err);
        } finally {
            if (!is.null(fd)) {
                await fs.close(fd);
            }
            this._rotating = false;
        }
    }

    /**
     * Checks if the target needs to be rotated and initiates rotation if it does
     */
    async _check() {
        if (this._stopped) {
            return;
        }
        if (!this._rotating) {
            let stat;
            try {
                stat = await fs.stat(this.target);
            } catch (err) {
                this.emit("checkError", err);
                return;
            }
            if (stat.size >= this.maxSize) {
                this.rotate();
            }
        }
        this._timeout = setTimeout(this.__check, this.checkInterval);
    }

    /**
     * Starts checking using the given interval, the first check is completed on the next tick
     */
    start() {
        this._stopped = false;
        process.nextTick(this.__check);
    }

    /**
     * Stops checking
     */
    stop() {
        this._stopped = true;
        clearTimeout(this._timeout);
    }
}
