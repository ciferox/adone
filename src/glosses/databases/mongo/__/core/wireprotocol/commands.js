const {
    is,
    database: { mongo }
} = adone;
const {
    core: { MongoError }
} = adone.private(mongo);

// Wire command operation ids
const OP_UPDATE = 2001;
const OP_INSERT = 2002;
const OP_DELETE = 2006;

export class Insert {
    constructor(requestId, ismaster, bson, ns, documents, options = {}) {
        // Basic options needed to be passed in
        if (is.nil(ns)) {
            throw new MongoError("ns must be specified for query");
        }
        if (!is.array(documents) || documents.length === 0) {
            throw new MongoError("documents array must contain at least one document to insert");
        }

        // Validate that we are not passing 0x00 in the collection name
        if (ns.includes("\x00")) {
            throw new MongoError("namespace cannot contain a null character");
        }

        // Set internal
        this.requestId = requestId;
        this.bson = bson;
        this.ns = ns;
        this.documents = documents;
        this.ismaster = ismaster;

        // Unpack options
        this.serializeFunctions = is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
        this.ignoreUndefined = is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : false;
        this.checkKeys = is.boolean(options.checkKeys) ? options.checkKeys : true;
        this.continueOnError = is.boolean(options.continueOnError) ? options.continueOnError : false;
        // Set flags
        this.flags = this.continueOnError ? 1 : 0;
    }

    toBin() {
        // Contains all the buffers to be written
        const buffers = [];

        // Header buffer
        const header = Buffer.alloc(
            4 * 4 // Header
            + 4 // Flags
            + Buffer.byteLength(this.ns) + 1 // namespace
        );

        // Add header to buffers
        buffers.push(header);

        // Total length of the message
        let totalLength = header.length;

        // Serialize all the documents
        for (const doc of this.documents) {
            const buffer = this.bson.serialize(doc, {
                checkKeys: this.checkKeys,
                serializeFunctions: this.serializeFunctions,
                ignoreUndefined: this.ignoreUndefined
            });

            // Document is larger than maxBsonObjectSize, terminate serialization
            if (buffer.length > this.ismaster.maxBsonObjectSize) {
                throw new MongoError(`Document exceeds maximum allowed bson size of ${this.ismaster.maxBsonObjectSize} bytes`);
            }

            // Add to total length of wire protocol message
            totalLength = totalLength + buffer.length;
            // Add to buffer
            buffers.push(buffer);
        }

        // Command is larger than maxMessageSizeBytes terminate serialization
        if (totalLength > this.ismaster.maxMessageSizeBytes) {
            throw new MongoError(`Command exceeds maximum message size of ${this.ismaster.maxMessageSizeBytes} bytes`);
        }

        // Add all the metadata
        let index = 0;

        // Write header length
        header[index + 3] = (totalLength >> 24) & 0xff;
        header[index + 2] = (totalLength >> 16) & 0xff;
        header[index + 1] = (totalLength >> 8) & 0xff;
        header[index] = (totalLength) & 0xff;
        index = index + 4;

        // Write header requestId
        header[index + 3] = (this.requestId >> 24) & 0xff;
        header[index + 2] = (this.requestId >> 16) & 0xff;
        header[index + 1] = (this.requestId >> 8) & 0xff;
        header[index] = (this.requestId) & 0xff;
        index = index + 4;

        // No flags
        header[index + 3] = (0 >> 24) & 0xff;
        header[index + 2] = (0 >> 16) & 0xff;
        header[index + 1] = (0 >> 8) & 0xff;
        header[index] = (0) & 0xff;
        index = index + 4;

        // Operation
        header[index + 3] = (OP_INSERT >> 24) & 0xff;
        header[index + 2] = (OP_INSERT >> 16) & 0xff;
        header[index + 1] = (OP_INSERT >> 8) & 0xff;
        header[index] = (OP_INSERT) & 0xff;
        index = index + 4;

        // Flags
        header[index + 3] = (this.flags >> 24) & 0xff;
        header[index + 2] = (this.flags >> 16) & 0xff;
        header[index + 1] = (this.flags >> 8) & 0xff;
        header[index] = (this.flags) & 0xff;
        index = index + 4;

        // Write collection name
        index = index + header.write(this.ns, index, "utf8") + 1;
        header[index - 1] = 0;

        // Return the buffers
        return buffers;
    }
}

export class Update {
    constructor(requestId, ismaster, bson, ns, update, options = {}) {
        if (is.nil(ns)) {
            throw new MongoError("ns must be specified for query");
        }

        // Set internal
        this.requestId = requestId;
        this.bson = bson;
        this.ns = ns;
        this.ismaster = ismaster;

        // Unpack options
        this.serializeFunctions = is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
        this.ignoreUndefined = is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : false;
        this.checkKeys = is.boolean(options.checkKeys) ? options.checkKeys : false;

        // Unpack the update document
        this.upsert = is.boolean(update[0].upsert) ? update[0].upsert : false;
        this.multi = is.boolean(update[0].multi) ? update[0].multi : false;
        this.q = update[0].q;
        this.u = update[0].u;

        // Create flag value
        this.flags = this.upsert ? 1 : 0;
        this.flags = this.multi ? this.flags | 2 : this.flags;
    }

