const { is, data, database: { mongo } } = adone;
const { ObjectId, __ } = mongo;
const { bulk, metadata, utils: { toError, shallowClone, handleCallback } } = __;
const { classMethod } = metadata;

const bson = new data.bson.BSON();

const addToOperationsList = (self, docType, document) => {
    // Get the bsonSize
    const bsonSize = bson.calculateObjectSize(document, {
        checkKeys: false
    });

    // Throw error if the doc is bigger than the max BSON size
    if (bsonSize >= self.s.maxBatchSizeBytes) {
        throw toError(`document is larger than the maximum size ${self.s.maxBatchSizeBytes}`);
    }

    // Create a new batch object if we don't have a current one
    if (is.nil(self.s.currentBatch)) {
        self.s.currentBatch = new bulk.Batch(docType, self.s.currentIndex);
    }

    // Check if we need to create a new batch
    if (
        ((self.s.currentBatchSize + 1) >= self.s.maxWriteBatchSize) ||
        ((self.s.currentBatchSizeBytes + self.s.currentBatchSizeBytes) >= self.s.maxBatchSizeBytes) ||
        (self.s.currentBatch.batchType !== docType)
    ) {
        // Save the batch to the execution stack
        self.s.batches.push(self.s.currentBatch);

        // Create a new batch
        self.s.currentBatch = new bulk.Batch(docType, self.s.currentIndex);

        // Reset the current size trackers
        self.s.currentBatchSize = 0;
        self.s.currentBatchSizeBytes = 0;
    } else {
        // Update current batch size
        self.s.currentBatchSize = self.s.currentBatchSize + 1;
        self.s.currentBatchSizeBytes = self.s.currentBatchSizeBytes + bsonSize;
    }

    if (docType === bulk.INSERT) {
        self.s.bulkResult.insertedIds.push({ index: self.s.currentIndex, _id: document._id });
    }

    // We have an array of documents
    if (is.array(document)) {
        throw toError("operation passed in cannot be an Array");
    } else {
        self.s.currentBatch.originalIndexes.push(self.s.currentIndex);
        self.s.currentBatch.operations.push(document);
        self.s.currentBatchSizeBytes = self.s.currentBatchSizeBytes + bsonSize;
        self.s.currentIndex = self.s.currentIndex + 1;
    }

    // Return self
    return self;
};

class FindOperatorsOrdered {
    constructor(self) {
        this.s = self.s;
    }

    update(updateDocument) {
        // Perform upsert
        const upsert = is.boolean(this.s.currentOp.upsert) ? this.s.currentOp.upsert : false;

        // Establish the update command
        const document = {
            q: this.s.currentOp.selector,
            u: updateDocument,
            multi: true,
            upsert
        };

        // Clear out current Op
        this.s.currentOp = null;
        // Add the update document to the list
        return addToOperationsList(this, bulk.UPDATE, document);
    }

    updateOne(updateDocument) {
        // Perform upsert
        const upsert = is.boolean(this.s.currentOp.upsert) ? this.s.currentOp.upsert : false;

        // Establish the update command
        const document = {
            q: this.s.currentOp.selector,
            u: updateDocument,
            multi: false,
            upsert
        };

        // Clear out current Op
        this.s.currentOp = null;
        // Add the update document to the list
        return addToOperationsList(this, bulk.UPDATE, document);
    }

    replaceOne(updateDocument) {
        this.updateOne(updateDocument);
    }

    upsert() {
        this.s.currentOp.upsert = true;
        return this;
    }

    deleteOne() {
        // Establish the update command
        const document = {
            q: this.s.currentOp.selector,
            limit: 1
        };

        // Clear out current Op
        this.s.currentOp = null;
        // Add the remove document to the list
        return addToOperationsList(this, bulk.REMOVE, document);
    }

    delete() {
        // Establish the update command
        const document = {
            q: this.s.currentOp.selector,
            limit: 0
        };

        // Clear out current Op
        this.s.currentOp = null;
        // Add the remove document to the list
        return addToOperationsList(this, bulk.REMOVE, document);
    }
}

// Backward compatibility
FindOperatorsOrdered.prototype.removeOne = FindOperatorsOrdered.prototype.deleteOne;
FindOperatorsOrdered.prototype.remove = FindOperatorsOrdered.prototype.delete;

