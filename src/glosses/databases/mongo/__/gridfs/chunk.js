const { is, database: { mongo: { Binary, ObjectId } } } = adone;

export default class Chunk {
    constructor(file, mongoObject, writeConcern) {
        this.file = file;
        const mongoObjectFinal = is.nil(mongoObject) ? {} : mongoObject;
        this.writeConcern = writeConcern || { w: 1 };
        this.objectId = is.nil(mongoObjectFinal._id) ? new ObjectId() : mongoObjectFinal._id;
        this.chunkNumber = is.nil(mongoObjectFinal.n) ? 0 : mongoObjectFinal.n;
        this.data = new Binary();

        if (is.string(mongoObjectFinal.data)) {
            const buffer = Buffer.allocUnsafe(mongoObjectFinal.data.length);
            buffer.write(mongoObjectFinal.data, 0, mongoObjectFinal.data.length, "binary");
            this.data = new Binary(buffer);
        } else if (is.array(mongoObjectFinal.data)) {
            const buffer = Buffer.allocUnsafe(mongoObjectFinal.data.length);
            const data = mongoObjectFinal.data.join("");
            buffer.write(data, 0, data.length, "binary");
            this.data = new Binary(buffer);
        } else if (mongoObjectFinal.data && mongoObjectFinal.data._bsontype === "Binary") {
            this.data = mongoObjectFinal.data;
        } else if (!is.buffer(mongoObjectFinal.data) && !(is.nil(mongoObjectFinal.data))) {
            throw Error("Illegal chunk format");
        }

        // Update position
        this.internalPosition = 0;
    }

    write(data, callback) {
        this.data.write(data, this.internalPosition, data.length, "binary");
        this.internalPosition = this.data.length();
        if (!is.nil(callback)) {
            return callback(null, this);
        }
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

    save(options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        this.file.chunkCollection((err, collection) => {
            if (err) {
                return callback(err);
            }

            // Merge the options
            const writeOptions = { upsert: true };
            for (const name in options) {
                writeOptions[name] = options[name];
            }
            for (const name in this.writeConcern) {
                writeOptions[name] = this.writeConcern[name];
            }

            if (this.data.length() > 0) {
                this.buildMongoObject((mongoObject) => {
                    const options = { forceServerObjectId: true };
                    for (const name in this.writeConcern) {
                        options[name] = this.writeConcern[name];
                    }

                    adone.promise.nodeify(collection.replaceOne({ _id: this.objectId }, mongoObject, writeOptions), (err) => {
                        callback(err, this);
                    });
                });
            } else {
                callback(null, this);
            }
        });
    }

    buildMongoObject(callback) {
        const mongoObject = {
            files_id: this.file.fileId,
            n: this.chunkNumber,
            data: this.data
        };
        // If we are saving using a specific ObjectId
        if (!is.nil(this.objectId)) {
            mongoObject._id = this.objectId;
        }

        callback(mongoObject);
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