    toBin() {
        // Contains all the buffers to be written
        const buffers = [];

        // Header buffer
        const header = Buffer.alloc(
            4 * 4 // Header
            + 4 // ZERO
            + Buffer.byteLength(this.ns) + 1 // namespace
            + 4 // Flags
        );

        // Add header to buffers
        buffers.push(header);

        // Total length of the message
        let totalLength = header.length;

        // Serialize the selector
        const selector = this.bson.serialize(this.q, {
            checkKeys: this.checkKeys,
            serializeFunctions: this.serializeFunctions,
            ignoreUndefined: this.ignoreUndefined
        });
        buffers.push(selector);
        totalLength = totalLength + selector.length;

        // Serialize the update
        const update = this.bson.serialize(this.u, {
            checkKeys: this.checkKeys,
            serializeFunctions: this.serializeFunctions,
            ignoreUndefined: this.ignoreUndefined
        });
        buffers.push(update);
        totalLength = totalLength + update.length;

        // Index in header buffer
        let index = 0;

        // Write header length
        header[index + 3] = (totalLength >> 24) & 0xff;
        header[index + 2] = (totalLength >> 16) & 0xff;
        header[index + 1] = (totalLength >> 8) & 0xff;
        header[index] = (totalLength) & 0xff;
        index = index + 4;

        // Write header requestId
        header[index + 3] = (this.requestId >> 24) & 0xff;
        header[index + 2] = (this.requestId >> 16) & 0xff;
        header[index + 1] = (this.requestId >> 8) & 0xff;
        header[index] = (this.requestId) & 0xff;
        index = index + 4;

        // No flags
        header[index + 3] = (0 >> 24) & 0xff;
        header[index + 2] = (0 >> 16) & 0xff;
        header[index + 1] = (0 >> 8) & 0xff;
        header[index] = (0) & 0xff;
        index = index + 4;

        // Operation
        header[index + 3] = (OP_UPDATE >> 24) & 0xff;
        header[index + 2] = (OP_UPDATE >> 16) & 0xff;
        header[index + 1] = (OP_UPDATE >> 8) & 0xff;
        header[index] = (OP_UPDATE) & 0xff;
        index = index + 4;

        // Write ZERO
        header[index + 3] = (0 >> 24) & 0xff;
        header[index + 2] = (0 >> 16) & 0xff;
        header[index + 1] = (0 >> 8) & 0xff;
        header[index] = (0) & 0xff;
        index = index + 4;

        // Write collection name
        index = index + header.write(this.ns, index, "utf8") + 1;
        header[index - 1] = 0;

        // Flags
        header[index + 3] = (this.flags >> 24) & 0xff;
        header[index + 2] = (this.flags >> 16) & 0xff;
        header[index + 1] = (this.flags >> 8) & 0xff;
        header[index] = (this.flags) & 0xff;
        index = index + 4;

        // Return the buffers
        return buffers;
    }
}

export class Remove {
    constructor(requestId, ismaster, bson, ns, remove, options = {}) {
        // Basic options needed to be passed in
        if (is.nil(ns)) {
            throw new MongoError("ns must be specified for query");
        }

        // Set internal
        this.requestId = requestId;
        this.bson = bson;
        this.ns = ns;
        this.ismaster = ismaster;

        // Unpack options
        this.serializeFunctions = is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
        this.ignoreUndefined = is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : false;
        this.checkKeys = is.boolean(options.checkKeys) ? options.checkKeys : false;

        // Unpack the update document
        this.limit = is.number(remove[0].limit) ? remove[0].limit : 1;
        this.q = remove[0].q;

        // Create flag value
        this.flags = this.limit === 1 ? 1 : 0;
    }

    toBin() {
        // Contains all the buffers to be written
        const buffers = [];

        // Header buffer
        const header = Buffer.alloc(
            4 * 4 // Header
            + 4 // ZERO
            + Buffer.byteLength(this.ns) + 1 // namespace
            + 4 // Flags
        );

        // Add header to buffers
        buffers.push(header);

        // Total length of the message
        let totalLength = header.length;

        // Serialize the selector
        const selector = this.bson.serialize(this.q, {
            checkKeys: this.checkKeys,
            serializeFunctions: this.serializeFunctions,
            ignoreUndefined: this.ignoreUndefined
        });
        buffers.push(selector);
        totalLength = totalLength + selector.length;

        // Index in header buffer
        let index = 0;

        // Write header length
        header[index + 3] = (totalLength >> 24) & 0xff;
        header[index + 2] = (totalLength >> 16) & 0xff;
        header[index + 1] = (totalLength >> 8) & 0xff;
        header[index] = (totalLength) & 0xff;
        index = index + 4;

        // Write header requestId
        header[index + 3] = (this.requestId >> 24) & 0xff;
        header[index + 2] = (this.requestId >> 16) & 0xff;
        header[index + 1] = (this.requestId >> 8) & 0xff;
        header[index] = (this.requestId) & 0xff;
        index = index + 4;

        // No flags
        header[index + 3] = (0 >> 24) & 0xff;
        header[index + 2] = (0 >> 16) & 0xff;
        header[index + 1] = (0 >> 8) & 0xff;
        header[index] = (0) & 0xff;
        index = index + 4;

        // Operation
        header[index + 3] = (OP_DELETE >> 24) & 0xff;
        header[index + 2] = (OP_DELETE >> 16) & 0xff;
        header[index + 1] = (OP_DELETE >> 8) & 0xff;
        header[index] = (OP_DELETE) & 0xff;
        index = index + 4;

        // Write ZERO
        header[index + 3] = (0 >> 24) & 0xff;
        header[index + 2] = (0 >> 16) & 0xff;
        header[index + 1] = (0 >> 8) & 0xff;
        header[index] = (0) & 0xff;
        index = index + 4;

        // Write collection name
        index = index + header.write(this.ns, index, "utf8") + 1;
        header[index - 1] = 0;

        // Write ZERO
        header[index + 3] = (this.flags >> 24) & 0xff;
        header[index + 2] = (this.flags >> 16) & 0xff;
        header[index + 1] = (this.flags >> 8) & 0xff;
        header[index] = (this.flags) & 0xff;
        index = index + 4;

        // Return the buffers
        return buffers;
    }
}
