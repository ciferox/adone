const { is, data, database: { mongo } } = adone;
const { __, ObjectId } = mongo;
const { bulk, utils: { shallowClone, toError, handleCallback } } = __;

const bson = new data.bson.BSON();

const addToOperationsList = function (self, docType, document) {
    // Get the bsonSize
    const bsonSize = bson.calculateObjectSize(document, {
        checkKeys: false
    });
    // Throw error if the doc is bigger than the max BSON size
    if (bsonSize >= self.s.maxBatchSizeBytes) {
        throw toError(`document is larger than the maximum size ${self.s.maxBatchSizeBytes}`);
    }
    // Holds the current batch
    self.s.currentBatch = null;
    // Get the right type of batch
    if (docType === bulk.INSERT) {
        self.s.currentBatch = self.s.currentInsertBatch;
    } else if (docType === bulk.UPDATE) {
        self.s.currentBatch = self.s.currentUpdateBatch;
    } else if (docType === bulk.REMOVE) {
        self.s.currentBatch = self.s.currentRemoveBatch;
    }

    // Create a new batch object if we don't have a current one
    if (is.nil(self.s.currentBatch)) {
        self.s.currentBatch = new bulk.Batch(docType, self.s.currentIndex);
    }

    // Check if we need to create a new batch
    if (
        ((self.s.currentBatch.size + 1) >= self.s.maxWriteBatchSize) ||
        ((self.s.currentBatch.sizeBytes + bsonSize) >= self.s.maxBatchSizeBytes) ||
        (self.s.currentBatch.batchType !== docType)
    ) {
        // Save the batch to the execution stack
        self.s.batches.push(self.s.currentBatch);

        // Create a new batch
        self.s.currentBatch = new bulk.Batch(docType, self.s.currentIndex);
    }

    // We have an array of documents
    if (is.array(document)) {
        throw toError("operation passed in cannot be an Array");
    } else {
        self.s.currentBatch.operations.push(document);
        self.s.currentBatch.originalIndexes.push(self.s.currentIndex);
        self.s.currentIndex = self.s.currentIndex + 1;
    }

    // Save back the current Batch to the right type
    if (docType === bulk.INSERT) {
        self.s.currentInsertBatch = self.s.currentBatch;
        self.s.bulkResult.insertedIds.push({ index: self.s.bulkResult.insertedIds.length, _id: document._id });
    } else if (docType === bulk.UPDATE) {
        self.s.currentUpdateBatch = self.s.currentBatch;
    } else if (docType === bulk.REMOVE) {
        self.s.currentRemoveBatch = self.s.currentBatch;
    }

    // Update current batch size
    self.s.currentBatch.size = self.s.currentBatch.size + 1;
    self.s.currentBatch.sizeBytes = self.s.currentBatch.sizeBytes + bsonSize;

    // Return self
    return self;
};

class FindOperatorsUnordered {
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

    removeOne() {
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

    remove() {
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

export default class UnorderedBulkOperation {
    constructor(topology, collection, options) {
        options = is.nil(options) ? {} : options;

        // Get the namesspace for the write operations
        const namespace = collection.collectionName;
        // Used to mark operation as executed
        const executed = false;

        // Current item
        // var currentBatch = null;
        const currentOp = null;

        // Handle to the bson serializer, used to calculate running sizes
        const bson = topology.bson;

        // Set max byte size
        const maxBatchSizeBytes = topology.isMasterDoc && topology.isMasterDoc.maxBsonObjectSize
            ? topology.isMasterDoc.maxBsonObjectSize
            : 1024 * 1025 * 16;
        const maxWriteBatchSize = topology.isMasterDoc && topology.isMasterDoc.maxWriteBatchSize
            ? topology.isMasterDoc.maxWriteBatchSize
            : 1000;

        // Get the write concern
        const writeConcern = bulk.writeConcern(shallowClone(options), collection, options);

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

        // Internal state
        this.s = {
            // Final result
            bulkResult,
            // Current batch state
            currentInsertBatch: null,
            currentUpdateBatch: null,
            currentRemoveBatch: null,
            currentBatch: null,
            currentIndex: 0,
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
            // Bypass validation
            bypassDocumentValidation: is.boolean(options.bypassDocumentValidation)
                ? options.bypassDocumentValidation
                : false
        };
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

        return new FindOperatorsUnordered(this);
    }

    get length() {
        return this.s.currentIndex;
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
            if (op[key].upsert) {
                operation.upsert = true;
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

    _executeBatch(batch, callback) {
        const finalOptions = { ordered: false };
        if (!is.nil(this.s.writeConcern)) {
            finalOptions.writeConcern = this.s.writeConcern;
        }

        const resultHandler = (err, result) => {
            // Error is a driver related error not a bulk op error, terminate
            if (err && err.driver || err && err.message) {
                return handleCallback(callback, err);
            }

            // If we have and error
            if (err) {
                err.ok = 0;
            }
            handleCallback(callback, null, bulk.mergeBatchResults(false, batch, this.s.bulkResult, err, result));
        };

        // Set an operationIf if provided
        if (this.operationId) {
            resultHandler.operationId = this.operationId;
        }

        // Serialize functions
        if (this.s.options.serializeFunctions) {
            finalOptions.serializeFunctions = true;
        }

        // Is the bypassDocumentValidation options specific
        if (this.s.bypassDocumentValidation === true) {
            finalOptions.bypassDocumentValidation = true;
        }

        if (this.s.options.ignoreUndefined) {
            finalOptions.ignoreUndefined = true;
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

    _executeBatches(callback) {
        let numberOfCommandsToExecute = this.s.batches.length;
        // Execute over all the batches
        let error;
        const cb = (err) => {
            // Driver layer error capture it
            if (err) {
                error = err;
            }
            // Count down the number of commands left to execute
            numberOfCommandsToExecute = numberOfCommandsToExecute - 1;

            // Execute
            if (numberOfCommandsToExecute === 0) {
                // Driver level error
                if (error) {
                    return handleCallback(callback, error);
                }
                // Treat write errors
                error = this.s.bulkResult.writeErrors.length > 0 ? toError(this.s.bulkResult.writeErrors[0]) : null;
                handleCallback(callback, error, new bulk.BulkWriteResult(this.s.bulkResult));
            }
        };
        for (let i = 0; i < this.s.batches.length; i++) {
            this._executeBatch(this.s.batches[i], cb);
        }
    }

    execute(writeConcern, callback) {
        if (this.s.executed) {
            throw toError("batch cannot be re-executed");
        }
        if (is.function(writeConcern)) {
            callback = writeConcern;
        } else if (writeConcern && is.object(writeConcern)) {
            this.s.writeConcern = writeConcern;
        }

        // If we have current batch
        if (this.s.currentInsertBatch) {
            this.s.batches.push(this.s.currentInsertBatch);
        }
        if (this.s.currentUpdateBatch) {
            this.s.batches.push(this.s.currentUpdateBatch);
        }
        if (this.s.currentRemoveBatch) {
            this.s.batches.push(this.s.currentRemoveBatch);
        }

        // If we have no operations in the bulk raise an error
        if (this.s.batches.length === 0) {
            throw toError("Invalid Operation, No operations in bulk");
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._executeBatches(callback);
        }

        // Return a Promise
        return new Promise((resolve, reject) => {
            this._executeBatches((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }
}
