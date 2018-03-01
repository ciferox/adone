const {
    is,
    fs,
    stream: { pull },
    datastore: { utils, Key },
    std: { path }
} = adone;

const { asyncFilter, asyncSort } = utils;


/**
 * A datastore backed by the file system.
 *
 * Keys need to be sanitized before use, as they are written
 * to the file system as is.
 */
export default class FsDatastore {
    constructor(location, options) {
        this.path = path.resolve(location);
        this.options = {
            createIfMissing: true,
            errorIfExists: false,
            extension: ".data",
            ...options
        };
    }

    open() {
        if (this.options.createIfMissing) {
            return this._openOrCreate();
        }
        return this._open();
    }

    /**
     * Check if the path actually exists.
     * @private
     * @returns {void}
     */
    async _open() {
        if (!(await fs.exists(this.path))) {
            throw new Error(`Datastore directory ${this.path} does not exist`);
        }

        if (this.options.errorIfExists) {
            throw new Error(`Datastore directory ${this.path} already exists`);
        }
    }

    /**
     * Create the directory to hold our data.
     *
     * @private
     * @returns {void}
     */
    _create() {
        return fs.mkdirp(this.path);
    }

    /**
     * Tries to open, and creates if the open fails.
     *
     * @private
     * @returns {void}
     */
    async _openOrCreate() {
        try {
            await this._open();
        } catch (err) {
            if (err.message.match("does not exist")) {
                await this._create();
                return;
            }

            throw err;
        }
    }

    /**
     * Calculate the directory and file name for a given key.
     *
     * @private
     * @param {Key} key
     * @returns {{string, string}}
     */
    _encode(key) {
        const parent = key.parent().toString();
        const dir = path.join(this.path, parent);
        const name = key.toString().slice(parent.length);
        const file = path.join(dir, name + this.options.extension);

        return {
            dir,
            file
        };
    }

    /**
     * Calculate the original key, given the file name.
     *
     * @private
     * @param {string} file
     * @returns {Key}
     */
    _decode(file) {
        const ext = this.options.extension;
        if (path.extname(file) !== ext) {
            throw new Error(`Invalid extension: ${path.extname(file)}`);
        }

        const keyname = file
            .slice(this.path.length, -ext.length)
            .split(path.sep)
            .join("/");
        return new Key(keyname);
    }

    /**
     * Write to the file system without extension.
     *
     * @param {Key} key
     * @param {Buffer} val
     * @returns {void}
     */
    async putRaw(key, val) {
        const parts = this._encode(key);
        const file = parts.file.slice(0, -this.options.extension.length);
        await fs.mkdirp(parts.dir);
        await fs.writeFileAtomic(file, val);
    }

    /**
     * Store the given value under the key.
     *
     * @param {Key} key
     * @param {Buffer} val
     * @returns {void}
     */
    async put(key, val) {
        const parts = this._encode(key);
        await fs.mkdirp(parts.dir);
        await fs.writeFileAtomic(parts.file, val);
    }

    /**
     * Read from the file system without extension.
     *
     * @param {Key} key
     * @returns {void}
     */
    getRaw(key) {
        const parts = this._encode(key);
        let file = parts.file;
        file = file.slice(0, -this.options.extension.length);
        return fs.readFile(file);
    }

    /**
     * Read from the file system.
     *
     * @param {Key} key
     * @returns {void}
     */
    get(key) {
        const parts = this._encode(key);
        return fs.readFile(parts.file);
    }

    /**
     * Check for the existence of the given key.
     *
     * @param {Key} key
     */
    async has(key) {
        const parts = this._encode(key);
        try {
            await fs.access(parts.file);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Delete the record under the given key.
     *
     * @param {Key} key
     * @returns {void}
     */
    delete(key) {
        const parts = this._encode(key);
        return fs.unlink(parts.file);
    }

    /**
     * Create a new batch object.
     *
     * @returns {Batch}
     */
    batch() {
        const puts = [];
        const deletes = [];
        return {
            put(key, value) {
                puts.push({ key, value });
            },
            delete(key) {
                deletes.push(key);
            },
            commit: async () => {
                const promises = [];
                for (const p of puts) {
                    promises.push(this.put(p.key, p.value));
                }
                await Promise.all(promises);

                promises.length = 0;
                for (const k of deletes) {
                    promises.push(this.delete(k));
                }
                await Promise.all(promises);
            }
        };
    }

    /**
     * Query the store.
     *
     * @param {Object} q
     * @returns {PullStream}
     */
    async query(q) {
        // glob expects a POSIX path
        const prefix = q.prefix || "**";
        const pattern = path
            .join(this.path, prefix, `*${this.options.extension}`)
            .split(path.sep)
            .join("/");
        let tasks = [pull.values(await fs.glob(pattern))];

        if (!q.keysOnly) {
            tasks.push(pull.asyncMap(async (f, cb) => {
                try {
                    const buf = await fs.readFile(f);
                    cb(null, {
                        key: this._decode(f),
                        value: buf
                    });
                } catch (err) {
                    return cb(err);
                }
            }));
        } else {
            tasks.push(pull.map((f) => ({ key: this._decode(f) })));
        }

        if (!is.nil(q.filters)) {
            tasks = tasks.concat(q.filters.map(asyncFilter));
        }

        if (!is.nil(q.orders)) {
            tasks = tasks.concat(q.orders.map(asyncSort));
        }

        if (!is.nil(q.offset)) {
            let i = 0;
            tasks.push(pull.filter(() => i++ >= q.offset));
        }

        if (!is.nil(q.limit)) {
            tasks.push(pull.take(q.limit));
        }

        return pull.apply(null, tasks);
    }

    close() {
    }
}
