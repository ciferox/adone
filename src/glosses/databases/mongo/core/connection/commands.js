const { is, x } = adone;

// Incrementing request id
let _requestId = 0;

// Wire command operation ids
const OP_QUERY = 2004;
const OP_GETMORE = 2005;
const OP_KILL_CURSORS = 2007;

// Query flags
const OPTS_TAILABLE_CURSOR = 2;
const OPTS_SLAVE = 4;
const OPTS_OPLOG_REPLAY = 8;
const OPTS_NO_CURSOR_TIMEOUT = 16;
const OPTS_AWAIT_DATA = 32;
const OPTS_EXHAUST = 64;
const OPTS_PARTIAL = 128;

// Response flags
const CURSOR_NOT_FOUND = 0;
const QUERY_FAILURE = 2;
const SHARD_CONFIG_STALE = 4;
const AWAIT_CAPABLE = 8;

export class Query {
    constructor(bson, ns, query, options = {}) {
        // Basic options needed to be passed in
        if (is.nil(ns)) {
            throw new x.InvalidArgument("ns must be specified for query");
        }
        if (is.nil(query)) {
            throw new x.InvalidArgument("query must be specified for query");
        }

        // Validate that we are not passing 0x00 in the collection name
        if (ns.includes("\x00")) {
            throw new x.InvalidArgument("namespace cannot contain a null character");
        }

        // Basic options
        this.bson = bson;
        this.ns = ns;
        this.query = query;

        // Ensure empty options
        this.options = options;

        // Additional options
        this.numberToSkip = options.numberToSkip || 0;
        this.numberToReturn = options.numberToReturn || 0;
        this.returnFieldSelector = options.returnFieldSelector || null;
        this.requestId = Query.getRequestId();

        // Serialization option
        this.serializeFunctions = is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
        this.ignoreUndefined = is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : false;
        this.maxBsonSize = options.maxBsonSize || 1024 * 1024 * 16;
        this.checkKeys = is.boolean(options.checkKeys) ? options.checkKeys : true;
        this.batchSize = this.numberToReturn;

        // Flags
        this.tailable = false;
        this.slaveOk = is.boolean(options.slaveOk) ? options.slaveOk : false;
        this.oplogReplay = false;
        this.noCursorTimeout = false;
        this.awaitData = false;
        this.exhaust = false;
        this.partial = false;
    }

    incRequestId() {
        this.requestId = _requestId++;
    }

    nextRequestId() {
        return _requestId + 1;
    }