@metadata("OrderedBulkOperation")
export default class OrderedBulkOperation {
    constructor(topology, collection, options) {
        options = is.nil(options) ? {} : options;
        // TODO Bring from driver information in isMaster
        const executed = false;

        // Current item
        const currentOp = null;

        // Handle to the bson serializer, used to calculate running sizes
        const bson = topology.bson;

        // Namespace for the operation
        const namespace = collection.collectionName;

        // Set max byte size
        const maxBatchSizeBytes = topology.isMasterDoc && topology.isMasterDoc.maxBsonObjectSize
            ? topology.isMasterDoc.maxBsonObjectSize
            : 1024 * 1025 * 16;
        const maxWriteBatchSize = topology.isMasterDoc && topology.isMasterDoc.maxWriteBatchSize
            ? topology.isMasterDoc.maxWriteBatchSize
            : 1000;

        // Get the write concern
        const writeConcern = bulk.writeConcern(shallowClone(options), collection, options);

        // Get the promiseLibrary
        let promiseLibrary = options.promiseLibrary;

        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // Final results
        const bulkResult = {
            ok: 1,
            writeErrors: [],
            writeConcernErrors: [],
            insertedIds: [],
            nInserted: 0,
            nUpserted: 0,
            nMatched: 0,
            nModified: 0,
            nRemoved: 0,
            upserted: []
        };

        this.s = {
            // Final result
            bulkResult,
            // Current batch state
            currentBatch: null,
            currentIndex: 0,
            currentBatchSize: 0,
            currentBatchSizeBytes: 0,
            batches: [],
            // Write concern
            writeConcern,
            // Max batch size options
            maxBatchSizeBytes,
            maxWriteBatchSize,
            // Namespace
            namespace,
            // BSON
            bson,
            // Topology
            topology,
            // Options
            options,
            // Current operation
            currentOp,
            // Executed
            executed,
            // Collection
            collection,
            // Promise Library
            promiseLibrary,
            // Fundamental error
            err: null,
            // Bypass validation
            bypassDocumentValidation: is.boolean(options.bypassDocumentValidation)
                ? options.bypassDocumentValidation
                : false
        };
    }

    raw(op) {
        const key = Object.keys(op)[0];

        // Set up the force server object id
        const forceServerObjectId = is.boolean(this.s.options.forceServerObjectId)
            ? this.s.options.forceServerObjectId
            : this.s.collection.s.db.options.forceServerObjectId;

        // Update operations
        if (
            (op.updateOne && op.updateOne.q) ||
            (op.updateMany && op.updateMany.q) ||
            (op.replaceOne && op.replaceOne.q)
        ) {
            op[key].multi = op.updateOne || op.replaceOne ? false : true;
            return addToOperationsList(this, bulk.UPDATE, op[key]);
        }

        // Crud spec update format
        if (op.updateOne || op.updateMany || op.replaceOne) {
            const multi = op.updateOne || op.replaceOne ? false : true;
            const operation = { q: op[key].filter, u: op[key].update || op[key].replacement, multi };
            operation.upsert = op[key].upsert ? true : false;
            if (op.collation) {
                operation.collation = op.collation;
            }
            return addToOperationsList(this, bulk.UPDATE, operation);
        }

        // Remove operations
        if (op.removeOne || op.removeMany || (op.deleteOne && op.deleteOne.q) || op.deleteMany && op.deleteMany.q) {
            op[key].limit = op.removeOne ? 1 : 0;
            return addToOperationsList(this, bulk.REMOVE, op[key]);
        }

        // Crud spec delete operations, less efficient
        if (op.deleteOne || op.deleteMany) {
            const limit = op.deleteOne ? 1 : 0;
            const operation = { q: op[key].filter, limit };
            if (op.collation) {
                operation.collation = op.collation;
            }
            return addToOperationsList(this, bulk.REMOVE, operation);
        }

        // Insert operations
        if (op.insertOne && is.nil(op.insertOne.document)) {
            if (forceServerObjectId !== true && is.nil(op.insertOne._id)) {
                op.insertOne._id = new ObjectId();
            }
            return addToOperationsList(this, bulk.INSERT, op.insertOne);
        } else if (op.insertOne && op.insertOne.document) {
            if (forceServerObjectId !== true && is.nil(op.insertOne.document._id)) {
                op.insertOne.document._id = new ObjectId();
            }
            return addToOperationsList(this, bulk.INSERT, op.insertOne.document);
        }

        if (op.insertMany) {
            for (let i = 0; i < op.insertMany.length; i++) {
                if (forceServerObjectId !== true && is.nil(op.insertMany[i]._id)) {
                    op.insertMany[i]._id = new ObjectId();
                }
                addToOperationsList(this, bulk.INSERT, op.insertMany[i]);
            }

            return;
        }

        // No valid type of operation
        throw toError("bulkWrite only supports insertOne, insertMany, updateOne, updateMany, removeOne, removeMany, deleteOne, deleteMany");
    }

