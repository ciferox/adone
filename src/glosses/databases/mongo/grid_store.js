const { is, database: { mongo }, std: { fs, stream: { Duplex } } } = adone;
const { __, ObjectId, MongoError, ReadPreference } = mongo;
const { metadata, utils: { shallowClone } } = __;
const { classMethod, staticMethod } = metadata;

const REFERENCE_BY_FILENAME = 0;
const REFERENCE_BY_ID = 1;

const _setWriteConcernHash = (options) => {
    const finalOptions = {};
    if (!is.nil(options.w)) {
        finalOptions.w = options.w;
    }
    if (options.journal === true) {
        finalOptions.j = options.journal;
    }
    if (options.j === true) {
        finalOptions.j = options.j;
    }
    if (options.fsync === true) {
        finalOptions.fsync = options.fsync;
    }
    if (!is.nil(options.wtimeout)) {
        finalOptions.wtimeout = options.wtimeout;
    }
    return finalOptions;
};

const _getWriteConcern = (self, options) => {
    // Final options
    let finalOptions = { w: 1 };
    options = options || {};

    // Local options verification
    if (!is.nil(options.w) || is.boolean(options.j) || is.boolean(options.journal) || is.boolean(options.fsync)) {
        finalOptions = _setWriteConcernHash(options);
    } else if (is.object(options.safe)) {
        finalOptions = _setWriteConcernHash(options.safe);
    } else if (is.boolean(options.safe)) {
        finalOptions = { w: (options.safe ? 1 : 0) };
    } else if (
        !is.nil(self.options.w) ||
        is.boolean(self.options.j) ||
        is.boolean(self.options.journal) ||
        is.boolean(self.options.fsync)
    ) {
        finalOptions = _setWriteConcernHash(self.options);
    } else if (
        self.safe &&
        (
            !is.nil(self.safe.w) ||
            is.boolean(self.safe.j) ||
            is.boolean(self.safe.journal) ||
            is.boolean(self.safe.fsync))
    ) {
        finalOptions = _setWriteConcernHash(self.safe);
    } else if (is.boolean(self.safe)) {
        finalOptions = { w: (self.safe ? 1 : 0) };
    }

    // Ensure we don't have an invalid combination of write concerns
    if (
        finalOptions.w < 1 &&
        (finalOptions.journal === true || finalOptions.j === true || finalOptions.fsync === true)
    ) {
        throw MongoError.create({
            message: "No acknowledgement using w < 1 cannot be combined with journal:true or fsync:true",
            driver: true
        });
    }

    // Return the options
    return finalOptions;
};

class GridStoreStream extends Duplex {
    constructor(gs) {
        super();

        // Get the gridstore
        this.gs = gs;

        // End called
        this.endCalled = false;

        // If we have a seek
        this.totalBytesToRead = this.gs.length - this.gs.position;
        this.seekPosition = this.gs.position;
    }

    pipe(destination) {
        if (!this.gs.isOpen) {
            this.gs.open((err) => {
                if (err) {
                    return this.emit("error", err);
                }
                this.totalBytesToRead = this.gs.length - this.gs.position;
                super.pipe(destination);
            });
        } else {
            this.totalBytesToRead = this.gs.length - this.gs.position;
            super.pipe(destination);
        }

        return destination;
    }

    __read(length) {
        this.gs.read(length, (err, buffer) => {
            if (err && !this.endCalled) {
                return this.emit("error", err);
            }

            // Stream is closed
            if (this.endCalled || is.nil(buffer)) {
                return this.push(null);
            }
            // Remove bytes read
            if (buffer.length <= this.totalBytesToRead) {
                this.totalBytesToRead = this.totalBytesToRead - buffer.length;
                this.push(buffer);
            } else if (buffer.length > this.totalBytesToRead) {
                this.totalBytesToRead = this.totalBytesToRead - buffer._index;
                this.push(buffer.slice(0, buffer._index));
            }

            // Finished reading
            if (this.totalBytesToRead <= 0) {
                this.endCalled = true;
            }
        });
    }

    _read() {
        // Set read length
        const length = this.gs.length < this.gs.chunkSize ? this.gs.length - this.seekPosition : this.gs.chunkSize;
        if (!this.gs.isOpen) {
            this.gs.open((err) => {
                this.totalBytesToRead = this.gs.length - this.gs.position;
                if (err) {
                    return this.emit("error", err);
                }
                this.__read(length);
            });
        } else {
            this.__read(length);
        }
    }

    destroy() {
        this.pause();
        this.endCalled = true;
        this.gs.close();
        this.emit("end");
    }

    write(chunk) {
        if (this.endCalled) {
            return this.emit("error", MongoError.create({
                message: "attempting to write to stream after end called",
                driver: true
            }));
        }
        // Do we have to open the gridstore
        if (!this.gs.isOpen) {
            this.gs.open(() => {
                this.gs.isOpen = true;
                this.gs.write(chunk, () => {
                    process.nextTick(() => {
                        this.emit("drain");
                    });
                });
            });
            return false;
        }
        this.gs.write(chunk, () => {
            this.emit("drain");
        });
        return true;
    }