    toBin() {
        const buffers = [];
        let projection = null;

        // Set up the flags
        let flags = 0;
        if (this.tailable) {
            flags |= OPTS_TAILABLE_CURSOR;
        }

        if (this.slaveOk) {
            flags |= OPTS_SLAVE;
        }

        if (this.oplogReplay) {
            flags |= OPTS_OPLOG_REPLAY;
        }

        if (this.noCursorTimeout) {
            flags |= OPTS_NO_CURSOR_TIMEOUT;
        }

        if (this.awaitData) {
            flags |= OPTS_AWAIT_DATA;
        }

        if (this.exhaust) {
            flags |= OPTS_EXHAUST;
        }

        if (this.partial) {
            flags |= OPTS_PARTIAL;
        }

        // If batchSize is different to self.numberToReturn
        if (this.batchSize !== this.numberToReturn) {
            this.numberToReturn = this.batchSize;
        }

        // Allocate write protocol header buffer
        const header = Buffer.alloc(
            4 * 4 // Header
            + 4   // Flags
            + Buffer.byteLength(this.ns) + 1 // namespace
            + 4 // numberToSkip
            + 4 // numberToReturn
        );

        // Add header to buffers
        buffers.push(header);

        // Serialize the query
        const query = this.bson.serialize(this.query, {
            checkKeys: this.checkKeys,
            serializeFunctions: this.serializeFunctions,
            ignoreUndefined: this.ignoreUndefined
        });

        // Add query document
        buffers.push(query);

        if (this.returnFieldSelector && !is.emptyObject(this.returnFieldSelector)) {
            // Serialize the projection document
            projection = this.bson.serialize(this.returnFieldSelector, {
                checkKeys: this.checkKeys,
                serializeFunctions: this.serializeFunctions,
                ignoreUndefined: this.ignoreUndefined
            });
            // Add projection document
            buffers.push(projection);
        }

        // Total message size
        const totalLength = header.length + query.length + (projection ? projection.length : 0);

        // Set up the index
        let index = 4;

        // Write total document length
        header[3] = (totalLength >> 24) & 0xff;
        header[2] = (totalLength >> 16) & 0xff;
        header[1] = (totalLength >> 8) & 0xff;
        header[0] = (totalLength) & 0xff;

        // Write header information requestId
        header[index + 3] = (this.requestId >> 24) & 0xff;
        header[index + 2] = (this.requestId >> 16) & 0xff;
        header[index + 1] = (this.requestId >> 8) & 0xff;
        header[index] = (this.requestId) & 0xff;
        index = index + 4;

        // Write header information responseTo
        header[index + 3] = (0 >> 24) & 0xff;
        header[index + 2] = (0 >> 16) & 0xff;
        header[index + 1] = (0 >> 8) & 0xff;
        header[index] = (0) & 0xff;
        index = index + 4;

        // Write header information OP_QUERY
        header[index + 3] = (OP_QUERY >> 24) & 0xff;
        header[index + 2] = (OP_QUERY >> 16) & 0xff;
        header[index + 1] = (OP_QUERY >> 8) & 0xff;
        header[index] = (OP_QUERY) & 0xff;
        index = index + 4;

        // Write header information flags
        header[index + 3] = (flags >> 24) & 0xff;
        header[index + 2] = (flags >> 16) & 0xff;
        header[index + 1] = (flags >> 8) & 0xff;
        header[index] = (flags) & 0xff;
        index = index + 4;

        // Write collection name
        index = index + header.write(this.ns, index, "utf8") + 1;
        header[index - 1] = 0;

        // Write header information flags numberToSkip
        header[index + 3] = (this.numberToSkip >> 24) & 0xff;
        header[index + 2] = (this.numberToSkip >> 16) & 0xff;
        header[index + 1] = (this.numberToSkip >> 8) & 0xff;
        header[index] = (this.numberToSkip) & 0xff;
        index = index + 4;

        // Write header information flags numberToReturn
        header[index + 3] = (this.numberToReturn >> 24) & 0xff;
        header[index + 2] = (this.numberToReturn >> 16) & 0xff;
        header[index + 1] = (this.numberToReturn >> 8) & 0xff;
        header[index] = (this.numberToReturn) & 0xff;
        index = index + 4;

        // Return the buffers
        return buffers;
    }

    static getRequestId() {
        return ++_requestId;
    }
}

export class GetMore {
    constructor(bson, ns, cursorId, opts = {}) {
        this.numberToReturn = opts.numberToReturn || 0;
        this.requestId = _requestId++;
        this.bson = bson;
        this.ns = ns;
        this.cursorId = cursorId;
    }

    toBin() {
        const length = 4 + Buffer.byteLength(this.ns) + 1 + 4 + 8 + (4 * 4);
        // Create command buffer
        let index = 0;
        // Allocate buffer
        const _buffer = Buffer.alloc(length);

        // Write header information
        // index = write32bit(index, _buffer, length);
        _buffer[index + 3] = (length >> 24) & 0xff;
        _buffer[index + 2] = (length >> 16) & 0xff;
        _buffer[index + 1] = (length >> 8) & 0xff;
        _buffer[index] = (length) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, requestId);
        _buffer[index + 3] = (this.requestId >> 24) & 0xff;
        _buffer[index + 2] = (this.requestId >> 16) & 0xff;
        _buffer[index + 1] = (this.requestId >> 8) & 0xff;
        _buffer[index] = (this.requestId) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, 0);
        _buffer[index + 3] = (0 >> 24) & 0xff;
        _buffer[index + 2] = (0 >> 16) & 0xff;
        _buffer[index + 1] = (0 >> 8) & 0xff;
        _buffer[index] = (0) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, OP_GETMORE);
        _buffer[index + 3] = (OP_GETMORE >> 24) & 0xff;
        _buffer[index + 2] = (OP_GETMORE >> 16) & 0xff;
        _buffer[index + 1] = (OP_GETMORE >> 8) & 0xff;
        _buffer[index] = (OP_GETMORE) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, 0);
        _buffer[index + 3] = (0 >> 24) & 0xff;
        _buffer[index + 2] = (0 >> 16) & 0xff;
        _buffer[index + 1] = (0 >> 8) & 0xff;
        _buffer[index] = (0) & 0xff;
        index = index + 4;

        // Write collection name
        index = index + _buffer.write(this.ns, index, "utf8") + 1;
        _buffer[index - 1] = 0;

        // Write batch size
        // index = write32bit(index, _buffer, numberToReturn);
        _buffer[index + 3] = (this.numberToReturn >> 24) & 0xff;
        _buffer[index + 2] = (this.numberToReturn >> 16) & 0xff;
        _buffer[index + 1] = (this.numberToReturn >> 8) & 0xff;
        _buffer[index] = (this.numberToReturn) & 0xff;
        index = index + 4;

        // Write cursor id
        // index = write32bit(index, _buffer, cursorId.getLowBits());
        _buffer[index + 3] = (this.cursorId.getLowBits() >> 24) & 0xff;
        _buffer[index + 2] = (this.cursorId.getLowBits() >> 16) & 0xff;
        _buffer[index + 1] = (this.cursorId.getLowBits() >> 8) & 0xff;
        _buffer[index] = (this.cursorId.getLowBits()) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, cursorId.getHighBits());
        _buffer[index + 3] = (this.cursorId.getHighBits() >> 24) & 0xff;
        _buffer[index + 2] = (this.cursorId.getHighBits() >> 16) & 0xff;
        _buffer[index + 1] = (this.cursorId.getHighBits() >> 8) & 0xff;
        _buffer[index] = (this.cursorId.getHighBits()) & 0xff;
        index = index + 4;

        // Return buffer
        return _buffer;
    }
}

