const { is, std: { crypto, stream: { Writable } } } = adone;

const ERROR_NAMESPACE_NOT_FOUND = 26;

const createChunkDoc = (filesId, n, data) => ({
    _id: new adone.data.bson.ObjectId(),
    files_id: filesId,
    n,
    data
});

const createFilesDoc = (_id, length, chunkSize, md5, filename, contentType, aliases, metadata) => {
    const ret = {
        _id,
        length,
        chunkSize,
        uploadDate: new Date(),
        md5,
        filename
    };

    if (contentType) {
        ret.contentType = contentType;
    }

    if (aliases) {
        ret.aliases = aliases;
    }

    if (metadata) {
        ret.metadata = metadata;
    }

    return ret;
};

export default class GridFSBucketWriteStream extends Writable {
    constructor(bucket, filename, options = {}) {
        super();
        this.bucket = bucket;
        this.chunks = bucket.s._chunksCollection;
        this.filename = filename;
        this.files = bucket.s._filesCollection;
        this.options = options;
        // Signals the write is all done
        this.done = false;

        this.id = options.id ? options.id : new adone.data.bson.ObjectId();
        this.chunkSizeBytes = this.options.chunkSizeBytes;
        this.bufToStore = Buffer.allocUnsafe(this.chunkSizeBytes);
        this.length = 0;
        this.md5 = crypto.createHash("md5");
        this.n = 0;
        this.pos = 0;
        this.state = {
            streamEnd: false,
            outstandingRequests: 0,
            errored: false,
            aborted: false,
            promiseLibrary: this.bucket.s.promiseLibrary
        };

        if (!this.bucket.s.calledOpenUploadStream) {
            this.bucket.s.calledOpenUploadStream = true;

            this._checkIndexes().then(() => {
                this.bucket.s.checkedIndexes = true;
                this.bucket.emit("index");
            }, this.__handleError);
        }
        this.__handleError = (err, cb) => this._handleError(err, cb);
    }

    _handleError(error, callback) {
        if (this.state.errored) {
            return;
        }
        this.state.errored = true;
        if (callback) {
            return callback(error);
        }
        this.emit("error", error);
    }


    _getWriteOptions() {
        const obj = {};
        if (this.options.writeConcern) {
            obj.w = this.options.writeConcern.w;
            obj.wtimeout = this.options.writeConcern.wtimeout;
            obj.j = this.options.writeConcern.j;
        }
        return obj;
    }

    async _checkChunksIndex() {
        let indexes;
        try {
            indexes = await this.chunks.listIndexes().toArray();
        } catch (err) {
            if (err.code !== ERROR_NAMESPACE_NOT_FOUND) {
                throw err;
            }
            const index = { files_id: 1, n: 1 };
            await this.chunks.createIndex(index, { background: false, unique: true });
            return;
        }
        for (const index of indexes) {
            if (index.key) {
                const keys = Object.keys(index.key);
                if (keys.length === 2 && index.key.files_id === 1 && index.key.n === 1) {
                    // has chunk index
                    return;
                }
            }
        }
        const index = { files_id: 1, n: 1 };
        const indexOptions = this._getWriteOptions();

        indexOptions.background = false;
        indexOptions.unique = true;

        await this.chunks.createIndex(index, indexOptions);
    }

    async _checkIndexes() {
        const doc = await this.files.findOne({}, { _id: 1 });
        if (doc) {
            return;
        }
        let indexes;
        try {
            indexes = await this.files.listIndexes().toArray();
        } catch (err) {
            if (err.code !== ERROR_NAMESPACE_NOT_FOUND) {
                throw err;
            }
            const index = { filename: 1, uploadDate: 1 };
            await this.files.createIndex(index, { background: false });
            await this._checkChunksIndex();
            return;
        }

        let hasFileIndex;
        for (const index of indexes) {
            const keys = Object.keys(index.key);
            if (keys.length === 2 && index.key.filename === 1 && index.key.uploadDate === 1) {
                hasFileIndex = true;
                break;
            }
        }
        if (!hasFileIndex) {
            const index = { filename: 1, uploadDate: 1 };
            const indexOptions = this._getWriteOptions();
            indexOptions.background = false;
            await this.files.createIndex(index, indexOptions);
        }
        await this._checkChunksIndex();
    }

    _waitForIndexes(callback) {
        if (this.bucket.s.checkedIndexes) {
            return callback(false);
        }

        this.bucket.once("index", () => {
            callback(true);
        });

        return true;
    }

    _checkAborted(callback = adone.noop) {
        if (this.state.aborted) {
            callback(new Error("this stream has been aborted"));
            return true;
        }
        return false;
    }