    end(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const chunk = args.length ? args.shift() : null;
        this.endCalled = true;

        if (chunk) {
            this.gs.write(chunk, () => {
                this.gs.close(() => {
                    if (is.function(callback)) {
                        callback();
                    }
                    this.emit("end");
                });
            });
        }

        this.gs.close(() => {
            if (is.function(callback)) {
                callback();
            }
            this.emit("end");
        });
    }
}

@metadata("GridStore", { stream: true })
export default class GridStore {
    constructor(db, id, filename, mode, options) {
        this.db = db;

        // Handle options
        if (is.undefined(options)) {
            options = {};
        }
        // Handle mode
        if (is.undefined(mode)) {
            mode = filename;
            filename = undefined;
        } else if (is.object(mode)) {
            options = mode;
            mode = filename;
            filename = undefined;
        }

        if (id && id._bsontype === "ObjectId") {
            this.referenceBy = REFERENCE_BY_ID;
            this.fileId = id;
            this.filename = filename;
        } else if (is.undefined(filename)) {
            this.referenceBy = REFERENCE_BY_FILENAME;
            this.filename = id;
            if (!is.nil(mode.indexOf("w"))) {
                this.fileId = new ObjectId();
            }
        } else {
            this.referenceBy = REFERENCE_BY_ID;
            this.fileId = id;
            this.filename = filename;
        }

        // Set up the rest
        this.mode = is.nil(mode) ? "r" : mode;
        this.options = options || {};

        // Opened
        this.isOpen = false;

        // Set the root if overridden
        this.root = is.nil(this.options.root) ? GridStore.DEFAULT_ROOT_COLLECTION : this.options.root;
        this.position = 0;
        this.readPreference = this.options.readPreference || db.options.readPreference || ReadPreference.PRIMARY;
        this.writeConcern = _getWriteConcern(db, this.options);
        // Set default chunk size
        this.internalChunkSize = is.nil(this.options.chunkSize) ? __.Chunk.DEFAULT_CHUNK_SIZE : this.options.chunkSize;

        // Get the promiseLibrary
        let promiseLibrary = this.options.promiseLibrary;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // Set the promiseLibrary
        this.promiseLibrary = promiseLibrary;
    }

    get chunkSize() {
        return this.internalChunkSize;
    }

    set chunkSize(value) {
        if (!(this.mode[0] === "w" && this.position === 0 && is.nil(this.uploadDate))) {
            this.internalChunkSize = this.internalChunkSize;
        } else {
            this.internalChunkSize = value;
        }
    }

    get md5() {
        return this.internalMd5;
    }

    get chunkNumber() {
        return this.currentChunk && this.currentChunk.chunkNumber ? this.currentChunk.chunkNumber : null;
    }

    _lastChunkNumber() {
        return Math.floor((this.length ? this.length - 1 : 0) / this.chunkSize);
    }

