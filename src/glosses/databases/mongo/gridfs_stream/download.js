const { is, std: { stream: { Readable } } } = adone;

export default class GridFSBucketReadStream extends Readable {
    constructor(chunks, files, readPreference, filter, options) {
        super();
        this.s = {
            bytesRead: 0,
            chunks,
            cursor: null,
            expected: 0,
            files,
            filter,
            init: false,
            expectedEnd: 0,
            file: null,
            options,
            readPreference
        };
    }

    _handleStartOption(doc, options) {
        if (options && !is.nil(options.start)) {
            if (options.start > doc.length) {
                throw new Error(`Stream start (${options.start}) must not be more than the length of the file (${doc.length})`);
            }
            if (options.start < 0) {
                throw new Error(`Stream start (${options.start}) must not be negative`);
            }
            if (!is.nil(options.end) && options.end < options.start) {
                throw new Error(`Stream start (${options.start}) must not be greater than stream end (${options.end})`);
            }

            this.s.bytesRead = Math.floor(options.start / doc.chunkSize) *
                doc.chunkSize;
            this.s.expected = Math.floor(options.start / doc.chunkSize);

            return options.start - this.s.bytesRead;
        }
    }

    _handleEndOption(doc, cursor, options) {
        if (options && !is.nil(options.end)) {
            if (options.end > doc.length) {
                throw new Error(`Stream end (${options.end}) must not be more than the length of the file (${doc.length})`);
            }
            if (options.start < 0) {
                throw new Error(`Stream end (${options.end}) must not be negative`);
            }

            const start = !is.nil(options.start) ?
                Math.floor(options.start / doc.chunkSize) :
                0;

            cursor.limit(Math.ceil(options.end / doc.chunkSize) - start);

            this.s.expectedEnd = Math.ceil(options.end / doc.chunkSize);

            return (Math.ceil(options.end / doc.chunkSize) * doc.chunkSize) -
                options.end;
        }
    }

    _handleError(error) {
        this.emit("error", error);
    }

    _init() {
        const findOneOptions = {};
        if (this.s.readPreference) {
            findOneOptions.readPreference = this.s.readPreference;
        }
        if (this.s.options && this.s.options.sort) {
            findOneOptions.sort = this.s.options.sort;
        }
        if (this.s.options && this.s.options.skip) {
            findOneOptions.skip = this.s.options.skip;
        }

        this.s.files.findOne(this.s.filter, findOneOptions, (error, doc) => {
            if (error) {
                return this._handleError(error);
            }
            if (!doc) {
                const identifier = this.s.filter._id ?
                    this.s.filter._id.toString() : this.s.filter.filename;
                const errmsg = `FileNotFound: file ${identifier} was not found`;
                const err = new Error(errmsg);
                err.code = "ENOENT";
                return this._handleError(err);
            }

            // If document is empty, kill the stream immediately and don't
            // execute any reads
            if (doc.length <= 0) {
                this.push(null);
                return;
            }

            if (this.destroyed) {
                // If user destroys the stream before we have a cursor, wait
                // until the query is done to say we're 'closed' because we can't
                // cancel a query.
                this.emit("close");
                return;
            }
            this.s.bytesToSkip = this._handleStartOption(doc, this.s.options);

            const filter = { files_id: doc._id };

            // Currently (MongoDB 3.4.4) skip function does not support the index,
            // it needs to retrieve all the documents first and then skip them. (CS-25811)
            // As work around we use $gte on the "n" field.
            if (this.s.options && !is.nil(this.s.options.start)) {
                const skip = Math.floor(this.s.options.start / doc.chunkSize);
                if (skip > 0) {
                    filter.n = { $gte: skip };
                }
            }
            this.s.cursor = this.s.chunks.find(filter).sort({ n: 1 });

            if (this.s.readPreference) {
                this.s.cursor.setReadPreference(this.s.readPreference);
            }

            this.s.expectedEnd = Math.ceil(doc.length / doc.chunkSize);
            this.s.file = doc;
            this.s.bytesToTrim = this._handleEndOption(doc, this.s.cursor, this.s.options);
            this.emit("file", doc);
        });
    }

    _waitForFile(callback) {
        if (this.s.file) {
            return callback();
        }

        if (!this.s.init) {
            this._init();
            this.s.init = true;
        }

        this.once("file", () => {
            callback();
        });
    }

    _doRead() {
        if (this.destroyed) {
            return;
        }

        this.s.cursor.next((error, doc) => {
            if (this.destroyed) {
                return;
            }
            if (error) {
                return this._handleError(error);
            }
            if (!doc) {
                this.push(null);
                return this.s.cursor.close((error) => {
                    if (error) {
                        return this._handleError(error);
                    }
                    this.emit("close");
                });
            }

            const bytesRemaining = this.s.file.length - this.s.bytesRead;
            const expectedN = this.s.expected++;
            const expectedLength = Math.min(this.s.file.chunkSize,
                bytesRemaining);

            let errmsg;

            if (doc.n > expectedN) {
                errmsg = `ChunkIsMissing: Got unexpected n: ${doc.n}, expected: ${expectedN}`;
                return this._handleError(new Error(errmsg));
            }

            if (doc.n < expectedN) {
                errmsg = `ExtraChunk: Got unexpected n: ${doc.n}, expected: ${expectedN}`;
                return this._handleError(new Error(errmsg));
            }

            if (doc.data.length() !== expectedLength) {
                if (bytesRemaining <= 0) {
                    errmsg = `ExtraChunk: Got unexpected n: ${doc.n}`;
                    return this._handleError(new Error(errmsg));
                }

                errmsg = `ChunkIsWrongSize: Got unexpected length: ${
                    doc.data.length()}, expected: ${expectedLength}`;
                return this._handleError(new Error(errmsg));
            }

            this.s.bytesRead += doc.data.length();

            if (doc.data.buffer.length === 0) {
                return this.push(null);
            }

            let sliceStart = null;
            let sliceEnd = null;
            let buf = doc.data.buffer;

            if (!is.nil(this.s.bytesToSkip)) {
                sliceStart = this.s.bytesToSkip;
                this.s.bytesToSkip = 0;
            }

            if (expectedN === this.s.expectedEnd && !is.nil(this.s.bytesToTrim)) {
                sliceEnd = this.s.bytesToTrim;
            }

            // If the remaining amount of data left is < chunkSize read the right amount of data
            if (this.s.options.end && (
                (this.s.options.end - this.s.bytesToSkip) < doc.data.length()
            )) {
                sliceEnd = (this.s.options.end - this.s.bytesToSkip);
            }

            if (!is.nil(sliceStart) || !is.nil(sliceEnd)) {
                buf = buf.slice(sliceStart || 0, sliceEnd || buf.length);
            }

            this.push(buf);
        });
    }

    _read() {
        if (this.destroyed) {
            return;
        }

        this._waitForFile(() => {
            this._doRead();
        });
    }

    _throwIfInitialized() {
        if (this.s.init) {
            throw new Error("You cannot change options after the stream has entered flowing mode!");
        }
    }

    start(start) {
        this._throwIfInitialized();
        this.s.options.start = start;
        return this;
    }

    end(end) {
        this._throwIfInitialized();
        this.s.options.end = end;
        return this;
    }

    abort(callback) {
        this.push(null);
        this.destroyed = true;
        if (this.s.cursor) {
            this.s.cursor.close((error) => {
                this.emit("close");
                callback && callback(error);
            });
        } else {
            if (!this.s.init) {
                // If not initialized, fire close event because we will never
                // get a cursor
                this.emit("close");
            }
            callback && callback();
        }
    }
}