    insert(document) {
        if (this.s.collection.s.db.options.forceServerObjectId !== true && is.nil(document._id)) {
            document._id = new ObjectId();
        }
        return addToOperationsList(this, bulk.INSERT, document);
    }

    find(selector) {
        if (!selector) {
            throw toError("Bulk find operation must specify a selector");
        }

        // Save a current selector
        this.s.currentOp = {
            selector
        };

        return new FindOperatorsOrdered(this);
    }

    get length() {
        return this.s.currentIndex;
    }

    _executeCommands(callback) {
        if (this.s.batches.length === 0) {
            return handleCallback(callback, null, new bulk.BulkWriteResult(this.s.bulkResult));
        }

        // Ordered execution of the command
        const batch = this.s.batches.shift();
        const resultHandler = (err, result) => {
            // Error is a driver related error not a bulk op error, terminate
            if (err && err.driver || err && err.message) {
                return handleCallback(callback, err);
            }

            // If we have and error
            if (err) {
                err.ok = 0;
            }
            // Merge the results together
            const mergeResult = bulk.mergeBatchResults(true, batch, this.s.bulkResult, err, result);
            if (!is.nil(mergeResult)) {
                return handleCallback(callback, null, new bulk.BulkWriteResult(this.s.bulkResult));
            }

            // If we are ordered and have errors and they are
            // not all replication errors terminate the operation
            if (this.s.bulkResult.writeErrors.length > 0) {
                return handleCallback(
                    callback,
                    toError(this.s.bulkResult.writeErrors[0]),
                    new bulk.BulkWriteResult(this.s.bulkResult)
                );
            }

            // Execute the next command in line
            this._executeCommands(callback);
        };

        const finalOptions = { ordered: true };
        if (!is.nil(this.s.writeConcern)) {
            finalOptions.writeConcern = this.s.writeConcern;
        }

        // Set an operationIf if provided
        if (this.operationId) {
            resultHandler.operationId = this.operationId;
        }

        // Serialize functions
        if (this.s.options.serializeFunctions) {
            finalOptions.serializeFunctions = true;
        }

        // Serialize functions
        if (this.s.options.ignoreUndefined) {
            finalOptions.ignoreUndefined = true;
        }

        // Is the bypassDocumentValidation options specific
        if (this.s.bypassDocumentValidation === true) {
            finalOptions.bypassDocumentValidation = true;
        }

        try {
            if (batch.batchType === bulk.INSERT) {
                this.s.topology.insert(this.s.collection.namespace, batch.operations, finalOptions, resultHandler);
            } else if (batch.batchType === bulk.UPDATE) {
                this.s.topology.update(this.s.collection.namespace, batch.operations, finalOptions, resultHandler);
            } else if (batch.batchType === bulk.REMOVE) {
                this.s.topology.remove(this.s.collection.namespace, batch.operations, finalOptions, resultHandler);
            }
        } catch (err) {
            // Force top level error
            err.ok = 0;
            // Merge top level error and return
            handleCallback(callback, null, bulk.mergeBatchResults(false, batch, this.s.bulkResult, err, null));
        }
    }

    @classMethod({ callback: true, promise: true })
    execute(_writeConcern, callback) {
        if (this.s.executed) {
            throw toError("batch cannot be re-executed");
        }
        if (is.function(_writeConcern)) {
            callback = _writeConcern;
        } else if (_writeConcern && is.object(_writeConcern)) {
            this.s.writeConcern = _writeConcern;
        }

        // If we have current batch
        if (this.s.currentBatch) {
            this.s.batches.push(this.s.currentBatch);
        }

        // If we have no operations in the bulk raise an error
        if (this.s.batches.length === 0) {
            throw toError("Invalid Operation, No operations in bulk");
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._executeCommands(callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._executeCommands((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }
}