    __open(options, callback) {
        const collection = this.collection();
        // Create the query
        let query = this.referenceBy === REFERENCE_BY_ID ? { _id: this.fileId } : { filename: this.filename };
        query = is.nil(this.fileId) && is.nil(this.filename) ? null : query;
        options.readPreference = this.readPreference;

        const error = (err) => {
            if (error.err) {
                return;
            }
            callback(error.err = err);
        };

        // Fetch the chunks
        if (!is.nil(query)) {
            // only pass error to callback once
            adone.promise.nodeify(collection.findOne(query, options), (err, doc) => {
                if (err) {
                    return error(err);
                }

                // Check if the collection for the files exists otherwise prepare the new one
                if (!is.nil(doc)) {
                    this.fileId = doc._id;
                    // Prefer a new filename over the existing one if this is a write
                    this.filename = ((this.mode === "r") || (is.nil(this.filename)))
                        ? doc.filename
                        : this.filename;
                    this.contentType = doc.contentType;
                    this.internalChunkSize = doc.chunkSize;
                    this.uploadDate = doc.uploadDate;
                    this.aliases = doc.aliases;
                    this.length = doc.length;
                    this.metadata = doc.metadata;
                    this.internalMd5 = doc.md5;
                } else if (this.mode !== "r") {
                    this.fileId = is.nil(this.fileId) ? new ObjectId() : this.fileId;
                    this.contentType = GridStore.DEFAULT_CONTENT_TYPE;
                    this.internalChunkSize = is.nil(this.internalChunkSize)
                        ? __.Chunk.DEFAULT_CHUNK_SIZE
                        : this.internalChunkSize;
                    this.length = 0;
                } else {
                    this.length = 0;
                    const txtId = this.fileId._bsontype === "ObjectId"
                        ? this.fileId.toHexString()
                        : this.fileId;
                    return error(MongoError.create({
                        message: `file with id ${this.referenceBy === REFERENCE_BY_ID ? txtId : this.filename} not opened for writing`,
                        driver: true
                    }), this);
                }

                // Process the mode of the object
                if (this.mode === "r") {
                    this._nthChunk(0, options, (err, chunk) => {
                        if (err) {
                            return error(err);
                        }
                        this.currentChunk = chunk;
                        this.position = 0;
                        callback(null, this);
                    });
                } else if (this.mode === "w" && doc) {
                    // Delete any existing chunks
                    this._deleteChunks(options, (err) => {
                        if (err) {
                            return error(err);
                        }
                        this.currentChunk = new __.Chunk(this, { n: 0 }, this.writeConcern);
                        this.contentType = is.nil(this.options.content_type)
                            ? this.contentType
                            : this.options.content_type;
                        this.internalChunkSize = is.nil(this.options.chunk_size)
                            ? this.internalChunkSize
                            : this.options.chunk_size;
                        this.metadata = is.nil(this.options.metadata)
                            ? this.metadata
                            : this.options.metadata;
                        this.aliases = is.nil(this.options.aliases)
                            ? this.aliases
                            : this.options.aliases;
                        this.position = 0;
                        callback(null, this);
                    });
                } else if (this.mode === "w") {
                    this.currentChunk = new __.Chunk(this, { n: 0 }, this.writeConcern);
                    this.contentType = is.nil(this.options.content_type)
                        ? this.contentType
                        : this.options.content_type;
                    this.internalChunkSize = is.nil(this.options.chunk_size)
                        ? this.internalChunkSize
                        : this.options.chunk_size;
                    this.metadata = is.nil(this.options.metadata)
                        ? this.metadata
                        : this.options.metadata;
                    this.aliases = is.nil(this.options.aliases)
                        ? this.aliases
                        : this.options.aliases;
                    this.position = 0;
                    callback(null, this);
                } else if (this.mode === "w+") {
                    this._nthChunk(this._lastChunkNumber(), options, (err, chunk) => {
                        if (err) {
                            return error(err);
                        }
                        // Set the current chunk
                        this.currentChunk = is.nil(chunk)
                            ? new __.Chunk(this, { n: 0 }, this.writeConcern)
                            : chunk;
                        this.currentChunk.position = this.currentChunk.data.length();
                        this.metadata = is.nil(this.options.metadata)
                            ? this.metadata
                            : this.options.metadata;
                        this.aliases = is.nil(this.options.aliases)
                            ? this.aliases
                            : this.options.aliases;
                        this.position = this.length;
                        callback(null, this);
                    });
                }
            });
        } else {
            // Write only mode
            this.fileId = is.nil(this.fileId)
                ? new ObjectId()
                : this.fileId;
            this.contentType = GridStore.DEFAULT_CONTENT_TYPE;
            this.internalChunkSize = is.nil(this.internalChunkSize)
                ? __.Chunk.DEFAULT_CHUNK_SIZE
                : this.internalChunkSize;
            this.length = 0;

            // No file exists set up write mode
            if (this.mode === "w") {
                // Delete any existing chunks
                this._deleteChunks(options, (err) => {
                    if (err) {
                        return error(err);
                    }
                    this.currentChunk = new __.Chunk(this, { n: 0 }, this.writeConcern);
                    this.contentType = is.nil(this.options.content_type)
                        ? this.contentType
                        : this.options.content_type;
                    this.internalChunkSize = is.nil(this.options.chunk_size)
                        ? this.internalChunkSize
                        : this.options.chunk_size;
                    this.metadata = is.nil(this.options.metadata)
                        ? this.metadata
                        : this.options.metadata;
                    this.aliases = is.nil(this.options.aliases)
                        ? this.aliases
                        : this.options.aliases;
                    this.position = 0;
                    callback(null, this);
                });
            } else if (this.mode === "w+") {
                this._nthChunk(this._lastChunkNumber(), options, (err, chunk) => {
                    if (err) {
                        return error(err);
                    }
                    // Set the current chunk
                    this.currentChunk = is.nil(chunk)
                        ? new __.Chunk(this, { n: 0 }, this.writeConcern)
                        : chunk;
                    this.currentChunk.position = this.currentChunk.data.length();
                    this.metadata = is.nil(this.options.metadata)
                        ? this.metadata
                        : this.options.metadata;
                    this.aliases = is.nil(this.options.aliases)
                        ? this.aliases
                        : this.options.aliases;
                    this.position = this.length;
                    callback(null, this);
                });
            }
        }
    }

