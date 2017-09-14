const {
    is,
    database: {
        mongo: {
            Binary,
            ObjectId
        }
    }
} = adone;

export default class Chunk {
    constructor(file, mongoObject = {}, writeConcern = { w: 1 }) {
        this.file = file;
        this.writeConcern = writeConcern;
        this.objectId = is.nil(mongoObject._id) ? new ObjectId() : mongoObject._id;
        this.chunkNumber = is.nil(mongoObject.n) ? 0 : mongoObject.n;
        this.data = new Binary();

        if (is.string(mongoObject.data)) {
            const buffer = Buffer.allocUnsafe(mongoObject.data.length);
            buffer.write(mongoObject.data, 0, mongoObject.data.length, "binary");
            this.data = new Binary(buffer);
        } else if (is.array(mongoObject.data)) {
            const buffer = Buffer.allocUnsafe(mongoObject.data.length);
            const data = mongoObject.data.join("");
            buffer.write(data, 0, data.length, "binary");
            this.data = new Binary(buffer);
        } else if (mongoObject.data && mongoObject.data._bsontype === "Binary") {
            this.data = mongoObject.data;
        } else if (!is.buffer(mongoObject.data) && !(is.nil(mongoObject.data))) {
            throw Error("Illegal chunk format");
        }

        // Update position
        this.internalPosition = 0;
    }

    write(data) {
        this.data.write(data, this.internalPosition, data.length, "binary");
        this.internalPosition = this.data.length();
        return this;
    }

    read(length) {
        // Default to full read if no index defined
        length = is.nil(length) || length === 0 ? this.length() : length;

        if (this.length() - this.internalPosition + 1 >= length) {
            const data = this.data.read(this.internalPosition, length);
            this.internalPosition = this.internalPosition + length;
            return data;
        }
        return "";
    }

    readSlice(length) {
        if ((this.length() - this.internalPosition) >= length) {
            let data = null;
            if (!is.nil(this.data.buffer)) { //Pure BSON
                data = this.data.buffer.slice(this.internalPosition, this.internalPosition + length);
            } else { //Native BSON
                data = Buffer.allocUnsafe(length);
                length = this.data.readInto(data, this.internalPosition);
            }
            this.internalPosition = this.internalPosition + length;
            return data;
        }
        return null;
    }

    eof() {
        return this.internalPosition === this.length() ? true : false;
    }

    getc() {
        return this.read(1);
    }

    rewind() {
        this.internalPosition = 0;
        this.data = new Binary();
    }

    async save(options = {}) {
        const collection = this.file.chunkCollection();
        // Merge the options
        const writeOptions = { upsert: true };
        for (const name in options) {
            writeOptions[name] = options[name];
        }
        for (const name in this.writeConcern) {
            writeOptions[name] = this.writeConcern[name];
        }

        if (this.data.length() > 0) {
            const mongoObject = this.buildMongoObject();
            const options = { forceServerObjectId: true };
            for (const name in this.writeConcern) {
                options[name] = this.writeConcern[name];
            }

            await collection.replaceOne({ _id: this.objectId }, mongoObject, writeOptions);
        }
        return this;
    }

    buildMongoObject() {
        const mongoObject = {
            files_id: this.file.fileId,
            n: this.chunkNumber,
            data: this.data
        };
        // If we are saving using a specific ObjectId
        if (!is.nil(this.objectId)) {
            mongoObject._id = this.objectId;
        }
        return mongoObject;
    }

    length() {
        return this.data.length();
    }

    get position() {
        return this.internalPosition;
    }

    set position(value) {
        this.internalPosition = value;
    }
}

Chunk.DEFAULT_CHUNK_SIZE = 1024 * 255;