export class KillCursor {
    constructor(bson, cursorIds) {
        this.requestId = _requestId++;
        this.cursorIds = cursorIds;
    }

    toBin() {
        const length = 4 + 4 + (4 * 4) + (this.cursorIds.length * 8);

        // Create command buffer
        let index = 0;
        const _buffer = Buffer.alloc(length);

        // Write header information
        // index = write32bit(index, _buffer, length);
        _buffer[index + 3] = (length >> 24) & 0xff;
        _buffer[index + 2] = (length >> 16) & 0xff;
        _buffer[index + 1] = (length >> 8) & 0xff;
        _buffer[index] = (length) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, requestId);
        _buffer[index + 3] = (this.requestId >> 24) & 0xff;
        _buffer[index + 2] = (this.requestId >> 16) & 0xff;
        _buffer[index + 1] = (this.requestId >> 8) & 0xff;
        _buffer[index] = (this.requestId) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, 0);
        _buffer[index + 3] = (0 >> 24) & 0xff;
        _buffer[index + 2] = (0 >> 16) & 0xff;
        _buffer[index + 1] = (0 >> 8) & 0xff;
        _buffer[index] = (0) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, OP_KILL_CURSORS);
        _buffer[index + 3] = (OP_KILL_CURSORS >> 24) & 0xff;
        _buffer[index + 2] = (OP_KILL_CURSORS >> 16) & 0xff;
        _buffer[index + 1] = (OP_KILL_CURSORS >> 8) & 0xff;
        _buffer[index] = (OP_KILL_CURSORS) & 0xff;
        index = index + 4;

        // index = write32bit(index, _buffer, 0);
        _buffer[index + 3] = (0 >> 24) & 0xff;
        _buffer[index + 2] = (0 >> 16) & 0xff;
        _buffer[index + 1] = (0 >> 8) & 0xff;
        _buffer[index] = (0) & 0xff;
        index = index + 4;

        // Write batch size
        // index = write32bit(index, _buffer, this.cursorIds.length);
        _buffer[index + 3] = (this.cursorIds.length >> 24) & 0xff;
        _buffer[index + 2] = (this.cursorIds.length >> 16) & 0xff;
        _buffer[index + 1] = (this.cursorIds.length >> 8) & 0xff;
        _buffer[index] = (this.cursorIds.length) & 0xff;
        index = index + 4;

        // Write all the cursor ids into the array
        for (let i = 0; i < this.cursorIds.length; i++) {
            // Write cursor id
            // index = write32bit(index, _buffer, cursorIds[i].getLowBits());
            _buffer[index + 3] = (this.cursorIds[i].getLowBits() >> 24) & 0xff;
            _buffer[index + 2] = (this.cursorIds[i].getLowBits() >> 16) & 0xff;
            _buffer[index + 1] = (this.cursorIds[i].getLowBits() >> 8) & 0xff;
            _buffer[index] = (this.cursorIds[i].getLowBits()) & 0xff;
            index = index + 4;

            // index = write32bit(index, _buffer, cursorIds[i].getHighBits());
            _buffer[index + 3] = (this.cursorIds[i].getHighBits() >> 24) & 0xff;
            _buffer[index + 2] = (this.cursorIds[i].getHighBits() >> 16) & 0xff;
            _buffer[index + 1] = (this.cursorIds[i].getHighBits() >> 8) & 0xff;
            _buffer[index] = (this.cursorIds[i].getHighBits()) & 0xff;
            index = index + 4;
        }

        // Return buffer
        return _buffer;
    }
}