    _open(callback) {
        // Get the write concern
        const writeConcern = _getWriteConcern(this.db, this.options);

        // If we are writing we need to ensure we have the right indexes for md5's
        if ((this.mode === "w" || this.mode === "w+")) {
            // Get files collection
            const collection = this.collection();
            // Put index on filename
            adone.promise.nodeify(collection.ensureIndex([["filename", 1]], writeConcern), () => {
                // Get chunk collection
                const chunkCollection = this.chunkCollection();
                // Make an unique index for compatibility with mongo-cxx-driver:legacy
                const chunkIndexOptions = shallowClone(writeConcern);
                chunkIndexOptions.unique = true;
                // Ensure index on chunk collection
                adone.promise.nodeify(chunkCollection.ensureIndex([["files_id", 1], ["n", 1]], chunkIndexOptions), () => {
                    // Open the connection
                    this.__open(writeConcern, (err, r) => {
                        if (err) {
                            return callback(err);
                        }
                        this.isOpen = true;
                        callback(err, r);
                    });
                });
            });
        } else {
            // Open the gridstore
            this.__open(writeConcern, (err, r) => {
                if (err) {
                    return callback(err);
                }
                this.isOpen = true;
                callback(err, r);
            });
        }
    }

    @classMethod({ callback: true, promise: true })
    open(callback) {
        if (this.mode !== "w" && this.mode !== "w+" && this.mode !== "r") {
            throw MongoError.create({ message: `Illegal mode ${this.mode}`, driver: true });
        }

        // We provided a callback leg
        if (is.function(callback)) {
            return this._open(callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._open((err, store) => {
                if (err) {
                    return reject(err);
                }
                resolve(store);
            });
        });
    }

    @classMethod({ callback: false, promise: false, returns: [Boolean] })
    eof() {
        return this.position === this.length ? true : false;
    }

    _eof(callback) {
        if (this.eof()) {
            callback(null, null);
        } else if (this.currentChunk.eof()) {
            this._nthChunk(this.currentChunk.chunkNumber + 1, (err, chunk) => {
                this.currentChunk = chunk;
                this.position = this.position + 1;
                callback(err, this.currentChunk.getc());
            });
        } else {
            this.position = this.position + 1;
            callback(null, this.currentChunk.getc());
        }
    }

