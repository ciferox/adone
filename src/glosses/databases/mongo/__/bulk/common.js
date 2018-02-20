const {
    is,
    error,
    database: { mongo }
} = adone;

// Error codes
export const UNKNOWN_ERROR = 8;
export const INVALID_BSON_ERROR = 22;
export const WRITE_CONCERN_ERROR = 64;
export const MULTIPLE_ERROR = 65;

// Insert types
export const INSERT = 1;
export const UPDATE = 2;
export const REMOVE = 3;


// Get write concern
export const writeConcern = function (target, col, options) {
    const writeConcern = {};

    // Collection level write concern
    if (col.writeConcern && !is.nil(col.writeConcern.w)) {
        writeConcern.w = col.writeConcern.w;
    }
    if (col.writeConcern && !is.nil(col.writeConcern.j)) {
        writeConcern.j = col.writeConcern.j;
    }
    if (col.writeConcern && !is.nil(col.writeConcern.fsync)) {
        writeConcern.fsync = col.writeConcern.fsync;
    }
    if (col.writeConcern && !is.nil(col.writeConcern.wtimeout)) {
        writeConcern.wtimeout = col.writeConcern.wtimeout;
    }

    // Options level write concern
    if (options && !is.nil(options.w)) {
        writeConcern.w = options.w;
    }
    if (options && !is.nil(options.wtimeout)) {
        writeConcern.wtimeout = options.wtimeout;
    }
    if (options && !is.nil(options.j)) {
        writeConcern.j = options.j;
    }
    if (options && !is.nil(options.fsync)) {
        writeConcern.fsync = options.fsync;
    }

    // Return write concern
    return writeConcern;
};

class WriteConcernError extends error.Exception {
    constructor(err) {
        super(err.errmsg, false);
        this.err = err;
        Error.captureStackTrace(this, this.constructor);
    }

    get code() {
        return this.err.code;
    }

    get errmsg() {
        return this.err.errmsg;
    }

    toJSON() {
        return { code: this.code, errmsg: this.errmsg };
    }

    toString() {
        return `WriteConcernError(${this.errmsg})`;
    }
}

WriteConcernError.prototype.name = "WriteConcernError";

export class Batch {
    constructor(batchType, originalZeroIndex) {
        this.originalZeroIndex = originalZeroIndex;
        this.currentIndex = 0;
        this.originalIndexes = [];
        this.batchType = batchType;
        this.operations = [];
        this.size = 0;
        this.sizeBytes = 0;
    }
}

export class LegacyOp {
    constructor(batchType, operation, index) {
        this.batchType = batchType;
        this.index = index;
        this.operation = operation;
    }
}

export class BulkWriteResult {
    constructor(bulkResult) {
        this.bulkResult = bulkResult;
    }

    get ok() {
        return this.bulkResult.ok;
    }

    get nInserted() {
        return this.bulkResult.nInserted;
    }

    get nUpserted() {
        return this.bulkResult.nUpserted;
    }

    get nMatched() {
        return this.bulkResult.nMatched;
    }

    get nModified() {
        return this.bulkResult.nModified;
    }

    get nRemoved() {
        return this.bulkResult.nRemoved;
    }

    getInsertedIds() {
        return this.bulkResult.insertedIds;
    }

    getUpsertedIds() {
        return this.bulkResult.upserted;
    }

    getUpsertedIdAt(index) {
        return this.bulkResult.upserted[index];
    }

    getRawResponse() {
        return this.bulkResult;
    }

    hasWriteErrors() {
        return this.bulkResult.writeErrors.length > 0;
    }

    getWriteErrorCount() {
        return this.bulkResult.writeErrors.length;
    }

    getWriteErrorAt(index) {
        if (index < this.bulkResult.writeErrors.length) {
            return this.bulkResult.writeErrors[index];
        }
        return null;
    }

    getWriteErrors() {
        return this.bulkResult.writeErrors;
    }

    getLastOp() {
        return this.bulkResult.lastOp;
    }

    getWriteConcernError() {
        if (this.bulkResult.writeConcernErrors.length === 0) {
            return null;
        } else if (this.bulkResult.writeConcernErrors.length === 1) {
            // Return the error
            return this.bulkResult.writeConcernErrors[0];
        }

        // Combine the errors
        let errmsg = "";
        for (let i = 0; i < this.bulkResult.writeConcernErrors.length; i++) {
            const err = this.bulkResult.writeConcernErrors[i];
            errmsg = errmsg + err.errmsg;

            // TODO: Something better
            if (i === 0) {
                errmsg = `${errmsg} and `;
            }
        }

        return new WriteConcernError({ errmsg, code: WRITE_CONCERN_ERROR });

    }

    toJSON() {
        return this.bulkResult;
    }

    toString() {
        return `BulkWriteResult(${JSON.stringify(this.bulkResult)})`;
    }

    isOk() {
        return this.bulkResult.ok === 1;
    }
}

export class WriteError extends error.Exception {
    constructor(err) {
        super(err.errmsg, false);
        this.err = err;
        Error.captureStackTrace(this, this.constructor);
    }