    _checkDone(callback = adone.noop) {
        if (
            !this.done &&
            this.state.streamEnd &&
            this.state.outstandingRequests === 0 &&
            !this.state.errored
        ) {
            // Set done so we dont' trigger duplicate createFilesDoc
            this.done = true;
            // Create a new files doc
            const filesDoc = createFilesDoc(this.id, this.length, this.chunkSizeBytes,
                this.md5.digest("hex"), this.filename, this.options.contentType,
                this.options.aliases, this.options.metadata);

            if (this._checkAborted(callback)) {
                return false;
            }

            this.files.insert(filesDoc, this._getWriteOptions()).then(() => {
                this.emit("finish", filesDoc);
            }, (err) => this._handleError(err, callback));
            return true;
        }

        return false;
    }

    _doWrite(chunk, encoding, callback = adone.noop) {
        if (this._checkAborted(callback)) {
            return false;
        }

        const inputBuf = is.buffer(chunk) ? chunk : Buffer.from(chunk, encoding);

        this.length += inputBuf.length;

        // Input is small enough to fit in our buffer
        if (this.pos + inputBuf.length < this.chunkSizeBytes) {
            inputBuf.copy(this.bufToStore, this.pos);
            this.pos += inputBuf.length;

            callback && callback();

            // Note that we reverse the typical semantics of write's return value
            // to be compatible with node's `.pipe()` function.
            // True means client can keep writing.
            return true;
        }

        // Otherwise, buffer is too big for current chunk, so we need to flush
        // to MongoDB.
        let inputBufRemaining = inputBuf.length;
        let spaceRemaining = this.chunkSizeBytes - this.pos;
        let numToCopy = Math.min(spaceRemaining, inputBuf.length);
        let outstandingRequests = 0;
        while (inputBufRemaining > 0) {
            const inputBufPos = inputBuf.length - inputBufRemaining;
            inputBuf.copy(this.bufToStore, this.pos, inputBufPos, inputBufPos + numToCopy);
            this.pos += numToCopy;
            spaceRemaining -= numToCopy;
            if (spaceRemaining === 0) {
                this.md5.update(this.bufToStore);
                const doc = createChunkDoc(this.id, this.n, this.bufToStore);
                ++this.state.outstandingRequests;
                ++outstandingRequests;

                if (this._checkAborted(callback)) {
                    return false;
                }

                this.chunks.insert(doc, this._getWriteOptions()).then(() => {
                    --this.state.outstandingRequests;
                    --outstandingRequests;
                    if (!outstandingRequests) {
                        this.emit("drain", doc);
                        callback();
                        this._checkDone();
                    }
                }, this.__handleError);

                spaceRemaining = this.chunkSizeBytes;
                this.pos = 0;
                ++this.n;
            }
            inputBufRemaining -= numToCopy;
            numToCopy = Math.min(spaceRemaining, inputBufRemaining);
        }

        // Note that we reverse the typical semantics of write's return value
        // to be compatible with node's `.pipe()` function.
        // False means the client should wait for the 'drain' event.
        return false;
    }

    write(chunk, encoding, callback) {
        return this._waitForIndexes(() => {
            return this._doWrite(chunk, encoding, callback);
        });
    }

    async abort() {
        if (this.state.streamEnd) {
            throw new Error("Cannot abort a stream that has already completed");
        }
        if (this.state.aborted) {
            throw new Error("Cannot call abort() on a stream twice");
        }
        this.state.aborted = true;
        await this.chunks.deleteMany({ files_id: this.id });
    }

    _writeRemnant(callback) {
        // Buffer is empty, so don't bother to insert
        if (this.pos === 0) {
            return this._checkDone(callback);
        }

        ++this.state.outstandingRequests;

        // Create a new buffer to make sure the buffer isn't bigger than it needs
        // to be.
        const remnant = Buffer.allocUnsafe(this.pos);
        this.bufToStore.copy(remnant, 0, 0, this.pos);
        this.md5.update(remnant);
        const doc = createChunkDoc(this.id, this.n, remnant);

        // If the stream was aborted, do not write remnant
        if (this._checkAborted(callback)) {
            return false;
        }

        this.chunks.insert(doc, this._getWriteOptions()).then(() => {
            --this.state.outstandingRequests;
            this._checkDone();
        }, this.__handleError);
    }

    end(chunk, encoding, callback) {
        if (is.function(chunk)) {
            [callback, chunk, encoding] = [chunk, undefined, undefined];
        } else if (is.function(encoding)) {
            [callback, encoding] = [encoding, undefined];
        }

        if (this._checkAborted(callback)) {
            return;
        }
        this.state.streamEnd = true;

        if (callback) {
            this.once("finish", (result) => {
                callback(null, result);
            });
        }

        if (!chunk) {
            this._waitForIndexes(() => {
                this._writeRemnant(callback);
            });
            return;
        }

        this.write(chunk, encoding, () => {
            this._writeRemnant(callback);
        });
    }
}
