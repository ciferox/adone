const {
    is,
    database: { mongo },
    fs,
    std: {
        stream: { Duplex }
    }
} = adone;
const {
    ObjectId,
    MongoError,
    ReadPreference
} = mongo;
const __ = adone.private(mongo);
const {
    utils: { shallowClone }
} = __;

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
            this.gs.open().then(() => {
                this.totalBytesToRead = this.gs.length - this.gs.position;
                super.pipe(destination);
            }, (err) => this.emit("error", err));
        } else {
            this.totalBytesToRead = this.gs.length - this.gs.position;
            super.pipe(destination);
        }

        return destination;
    }

    async _read() {
        // Set read length
        const length = this.gs.length < this.gs.chunkSize ? this.gs.length - this.seekPosition : this.gs.chunkSize;
        if (!this.gs.isOpen) {
            await this.gs.open();
            this.totalBytesToRead = this.gs.length - this.gs.position;
        }
        if (this.totalBytesToRead <= 0) {
            this.push(null);
            return;
        }
        try {
            const buffer = await this.gs.read(length);
            if (this.endCalled || is.nil(buffer)) {
                return this.push(null);
            }
            // Remove bytes read
            if (buffer.length <= this.totalBytesToRead) {
                this.totalBytesToRead -= buffer.length;
                this.push(buffer);
            } else if (buffer.length > this.totalBytesToRead) {
                this.totalBytesToRead -= buffer._index;
                this.push(buffer.slice(0, buffer._index));
            }
        } catch (err) {
            this.emit("error", err);
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
            this.gs.open().then(() => {
                this.gs.write(chunk).then(() => {
                    this.emit("drain");
                });
            });
            return false;
        }
        this.gs.write(chunk).then(() => {
            this.emit("drain");
        });
        return true;
    }

    end(chunk, callback) {
        if (is.function(chunk)) {
            [chunk, callback] = [undefined, chunk];
        }
        this.endCalled = true;
        const err = (err) => this.emit("error", err);
        if (chunk) {
            this.gs.write(chunk).then(() => {
                this.gs.close().then(() => {
                    if (is.function(callback)) {
                        callback();
                    }
                    this.emit("end");
                }, err);
            }, err);
            return;
        }

        this.gs.close().then(() => {
            if (is.function(callback)) {
                callback();
            }
            this.emit("end");
        }, err);
    }
}

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

    async open() {
        if (this.mode !== "w" && this.mode !== "w+" && this.mode !== "r") {
            throw MongoError.create({ message: `Illegal mode ${this.mode}`, driver: true });
        }
        // Get the write concern
        const options = _getWriteConcern(this.db, this.options);

        // If we are writing we need to ensure we have the right indexes for md5's
        if ((this.mode === "w" || this.mode === "w+")) {
            const collection = this.collection();
            await collection.ensureIndex([["filename", 1]], options);
            // Get chunk collection
            const chunkCollection = this.chunkCollection();
            // Make an unique index for compatibility with mongo-cxx-driver:legacy
            const chunkIndexOptions = shallowClone(options);
            chunkIndexOptions.unique = true;
            // Ensure index on chunk collection
            await chunkCollection.ensureIndex([["files_id", 1], ["n", 1]], chunkIndexOptions);
        }
        const collection = this.collection();
        // Create the query
        let query = this.referenceBy === REFERENCE_BY_ID ? { _id: this.fileId } : { filename: this.filename };
        query = is.nil(this.fileId) && is.nil(this.filename) ? null : query;
        options.readPreference = this.readPreference;

        // Fetch the chunks
        if (!is.nil(query)) {
            // only pass error to callback once
            const doc = await collection.findOne(query, options);
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
                throw MongoError.create({
                    message: `file with id ${this.referenceBy === REFERENCE_BY_ID ? txtId : this.filename} not opened for writing`,
                    driver: true
                });
            }

            // Process the mode of the object
            if (this.mode === "r") {
                const chunk = await this._nthChunk(0, options);
                this.currentChunk = chunk;
                this.position = 0;
            } else if (this.mode === "w" && doc) {
                // Delete any existing chunks
                await this._deleteChunks(options);
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
            } else if (this.mode === "w+") {
                const chunk = await this._nthChunk(this._lastChunkNumber(), options);
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
            }
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
                await this._deleteChunks(options);
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
            } else if (this.mode === "w+") {
                const chunk = await this._nthChunk(this._lastChunkNumber(), options);
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
            }
        }
        this.isOpen = true;
        return this;
    }

    eof() {
        return this.position === this.length ? true : false;
    }

    async getc() {
        if (this.eof()) {
            return null;
        }
        if (this.currentChunk.eof()) {
            const chunk = await this._nthChunk(this.currentChunk.chunkNumber + 1);
            this.currentChunk = chunk;
            this.position = this.position + 1;
            return this.currentChunk.getc();
        }
        this.position = this.position + 1;
        return this.currentChunk.getc();
    }

    async puts(string) {
        return this.write(is.nil(string.match(/\n$/)) ? `${string}\n` : string);
    }

    stream() {
        return new GridStoreStream(this);
    }

    async write(buffer, close = false) {
        // If we have a buffer write it using the writeBuffer method
        if (!is.buffer(buffer)) {
            buffer = Buffer.from(buffer, "binary");
        }
        if (this.mode !== "w") {
            throw MongoError.create({
                message: `file with id ${this.referenceBy === REFERENCE_BY_ID ? this.referenceBy : this.filename} not opened for writing`,
                driver: true
            });
        }
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
            await Promise.all(chunksToWrite.map((x) => x.save({})));
        } else {
            // Update the position for the gridstore
            this.position = this.position + buffer.length;
            // We have less data than the chunk size just write it and callback
            this.currentChunk.write(buffer);
        }
        if (close) {
            await this.close();
        }
        return this;
    }

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

    async writeFile(file) {
        if (is.string(file)) {
            const fd = await fs.fd.open(file, "r");
            return this.writeFile(fd);
        }
        await this.open();
        const stats = await fs.fd.stat(file);
        let offset = 0;
        let index = 0;

        for (; ;) {
            // Allocate the buffer
            const _buffer = Buffer.alloc(this.chunkSize);
            // Read the file
            const bytesRead = await fs.fd.read(file, _buffer, 0, _buffer.length, offset);
            offset = offset + bytesRead;

            // Create a new chunk for the data
            const chunk = new __.Chunk(this, { n: index++ }, this.writeConcern);
            chunk.write(_buffer.slice(0, bytesRead));
            await chunk.save({});
            this.position += bytesRead;
            this.currentChunk = chunk;

            if (offset >= stats.size) {
                break;
            }
        }
        await fs.fd.close(file);
        await this.close();
        return this;
    }

    async _buildMongoObject() {
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
        const results = await this.db.command(md5Command);
        mongoObject.md5 = results.md5;
        return mongoObject;
    }

    async close() {
        if (this.mode[0] === "w") {
            // Set up options
            const options = this.writeConcern;

            if (!is.nil(this.currentChunk) && this.currentChunk.position > 0) {
                await this.currentChunk.save();
                const files = this.collection();
                // Build the mongo object
                if (is.nil(this.uploadDate)) {
                    this.uploadDate = new Date();
                }
                const mongoObject = await this._buildMongoObject();
                await files.save(mongoObject, options);
                return mongoObject;
            }
            const files = this.collection();
            this.uploadDate = new Date();
            const mongoObject = await this._buildMongoObject();
            await files.save(mongoObject, options);
            return mongoObject;

        } else if (this.mode[0] === "r") {
            return null;
        }
        throw MongoError.create({ message: `Illegal mode ${this.mode}`, driver: true });
    }

    chunkCollection() {
        return this.db.collection((`${this.root}.chunks`));
    }

    async _deleteChunks(options = this.writeConcern) {
        if (!is.undefined(this.fileId)) {
            await this.chunkCollection().remove({ files_id: this.fileId }, options);
        }
        return true;
    }

    async unlink() {
        await this._deleteChunks();
        const collection = this.collection();
        await collection.remove({ _id: this.fileId }, this.writeConcern);
        return this;
    }

    collection() {
        return this.db.collection(`${this.root}.files`);
    }

    async readlines(separator = "\n") {
        const data = await this.read();
        let items = data.toString().split(separator);
        items = items.length > 0 ? items.splice(0, items.length - 1) : [];
        for (let i = 0; i < items.length; i++) {
            items[i] = items[i] + separator;
        }
        return items;
    }

    async rewind() {
        if (this.currentChunk.chunkNumber !== 0) {
            if (this.mode[0] === "w") {
                await this._deleteChunks();
                this.currentChunk = new __.Chunk(this, { n: 0 }, this.writeConcern);
                this.position = 0;
            } else {
                const chunk = await this.currentChunk(0);
                this.currentChunk = chunk;
                this.currentChunk.rewind();
                this.position = 0;
            }
        } else {
            this.currentChunk.rewind();
            this.position = 0;
        }
        return this;
    }

    async _nthChunk(chunkNumber, options = this.writeConcern) {
        options.readPreference = this.readPreference;
        const chunk = await this.chunkCollection().findOne({ files_id: this.fileId, n: chunkNumber }, options);
        const finalChunk = is.nil(chunk) ? {} : chunk;
        return new __.Chunk(this, finalChunk, this.writeConcern);
    }

    async read(length = this.length - this.position, buffer = Buffer.allocUnsafe(length)) {
        buffer._index = buffer._index || 0;

        if ((this.currentChunk.length() - this.currentChunk.position + buffer._index) >= length) {
            const slice = this.currentChunk.readSlice(length - buffer._index);
            // Copy content to final buffer
            slice.copy(buffer, buffer._index);
            // Update internal position
            this.position = this.position + buffer.length;
            // Check if we don't have a file at all
            if (buffer === 0 && buffer.length === 0) {
                throw MongoError.create({ message: "File does not exist", driver: true });
            }
            return buffer;
        }

        // Read the next chunk
        const slice = this.currentChunk.readSlice(this.currentChunk.length() - this.currentChunk.position);
        slice.copy(buffer, buffer._index);
        // Update index position
        buffer._index += slice.length;

        // Load next chunk and read more
        const chunk = await this._nthChunk(this.currentChunk.chunkNumber + 1);
        if (chunk.length() > 0) {
            this.currentChunk = chunk;
            return this.read(length, buffer);
        }
        if (buffer._index > 0) {
            return buffer;
        }
        throw MongoError.create({ message: "no chunks found for file, possibly corrupt", driver: true });
    }

    tell() {
        return this.position;
    }

    async seek(position, seekLocation = GridStore.IO_SEEK_SET) {
        // Seek only supports read mode
        if (this.mode !== "r") {
            throw MongoError.create({ message: "seek is only supported for mode r", driver: true });
        }

        let targetPosition = 0;

        // Calculate the position
        if (seekLocation === GridStore.IO_SEEK_CUR) {
            targetPosition = this.position + position;
        } else if (seekLocation === GridStore.IO_SEEK_END) {
            targetPosition = this.length + position;
        } else {
            targetPosition = position;
        }

        // Get the chunk
        const newChunkNumber = Math.floor(targetPosition / this.chunkSize);
        const chunk = await this._nthChunk(newChunkNumber);
        if (is.nil(chunk)) {
            throw new Error("no chunk found");
        }

        // Set the current chunk
        this.currentChunk = chunk;
        this.position = targetPosition;
        this.currentChunk.position = (this.position % this.chunkSize);

        return this;
    }

    static async exist(db, fileIdObject, rootCollection = GridStore.DEFAULT_ROOT_COLLECTION, options = {}) {
        if (is.object(rootCollection)) {
            [options, rootCollection] = [rootCollection, GridStore.DEFAULT_ROOT_COLLECTION];
        }
        // Establish read preference
        const readPreference = options.readPreference || ReadPreference.PRIMARY;
        // Fetch collection
        const collection = db.collection(`${rootCollection}.files`);
        // Build query
        let query = (is.string(fileIdObject) || is.regexp(fileIdObject))
            ? { filename: fileIdObject }
            : { _id: fileIdObject }; // Attempt to locate file

        // We have a specific query
        if (is.object(fileIdObject) && !is.regexp(fileIdObject)) {
            query = fileIdObject;
        }

        // Check if the entry exists
        const item = await collection.findOne(query, { readPreference });
        return Boolean(item);
    }

    static async list(db, rootCollection = GridStore.DEFAULT_ROOT_COLLECTION, options = {}) {
        if (is.object(rootCollection)) {
            [options, rootCollection] = [rootCollection, GridStore.DEFAULT_ROOT_COLLECTION];
        }
        // Establish read preference
        const readPreference = options.readPreference || ReadPreference.PRIMARY;
        // Check if we are returning by id not filename
        const byId = !is.nil(options.id) ? options.id : false;
        // Fetch item
        const collection = db.collection(`${rootCollection}.files`);
        const cursor = collection.find({}, { readPreference });
        const items = await cursor.toArray();
        return items.map((item) => byId ? item._id : item.filename);
    }

    static async read(db, name, length, offset, options = {}) {
        if (is.object(offset)) {
            [options, offset] = [offset, undefined];
        }
        const gridStore = new GridStore(db, name, "r", options);
        await gridStore.open();
        // Make sure we are not reading out of bounds
        if (offset && offset >= gridStore.length) {
            throw new Error("offset larger than size of file");
        }
        if (length && length > gridStore.length) {
            throw new Error("length is larger than the size of the file");
        }
        if (offset && length && (offset + length) > gridStore.length) {
            throw new Error("offset and length is larger than the size of the file");
        }

        if (is.number(offset)) {
            await gridStore.seek(offset);
        }
        return gridStore.read(length);
    }

    static async readlines(db, name, separator = "\n", options = {}) {
        if (is.object(separator)) {
            [options, separator] = [separator, "\n"];
        }
        const gridStore = new GridStore(db, name, "r", options);
        await gridStore.open();
        return gridStore.readlines(separator);
    }

    static async unlink(db, names, options = {}) {
        if (is.array(names)) {
            await Promise.all(names.map((name) => this.unlink(db, name, options)));
            return this;
        }
        const gridStore = new GridStore(db, names, "w", options);
        await gridStore.open();
        await gridStore._deleteChunks();
        const collection = await gridStore.collection();
        await collection.remove({ _id: gridStore.fileId }, _getWriteConcern(db, options));
        return this;
    }
}

GridStore.DEFAULT_ROOT_COLLECTION = "fs";
GridStore.DEFAULT_CONTENT_TYPE = "binary/octet-stream";
GridStore.IO_SEEK_SET = 0;
GridStore.IO_SEEK_CUR = 1;
GridStore.IO_SEEK_END = 2;