    get code() {
        return this.err.code;
    }

    get index() {
        return this.err.index;
    }

    get errmsg() {
        return this.err.errmsg;
    }

    getOperation() {
        return this.err.op;
    }

    toJSON() {
        const { err } = this;
        return { code: err.code, index: err.index, errmsg: err.errmsg, op: err.op };
    }

    toString() {
        return `WriteError(${JSON.stringify(this.toJSON())})`;
    }
}

WriteError.prototype.name = "WriteError";

export const mergeBatchResults = (ordered, batch, bulkResult, err, result) => {
    // If we have an error set the result to be the err object
    if (err) {
        result = err;
    } else if (result && result.result) {
        result = result.result;
    } else if (is.nil(result)) {
        return;
    }

    // Do we have a top level error stop processing and return
    if (result.ok === 0 && bulkResult.ok === 1) {
        bulkResult.ok = 0;

        const writeError = {
            index: 0,
            code: result.code || 0,
            errmsg: result.message,
            op: batch.operations[0]
        };

        bulkResult.writeErrors.push(new WriteError(writeError));
        return;
    } else if (result.ok === 0 && bulkResult.ok === 0) {
        return;
    }

    // Deal with opTime if available
    if (result.opTime || result.lastOp) {
        const opTime = result.lastOp || result.opTime;
        let lastOpTS = null;
        let lastOpT = null;

        // We have a time stamp
        if (opTime && opTime._bsontype === "Timestamp") {
            if (is.nil(bulkResult.lastOp)) {
                bulkResult.lastOp = opTime;
            } else if (opTime.greaterThan(bulkResult.lastOp)) {
                bulkResult.lastOp = opTime;
            }
        } else {
            const { Long } = mongo;
            // Existing TS
            if (bulkResult.lastOp) {
                lastOpTS = is.number(bulkResult.lastOp.ts)
                    ? Long.fromNumber(bulkResult.lastOp.ts)
                    : bulkResult.lastOp.ts;
                lastOpT = is.number(bulkResult.lastOp.t)
                    ? Long.fromNumber(bulkResult.lastOp.t)
                    : bulkResult.lastOp.t;
            }

            // Current OpTime TS
            const opTimeTS = is.number(opTime.ts)
                ? Long.fromNumber(opTime.ts)
                : opTime.ts;
            const opTimeT = is.number(opTime.t)
                ? Long.fromNumber(opTime.t)
                : opTime.t;

            // Compare the opTime's
            if (is.nil(bulkResult.lastOp)) {
                bulkResult.lastOp = opTime;
            } else if (opTimeTS.greaterThan(lastOpTS)) {
                bulkResult.lastOp = opTime;
            } else if (opTimeTS.equals(lastOpTS)) {
                if (opTimeT.greaterThan(lastOpT)) {
                    bulkResult.lastOp = opTime;
                }
            }
        }
    }

    // If we have an insert Batch type
    if (batch.batchType === INSERT && result.n) {
        bulkResult.nInserted = bulkResult.nInserted + result.n;
    }

    // If we have an insert Batch type
    if (batch.batchType === REMOVE && result.n) {
        bulkResult.nRemoved = bulkResult.nRemoved + result.n;
    }

    let nUpserted = 0;

    // We have an array of upserted values, we need to rewrite the indexes
    if (is.array(result.upserted)) {
        nUpserted = result.upserted.length;

        for (let i = 0; i < result.upserted.length; i++) {
            bulkResult.upserted.push({
                index: result.upserted[i].index + batch.originalZeroIndex,
                _id: result.upserted[i]._id
            });
        }
    } else if (result.upserted) {

        nUpserted = 1;

        bulkResult.upserted.push({
            index: batch.originalZeroIndex,
            _id: result.upserted
        });
    }

    // If we have an update Batch type
    if (batch.batchType === UPDATE && result.n) {
        const nModified = result.nModified;
        bulkResult.nUpserted = bulkResult.nUpserted + nUpserted;
        bulkResult.nMatched = bulkResult.nMatched + (result.n - nUpserted);

        if (is.number(nModified)) {
            bulkResult.nModified = bulkResult.nModified + nModified;
        } else {
            bulkResult.nModified = null;
        }
    }

    if (is.array(result.writeErrors)) {
        for (let i = 0; i < result.writeErrors.length; i++) {

            const writeError = {
                index: batch.originalZeroIndex + result.writeErrors[i].index,
                code: result.writeErrors[i].code,
                errmsg: result.writeErrors[i].errmsg,
                op: batch.operations[result.writeErrors[i].index]
            };

            bulkResult.writeErrors.push(new WriteError(writeError));
        }
    }

    if (result.writeConcernError) {
        bulkResult.writeConcernErrors.push(new WriteConcernError(result.writeConcernError));
    }
};

//
// Clone the options
export const cloneOptions = (options) => {
    const clone = {};
    const keys = Object.keys(options);
    for (let i = 0; i < keys.length; i++) {
        clone[keys[i]] = options[keys[i]];
    }

    return clone;
};