export class Response {
    constructor(bson, data, opts = { promoteLongs: true, promoteValues: true, promoteBuffers: false }) {
        this.parsed = false;

        //
        // Parse Header
        //
        this.index = 0;
        this.raw = data;
        this.data = data;
        this.bson = bson;
        this.opts = opts;

        // Read the message length
        this.length = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;

        // Fetch the request id for this reply
        this.requestId = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;

        // Fetch the id of the request that triggered the response
        this.responseTo = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;

        // Skip op-code field
        this.index = this.index + 4;

        // Unpack flags
        this.responseFlags = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;

        // Unpack the cursor
        const lowBits = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;
        const highBits = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;
        // Create long object
        this.cursorId = new adone.data.bson.Long(lowBits, highBits);

        // Unpack the starting from
        this.startingFrom = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;

        // Unpack the number of objects returned
        this.numberReturned = data[this.index] |
            data[this.index + 1] << 8 |
            data[this.index + 2] << 16 |
            data[this.index + 3] << 24;
        this.index = this.index + 4;

        // Preallocate document array
        this.documents = new Array(this.numberReturned);

        // Flag values
        this.cursorNotFound = (this.responseFlags & CURSOR_NOT_FOUND) !== 0;
        this.queryFailure = (this.responseFlags & QUERY_FAILURE) !== 0;
        this.shardConfigStale = (this.responseFlags & SHARD_CONFIG_STALE) !== 0;
        this.awaitCapable = (this.responseFlags & AWAIT_CAPABLE) !== 0;
        this.promoteLongs = is.boolean(opts.promoteLongs) ? opts.promoteLongs : true;
        this.promoteValues = is.boolean(opts.promoteValues) ? opts.promoteValues : true;
        this.promoteBuffers = is.boolean(opts.promoteBuffers) ? opts.promoteBuffers : false;
    }

    isParsed() {
        return this.parsed;
    }

    parse(options = {}) {
        // Don't parse again if not needed
        if (this.parsed) {
            return;
        }

        // Allow the return of raw documents instead of parsing
        const raw = options.raw || false;
        const documentsReturnedIn = options.documentsReturnedIn || null;
        const promoteLongs = is.boolean(options.promoteLongs)
            ? options.promoteLongs
            : this.opts.promoteLongs;
        const promoteValues = is.boolean(options.promoteValues)
            ? options.promoteValues
            : this.opts.promoteValues;
        const promoteBuffers = is.boolean(options.promoteBuffers)
            ? options.promoteBuffers
            : this.opts.promoteBuffers;

        // Set up the options
        const _options = {
            promoteLongs,
            promoteValues,
            promoteBuffers
        };

        //
        // Single document and documentsReturnedIn set
        //
        if (this.numberReturned === 1 && !is.nil(documentsReturnedIn) && raw) {
            // Calculate the bson size
            const bsonSize = this.data[this.index] |
                this.data[this.index + 1] << 8 |
                this.data[this.index + 2] << 16 |
                this.data[this.index + 3] << 24;
            // Slice out the buffer containing the command result document
            const document = this.data.slice(this.index, this.index + bsonSize);
            // Set up field we wish to keep as raw
            const fieldsAsRaw = {};
            fieldsAsRaw[documentsReturnedIn] = true;
            _options.fieldsAsRaw = fieldsAsRaw;

            // Deserialize but keep the array of documents in non-parsed form
            const doc = this.bson.deserialize(document, _options);

            // Get the documents
            this.documents = doc.cursor[documentsReturnedIn];
            this.numberReturned = this.documents.length;
            // Ensure we have a Long valie cursor id
            this.cursorId = is.number(doc.cursor.id)
                ? adone.data.bson.Long.fromNumber(doc.cursor.id)
                : doc.cursor.id;

            // Adjust the index
            this.index = this.index + bsonSize;

            // Set as parsed
            this.parsed = true;
            return;
        }

        //
        // Parse Body
        //
        for (let i = 0; i < this.numberReturned; i++) {
            const bsonSize = this.data[this.index] |
                this.data[this.index + 1] << 8 |
                this.data[this.index + 2] << 16 |
                this.data[this.index + 3] << 24;

            // If we have raw results specified slice the return document
            if (raw) {
                this.documents[i] = this.data.slice(this.index, this.index + bsonSize);
            } else {
                this.documents[i] = this.bson.deserialize(
                    this.data.slice(this.index, this.index + bsonSize),
                    _options
                );
            }

            // Adjust the index
            this.index = this.index + bsonSize;
        }

        // Set parsed
        this.parsed = true;
    }
}
