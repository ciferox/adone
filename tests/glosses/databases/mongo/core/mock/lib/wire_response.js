const { data: { bson: { BSON } } } = adone;

// Response flags
const CURSOR_NOT_FOUND = 0;
const QUERY_FAILURE = 2;
const SHARD_CONFIG_STALE = 4;
const AWAIT_CAPABLE = 8;

const Response = function (bson, data, opts) {
    opts = opts || { promoteLongs: true };
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
    this.length = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;

  // Fetch the request id for this reply
    this.requestId = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;

  // Fetch the id of the request that triggered the response
    this.responseTo = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;

  // Skip op-code field
    this.index = this.index + 4;

  // Unpack flags
    this.responseFlags = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;

  // Unpack the cursor
    const lowBits = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;
    const highBits = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;
  // Create long object
    this.cursorId = new Long(lowBits, highBits);

  // Unpack the starting from
    this.startingFrom = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;

  // Unpack the number of objects returned
    this.numberReturned = data[this.index] | data[this.index + 1] << 8 | data[this.index + 2] << 16 | data[this.index + 3] << 24;
    this.index = this.index + 4;

  // Preallocate document array
    this.documents = new Array(this.numberReturned);

  // Flag values
    this.cursorNotFound = (this.responseFlags & CURSOR_NOT_FOUND) != 0;
    this.queryFailure = (this.responseFlags & QUERY_FAILURE) != 0;
    this.shardConfigStale = (this.responseFlags & SHARD_CONFIG_STALE) != 0;
    this.awaitCapable = (this.responseFlags & AWAIT_CAPABLE) != 0;
    this.promoteLongs = typeof opts.promoteLongs === "boolean" ? opts.promoteLongs : true;
};

Response.prototype.isParsed = function () {
    return this.parsed;
};

// Validation buffers
const firstBatch = new Buffer("firstBatch", "utf8");
const nextBatch = new Buffer("nextBatch", "utf8");
const cursorId = new Buffer("id", "utf8").toString("hex");

const documentBuffers = {
    firstBatch: firstBatch.toString("hex"),
    nextBatch: nextBatch.toString("hex")
};

Response.prototype.parse = function (options) {
  // Don't parse again if not needed
    if (this.parsed) {
        return;
    }
    options = options || {};

  // Allow the return of raw documents instead of parsing
    const raw = options.raw || false;
    const documentsReturnedIn = options.documentsReturnedIn || null;

  //
  // Single document and documentsReturnedIn set
  //
    if (this.numberReturned == 1 && documentsReturnedIn != null && raw) {
    // Calculate the bson size
        var bsonSize = this.data[this.index] | this.data[this.index + 1] << 8 | this.data[this.index + 2] << 16 | this.data[this.index + 3] << 24;
    // Slice out the buffer containing the command result document
        const document = this.data.slice(this.index, this.index + bsonSize);
    // Set up field we wish to keep as raw
        const fieldsAsRaw = {};
        fieldsAsRaw[documentsReturnedIn] = true;
    // Set up the options
        var _options = { promoteLongs: this.opts.promoteLongs, fieldsAsRaw };

    // Deserialize but keep the array of documents in non-parsed form
        const doc = this.bson.deserialize(document, _options);

    // Get the documents
        this.documents = doc.cursor[documentsReturnedIn];
        this.numberReturned = this.documents.length;
    // Ensure we have a Long valie cursor id
        this.cursorId = typeof doc.cursor.id === "number"
      ? Long.fromNumber(doc.cursor.id)
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
        var bsonSize = this.data[this.index] | this.data[this.index + 1] << 8 | this.data[this.index + 2] << 16 | this.data[this.index + 3] << 24;
    // Parse options
        var _options = { promoteLongs: this.opts.promoteLongs };

    // If we have raw results specified slice the return document
        if (raw) {
            this.documents[i] = this.data.slice(this.index, this.index + bsonSize);
        } else {
            this.documents[i] = this.bson.deserialize(this.data.slice(this.index, this.index + bsonSize), _options);
        }

    // Adjust the index
        this.index = this.index + bsonSize;
    }

  // Set parsed
    this.parsed = true;
};

module.exports = Response;