    @classMethod({ callback: true, promise: true })
    getc(callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return this._eof(callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._eof((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    puts(string, callback) {
        const finalString = is.nil(string.match(/\n$/)) ? `${string}\n` : string;
        // We provided a callback leg
        if (is.function(callback)) {
            return this.write(finalString, callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this.write(finalString, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: false, promise: false, returns: [GridStoreStream] })
    stream() {
        return new GridStoreStream(this);
    }

    _writeBuffer(buffer, close, callback) {
        if (is.function(close)) {
            callback = close; close = null;
        }
        const finalClose = is.boolean(close) ? close : false;

        if (this.mode !== "w") {
            callback(MongoError.create({
                message: `file with id ${this.referenceBy === REFERENCE_BY_ID ? this.referenceBy : this.filename} not opened for writing`,
                driver: true
            }), null);
        } else {
            if (this.currentChunk.position + buffer.length >= this.chunkSize) {
                // Write out the current Chunk and then keep writing until we have less data left than a chunkSize left
                // to a new chunk (recursively)
                let previousChunkNumber = this.currentChunk.chunkNumber;
                const leftOverDataSize = this.chunkSize - this.currentChunk.position;
                let firstChunkData = buffer.slice(0, leftOverDataSize);
                let leftOverData = buffer.slice(leftOverDataSize);
                // A list of chunks to write out
                const chunksToWrite = [this.currentChunk.write(firstChunkData)];
                // If we have more data left than the chunk size let's keep writing new chunks
                while (leftOverData.length >= this.chunkSize) {
                    // Create a new chunk and write to it
                    const newChunk = new __.Chunk(this, { n: (previousChunkNumber + 1) }, this.writeConcern);
                    firstChunkData = leftOverData.slice(0, this.chunkSize);
                    leftOverData = leftOverData.slice(this.chunkSize);
                    // Update chunk number
                    previousChunkNumber = previousChunkNumber + 1;
                    // Write data
                    newChunk.write(firstChunkData);
                    // Push chunk to save list
                    chunksToWrite.push(newChunk);
                }

                // Set current chunk with remaining data
                this.currentChunk = new __.Chunk(this, { n: (previousChunkNumber + 1) }, this.writeConcern);
                // If we have left over data write it
                if (leftOverData.length > 0) {
                    this.currentChunk.write(leftOverData);
                }

                // Update the position for the gridstore
                this.position = this.position + buffer.length;
                // Total number of chunks to write
                let numberOfChunksToWrite = chunksToWrite.length;
                const cb = (err) => {
                    if (err) {
                        return callback(err);
                    }

                    numberOfChunksToWrite = numberOfChunksToWrite - 1;

                    if (numberOfChunksToWrite <= 0) {
                        // We care closing the file before returning
                        if (finalClose) {
                            return this.close((err) => {
                                callback(err, this);
                            });
                        }

                        // Return normally
                        return callback(null, this);
                    }
                };
                for (let i = 0; i < chunksToWrite.length; i++) {
                    chunksToWrite[i].save({}, cb);
                }
            } else {
                // Update the position for the gridstore
                this.position = this.position + buffer.length;
                // We have less data than the chunk size just write it and callback
                this.currentChunk.write(buffer);
                // We care closing the file before returning
                if (finalClose) {
                    return this.close((err) => {
                        callback(err, this);
                    });
                }
                // Return normally
                return callback(null, this);
            }
        }
    }

    _writeNormal(data, close, callback) {
        // If we have a buffer write it using the writeBuffer method
        if (is.buffer(data)) {
            return this._writeBuffer(data, close, callback);
        }
        return this._writeBuffer(Buffer.from(data, "binary"), close, callback);
    }

    @classMethod({ callback: true, promise: true })
    write(data, close, callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return this._writeNormal(data, close, callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._writeNormal(data, close, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: false, promise: false })
    destroy() {
        // close and do not emit any more events. queued data is not sent.
        if (!this.writable) {
            return;
        }
        this.readable = false;
        if (this.writable) {
            this.writable = false;
            this._q.length = 0;
            this.emit("close");
        }
    }

    _writeFile(file, callback) {
        if (is.string(file)) {
            fs.open(file, "r", (err, fd) => {
                if (err) {
                    return callback(err);
                }
                this.writeFile(fd, callback);
            });
            return;
        }

        this.open((err, self) => {
            if (err) {
                return callback(err, self);
            }

            fs.fstat(file, (err, stats) => {
                if (err) {
                    return callback(err, self);
                }

                let offset = 0;
                let index = 0;

                // Write a chunk
                const writeChunk = () => {
                    // Allocate the buffer
                    const _buffer = Buffer.alloc(self.chunkSize);
                    // Read the file
                    fs.read(file, _buffer, 0, _buffer.length, offset, (err, bytesRead, data) => {
                        if (err) {
                            return callback(err, self);
                        }

                        offset = offset + bytesRead;

                        // Create a new chunk for the data
                        const chunk = new __.Chunk(self, { n: index++ }, self.writeConcern);
                        chunk.write(data.slice(0, bytesRead), (err, chunk) => {
                            if (err) {
                                return callback(err, self);
                            }

                            chunk.save({}, (err) => {
                                if (err) {
                                    return callback(err, self);
                                }

                                self.position = self.position + bytesRead;

                                // Point to current chunk
                                self.currentChunk = chunk;

                                if (offset >= stats.size) {
                                    fs.close(file);
                                    self.close((err) => {
                                        if (err) {
                                            return callback(err, self);
                                        }
                                        return callback(null, self);
                                    });
                                } else {
                                    return process.nextTick(writeChunk);
                                }
                            });
                        });
                    });
                };

                // Process the first write
                process.nextTick(writeChunk);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    writeFile(file, callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return this._writeFile(file, callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._writeFile(file, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _buildMongoObject(callback) {
        // Calcuate the length
        const mongoObject = {
            _id: this.fileId,
            filename: this.filename,
            contentType: this.contentType,
            length: this.position ? this.position : 0,
            chunkSize: this.chunkSize,
            uploadDate: this.uploadDate,
            aliases: this.aliases,
            metadata: this.metadata
        };

        const md5Command = { filemd5: this.fileId, root: this.root };
        adone.promise.nodeify(this.db.command(md5Command), (err, results) => {
            if (err) {
                return callback(err);
            }

            mongoObject.md5 = results.md5;
            callback(null, mongoObject);
        });
    }

    _close(callback) {
        if (this.mode[0] === "w") {
            // Set up options
            const options = this.writeConcern;

            if (!is.nil(this.currentChunk) && this.currentChunk.position > 0) {
                this.currentChunk.save({}, (err) => {
                    if (err && is.function(callback)) {
                        return callback(err);
                    }

                    this.collection((err, files) => {
                        if (err && is.function(callback)) {
                            return callback(err);
                        }

                        // Build the mongo object
                        if (!is.nil(this.uploadDate)) {
                            this._buildMongoObject((err, mongoObject) => {
                                if (err) {
                                    if (is.function(callback)) {
                                        return callback(err);
                                    } throw err;
                                }

                                adone.promise.nodeify(files.save(mongoObject, options), (err) => {
                                    if (is.function(callback)) {
                                        callback(err, mongoObject);
                                    }
                                });
                            });
                        } else {
                            this.uploadDate = new Date();
                            this._buildMongoObject((err, mongoObject) => {
                                if (err) {
                                    if (is.function(callback)) {
                                        return callback(err);
                                    } throw err;
                                }

                                adone.promise.nodeify(files.save(mongoObject, options), (err) => {
                                    if (is.function(callback)) {
                                        callback(err, mongoObject);
                                    }
                                });
                            });
                        }
                    });
                });
            } else {
                this.collection((err, files) => {
                    if (err && is.function(callback)) {
                        return callback(err);
                    }

                    this.uploadDate = new Date();
                    this._buildMongoObject((err, mongoObject) => {
                        if (err) {
                            if (is.function(callback)) {
                                return callback(err);
                            } throw err;
                        }

                        adone.promise.nodeify(files.save(mongoObject, options), (err) => {
                            if (is.function(callback)) {
                                callback(err, mongoObject);
                            }
                        });
                    });
                });
            }
        } else if (this.mode[0] === "r") {
            if (is.function(callback)) {
                callback(null, null);
            }
        } else {
            if (is.function(callback)) {
                callback(MongoError.create({ message: `Illegal mode ${this.mode}`, driver: true }));
            }
        }
    }

    @classMethod({ callback: true, promise: true })
    close(callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return this._close(callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._close((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: false, returns: [__.Collection] })
    chunkCollection(callback) {
        if (is.function(callback)) {
            return this.db.collection((`${this.root}.chunks`), callback);
        }
        return this.db.collection((`${this.root}.chunks`));
    }

    _deleteChunks(options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        options = options || this.writeConcern;

        if (!is.nil(this.fileId)) {
            adone.promise.nodeify(this.chunkCollection().remove({ files_id: this.fileId }, options), (err) => {
                if (err) {
                    return callback(err, false);
                }
                callback(null, true);
            });
        } else {
            callback(null, true);
        }
    }

    _unlink(callback) {
        this._deleteChunks((err) => {
            if (!is.null(err)) {
                err.message = `at deleteChunks: ${err.message}`;
                return callback(err);
            }

            this.collection((err, collection) => {
                if (!is.null(err)) {
                    err.message = `at collection: ${err.message}`;
                    return callback(err);
                }

                adone.promise.nodeify(collection.remove({ _id: this.fileId }, this.writeConcern), (err) => {
                    callback(err, this);
                });
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    unlink(callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return this._unlink(callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._unlink((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: false, returns: [__.Collection] })
    collection(callback) {
        if (is.function(callback)) {
            this.db.collection(`${this.root}.files`, callback);
        }
        return this.db.collection(`${this.root}.files`);
    }

    _readlines(separator, callback) {
        this.read((err, data) => {
            if (err) {
                return callback(err);
            }

            let items = data.toString().split(separator);
            items = items.length > 0 ? items.splice(0, items.length - 1) : [];
            for (let i = 0; i < items.length; i++) {
                items[i] = items[i] + separator;
            }

            callback(null, items);
        });
    }

    @classMethod({ callback: true, promise: true })
    readlines(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let separator = args.length ? args.shift() : "\n";
        separator = separator || "\n";

        // We provided a callback leg
        if (is.function(callback)) {
            return this._readlines(separator, callback);
        }

        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._readlines(separator, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _rewind(callback) {
        if (this.currentChunk.chunkNumber !== 0) {
            if (this.mode[0] === "w") {
                this._deleteChunks((err) => {
                    if (err) {
                        return callback(err);
                    }
                    this.currentChunk = new __.Chunk(this, { n: 0 }, this.writeConcern);
                    this.position = 0;
                    callback(null, this);
                });
            } else {
                this.currentChunk(0, (err, chunk) => {
                    if (err) {
                        return callback(err);
                    }
                    this.currentChunk = chunk;
                    this.currentChunk.rewind();
                    this.position = 0;
                    callback(null, this);
                });
            }
        } else {
            this.currentChunk.rewind();
            this.position = 0;
            callback(null, this);
        }
    }

    @classMethod({ callback: true, promise: true })
    rewind(callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return this._rewind(callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._rewind((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _nthChunk(chunkNumber, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        options = options || this.writeConcern;
        options.readPreference = this.readPreference;
        // Get the nth chunk
        adone.promise.nodeify(this.chunkCollection().findOne({ files_id: this.fileId, n: chunkNumber }, options), (err, chunk) => {
            if (err) {
                return callback(err);
            }

            const finalChunk = is.nil(chunk) ? {} : chunk;
            callback(null, new __.Chunk(this, finalChunk, this.writeConcern));
        });
    }

    _read(length, buffer, callback) {
        // The data is a c-terminated string and thus the length - 1
        const finalLength = is.nil(length) ? this.length - this.position : length;
        const finalBuffer = is.nil(buffer) ? Buffer.allocUnsafe(finalLength) : buffer;
        // Add a index to buffer to keep track of writing position or apply current index
        finalBuffer._index = !is.nil(buffer) && !is.nil(buffer._index) ? buffer._index : 0;

        if ((this.currentChunk.length() - this.currentChunk.position + finalBuffer._index) >= finalLength) {
            const slice = this.currentChunk.readSlice(finalLength - finalBuffer._index);
            // Copy content to final buffer
            slice.copy(finalBuffer, finalBuffer._index);
            // Update internal position
            this.position = this.position + finalBuffer.length;
            // Check if we don't have a file at all
            if (finalLength === 0 && finalBuffer.length === 0) {
                return callback(MongoError.create({ message: "File does not exist", driver: true }), null);
            }
            // Else return data
            return callback(null, finalBuffer);
        }

        // Read the next chunk
        const slice = this.currentChunk.readSlice(this.currentChunk.length() - this.currentChunk.position);
        // Copy content to final buffer
        slice.copy(finalBuffer, finalBuffer._index);
        // Update index position
        finalBuffer._index += slice.length;

        // Load next chunk and read more
        this._nthChunk(this.currentChunk.chunkNumber + 1, (err, chunk) => {
            if (err) {
                return callback(err);
            }

            if (chunk.length() > 0) {
                this.currentChunk = chunk;
                this.read(length, finalBuffer, callback);
            } else {
                if (finalBuffer._index > 0) {
                    callback(null, finalBuffer);
                } else {
                    callback(MongoError.create({ message: "no chunks found for file, possibly corrupt", driver: true }), null);
                }
            }
        });
    }

    @classMethod({ callback: true, promise: true })
    read(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const length = args.length ? args.shift() : null;
        const buffer = args.length ? args.shift() : null;
        // We provided a callback leg
        if (is.function(callback)) {
            return this._read(length, buffer, callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._read(length, buffer, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    tell(callback) {
        // We provided a callback leg
        if (is.function(callback)) {
            return callback(null, this.position);
        }
        // Return promise
        return new this.promiseLibrary((resolve) => {
            resolve(this.position);
        });
    }

    _seek(position, seekLocation, callback) {
        // Seek only supports read mode
        if (this.mode !== "r") {
            return callback(MongoError.create({ message: "seek is only supported for mode r", driver: true }));
        }

        const seekLocationFinal = is.nil(seekLocation) ? GridStore.IO_SEEK_SET : seekLocation;
        const finalPosition = position;
        let targetPosition = 0;

        // Calculate the position
        if (seekLocationFinal === GridStore.IO_SEEK_CUR) {
            targetPosition = this.position + finalPosition;
        } else if (seekLocationFinal === GridStore.IO_SEEK_END) {
            targetPosition = this.length + finalPosition;
        } else {
            targetPosition = finalPosition;
        }

        // Get the chunk
        const newChunkNumber = Math.floor(targetPosition / this.chunkSize);
        const seekChunk = () => {
            this._nthChunk(newChunkNumber, (err, chunk) => {
                if (err) {
                    return callback(err, null);
                }
                if (is.nil(chunk)) {
                    return callback(new Error("no chunk found"));
                }

                // Set the current chunk
                this.currentChunk = chunk;
                this.position = targetPosition;
                this.currentChunk.position = (this.position % this.chunkSize);
                callback(err, this);
            });
        };

        seekChunk();
    }

    @classMethod({ callback: true, promise: true })
    seek(position, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const seekLocation = args.length ? args.shift() : null;

        // We provided a callback leg
        if (is.function(callback)) {
            return this._seek(position, seekLocation, callback);
        }
        // Return promise
        return new this.promiseLibrary((resolve, reject) => {
            this._seek(position, seekLocation, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    static _exists(db, fileIdObject, rootCollection, options, callback) {
        // Establish read preference
        const readPreference = options.readPreference || ReadPreference.PRIMARY;
        // Fetch collection
        const rootCollectionFinal = !is.nil(rootCollection) ? rootCollection : GridStore.DEFAULT_ROOT_COLLECTION;
        db.collection(`${rootCollectionFinal}.files`, (err, collection) => {
            if (err) {
                return callback(err);
            }

            // Build query
            let query = (is.string(fileIdObject) || is.regexp(fileIdObject))
                ? { filename: fileIdObject }
                : { _id: fileIdObject }; // Attempt to locate file

            // We have a specific query
            if (is.object(fileIdObject) && !is.regexp(fileIdObject)) {
                query = fileIdObject;
            }

            // Check if the entry exists
            adone.promise.nodeify(collection.findOne(query, { readPreference }), (err, item) => {
                if (err) {
                    return callback(err);
                }
                callback(null, is.nil(item) ? false : true);
            });
        });
    }

    @staticMethod({ callback: true, promise: true })
    static exist(db, fileIdObject, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const rootCollection = args.length ? args.shift() : null;
        let options = args.length ? args.shift() : {};
        options = options || {};

        // Get the promiseLibrary
        let promiseLibrary = options.promiseLibrary;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // We provided a callback leg
        if (is.function(callback)) {
            return this._exists(db, fileIdObject, rootCollection, options, callback);
        }
        // Return promise
        return new promiseLibrary((resolve, reject) => {
            this._exists(db, fileIdObject, rootCollection, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    static _list(db, rootCollection, options, callback) {
        // Ensure we have correct values
        if (!is.nil(rootCollection) && is.object(rootCollection)) {
            options = rootCollection;
            rootCollection = null;
        }

        // Establish read preference
        const readPreference = options.readPreference || ReadPreference.PRIMARY;
        // Check if we are returning by id not filename
        const byId = !is.nil(options.id) ? options.id : false;
        // Fetch item
        const rootCollectionFinal = !is.nil(rootCollection) ? rootCollection : GridStore.DEFAULT_ROOT_COLLECTION;
        const items = [];
        db.collection((`${rootCollectionFinal}.files`), (err, collection) => {
            if (err) {
                return callback(err);
            }

            const cursor = collection.find({}, { readPreference });
            cursor.each((err, item) => {
                if (!is.nil(item)) {
                    items.push(byId ? item._id : item.filename);
                } else {
                    callback(err, items);
                }
            });
        });
    }

    @staticMethod({ callback: true, promise: true })
    static list(db, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const rootCollection = args.length ? args.shift() : null;
        let options = args.length ? args.shift() : {};
        options = options || {};

        // Get the promiseLibrary
        let promiseLibrary = options.promiseLibrary;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // We provided a callback leg
        if (is.function(callback)) {
            return this._list(db, rootCollection, options, callback);
        }
        // Return promise
        return new promiseLibrary((resolve, reject) => {
            this._list(db, rootCollection, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    static _read(db, name, length, offset, options, callback) {
        new GridStore(db, name, "r", options).open((err, gridStore) => {
            if (err) {
                return callback(err);
            }
            // Make sure we are not reading out of bounds
            if (offset && offset >= gridStore.length) {
                return callback("offset larger than size of file", null);
            }
            if (length && length > gridStore.length) {
                return callback("length is larger than the size of the file", null);
            }
            if (offset && length && (offset + length) > gridStore.length) {
                return callback("offset and length is larger than the size of the file", null);
            }

            if (!is.nil(offset)) {
                gridStore.seek(offset, (err, gridStore) => {
                    if (err) {
                        return callback(err);
                    }
                    gridStore.read(length, callback);
                });
            } else {
                gridStore.read(length, callback);
            }
        });
    }

    @staticMethod({ callback: true, promise: true })
    static read(db, name, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const length = args.length ? args.shift() : null;
        const offset = args.length ? args.shift() : null;
        let options = args.length ? args.shift() : null;
        options = options || {};

        // Get the promiseLibrary
        let promiseLibrary = options ? options.promiseLibrary : null;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // We provided a callback leg
        if (is.function(callback)) {
            return this._read(db, name, length, offset, options, callback);
        }
        // Return promise
        return new promiseLibrary((resolve, reject) => {
            this._read(db, name, length, offset, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    static _readlines(db, name, separator, options, callback) {
        const finalSeperator = is.nil(separator) ? "\n" : separator;
        new GridStore(db, name, "r", options).open((err, gridStore) => {
            if (err) {
                return callback(err);
            }
            gridStore.readlines(finalSeperator, callback);
        });
    }

    @staticMethod({ callback: true, promise: true })
    static readlines(db, name, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const separator = args.length ? args.shift() : null;
        let options = args.length ? args.shift() : null;
        options = options || {};

        // Get the promiseLibrary
        let promiseLibrary = options ? options.promiseLibrary : null;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // We provided a callback leg
        if (is.function(callback)) {
            return this._readlines(db, name, separator, options, callback);
        }
        // Return promise
        return new promiseLibrary((resolve, reject) => {
            this._readlines(db, name, separator, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    static _unlink(db, names, options, callback) {
        // Get the write concern
        const writeConcern = _getWriteConcern(db, options);

        // List of names
        if (names.constructor === Array) {
            let tc = 0;
            const cb = () => {
                if (--tc === 0) {
                    callback(null, this);
                }
            };
            for (let i = 0; i < names.length; i++) {
                ++tc;
                GridStore.unlink(db, names[i], options, cb);
            }
        } else {
            new GridStore(db, names, "w", options).open((err, gridStore) => {
                if (err) {
                    return callback(err);
                }
                gridStore._deleteChunks((err) => {
                    if (err) {
                        return callback(err);
                    }
                    gridStore.collection((err, collection) => {
                        if (err) {
                            return callback(err);
                        }
                        adone.promise.nodeify(collection.remove({ _id: gridStore.fileId }, writeConcern), (err) => {
                            callback(err, this);
                        });
                    });
                });
            });
        }
    }

    @staticMethod({ callback: true, promise: true })
    static unlink(db, names, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let options = args.length ? args.shift() : {};
        options = options || {};

        // Get the promiseLibrary
        let promiseLibrary = options.promiseLibrary;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // We provided a callback leg
        if (is.function(callback)) {
            return this._unlink(db, names, options, callback);
        }

        // Return promise
        return new promiseLibrary((resolve, reject) => {
            this._unlink(db, names, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }
}

GridStore.DEFAULT_ROOT_COLLECTION = "fs";
GridStore.DEFAULT_CONTENT_TYPE = "binary/octet-stream";
GridStore.IO_SEEK_SET = 0;
GridStore.IO_SEEK_CUR = 1;
GridStore.IO_SEEK_END = 2;
