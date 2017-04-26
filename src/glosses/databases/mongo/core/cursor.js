const { is, x, database: { mongo: { core: { MongoError } } } } = adone;

// Handle callback (including any exceptions thrown)
const handleCallback = function (callback, err, result) {
    try {
        callback(err, result);
    } catch (err) {
        process.nextTick(() => {
            throw err;
        });
    }
};


/**
 * Validate if the pool is dead and return error
 */
const isConnectionDead = function (self, callback) {
    if (self.pool && self.pool.isDestroyed()) {
        self.cursorState.notified = true;
        self.cursorState.killed = true;
        self.cursorState.documents = [];
        self.cursorState.cursorIndex = 0;
        callback(MongoError.create(`connection to host ${self.pool.host}:${self.pool.port} was destroyed`));
        return true;
    }

    return false;
};

/**
 * Validate if the cursor is dead but was not explicitly killed by user
 */
const isCursorDeadButNotkilled = function (self, callback) {
    // Cursor is dead but not marked killed, return null
    if (self.cursorState.dead && !self.cursorState.killed) {
        self.cursorState.notified = true;
        self.cursorState.killed = true;
        self.cursorState.documents = [];
        self.cursorState.cursorIndex = 0;
        handleCallback(callback, null, null);
        return true;
    }

    return false;
};

/**
 * Validate if the cursor is dead and was killed by user
 */
const isCursorDeadAndKilled = function (self, callback) {
    if (self.cursorState.dead && self.cursorState.killed) {
        handleCallback(callback, MongoError.create("cursor is dead"));
        return true;
    }

    return false;
};

/**
 * Validate if the cursor was killed by the user
 */
const isCursorKilled = function (self, callback) {
    if (self.cursorState.killed) {
        self.cursorState.notified = true;
        self.cursorState.documents = [];
        self.cursorState.cursorIndex = 0;
        handleCallback(callback, null, null);
        return true;
    }

    return false;
};

/**
 * Mark cursor as being dead and notified
 */
const setCursorDeadAndNotified = function (self, callback) {
    self.cursorState.dead = true;
    self.cursorState.notified = true;
    self.cursorState.documents = [];
    self.cursorState.cursorIndex = 0;
    handleCallback(callback, null, null);
};

/**
 * Mark cursor as being notified
 */
const setCursorNotified = function (self, callback) {
    self.cursorState.notified = true;
    self.cursorState.documents = [];
    self.cursorState.cursorIndex = 0;
    handleCallback(callback, null, null);
};

/**
 * @fileOverview The **Cursor** class is an internal class that embodies a cursor on MongoDB
 * allowing for iteration over the results returned from the underlying query.
 *
 * **CURSORS Cannot directly be instantiated**
 */

/**
 * Creates a new Cursor, not to be used directly
 * @class
 * @param {object} bson An instance of the BSON parser
 * @param {string} ns The MongoDB fully qualified namespace (ex: db1.collection1)
 * @param {{object}|Long} cmd The selector (can be a command or a cursorId)
 * @param {object} [options=null] Optional settings.
 * @param {object} [options.batchSize=1000] Batchsize for the operation
 * @param {array} [options.documents=[]] Initial documents list for cursor
 * @param {object} [options.transforms=null] Transform methods for the cursor results
 * @param {function} [options.transforms.query] Transform the value returned from the initial query
 * @param {function} [options.transforms.doc] Transform each document returned from Cursor.prototype.next
 * @param {object} topology The server topology instance.
 * @param {object} topologyOptions The server topology options.
 * @return {Cursor} A cursor instance
 * @property {number} cursorBatchSize The current cursorBatchSize for the cursor
 * @property {number} cursorLimit The current cursorLimit for the cursor
 * @property {number} cursorSkip The current cursorSkip for the cursor
 */
export default class Cursor {
    constructor(bson, ns, cmd, options = {}, topology, topologyOptions) {
        // Cursor pool
        this.pool = null;
        // Cursor server
        this.server = null;

        // Do we have a not connected handler
        this.disconnectHandler = options.disconnectHandler;

        // Set local values
        this.bson = bson;
        this.ns = ns;
        this.cmd = cmd;
        this.options = options;
        this.topology = topology;

        // All internal state
        this.cursorState = {
            cursorId: null,
            cmd,
            documents: options.documents || [],
            cursorIndex: 0,
            dead: false,
            killed: false,
            init: false,
            notified: false,
            limit: options.limit || cmd.limit || 0,
            skip: options.skip || cmd.skip || 0,
            batchSize: options.batchSize || cmd.batchSize || 1000,
            currentLimit: 0,
            // Result field name if not a cursor (contains the array of results)
            transforms: options.transforms
        };

        // Add promoteLong to cursor state
        if (is.boolean(topologyOptions.promoteLongs)) {
            this.cursorState.promoteLongs = topologyOptions.promoteLongs;
        } else if (is.boolean(options.promoteLongs)) {
            this.cursorState.promoteLongs = options.promoteLongs;
        }

        // Add promoteValues to cursor state
        if (is.boolean(topologyOptions.promoteValues)) {
            this.cursorState.promoteValues = topologyOptions.promoteValues;
        } else if (is.boolean(options.promoteValues)) {
            this.cursorState.promoteValues = options.promoteValues;
        }

        // Add promoteBuffers to cursor state
        if (is.boolean(topologyOptions.promoteBuffers)) {
            this.cursorState.promoteBuffers = topologyOptions.promoteBuffers;
        } else if (is.boolean(options.promoteBuffers)) {
            this.cursorState.promoteBuffers = options.promoteBuffers;
        }

        //
        // Did we pass in a cursor id
        const { data: { bson: { Long } } } = adone;
        if (is.number(cmd)) {
            this.cursorState.cursorId = Long.fromNumber(cmd);
            this.cursorState.lastCursorId = this.cursorState.cursorId;
        } else if (cmd instanceof Long) {
            this.cursorState.cursorId = cmd;
            this.cursorState.lastCursorId = cmd;
        }
    }

    setCursorBatchSize(value) {
        this.cursorState.batchSize = value;
    }

    cursorBatchSize() {
        return this.cursorState.batchSize;
    }

    setCursorLimit(value) {
        this.cursorState.limit = value;
    }

    cursorLimit() {
        return this.cursorState.limit;
    }

    setCursorSkip(value) {
        this.cursorState.skip = value;
    }

    cursorSkip() {
        return this.cursorState.skip;
    }

    _find(callback) {
        const self = this;

        const queryCallback = function (err, r) {
            if (err) {
                return callback(err);
            }

            // Get the raw message
            const result = r.message;

            // Query failure bit set
            if (result.queryFailure) {
                return callback(MongoError.create(result.documents[0]), null);
            }

            // Check if we have a command cursor
            if (
                is.array(result.documents) && result.documents.length === 1 &&
                (!self.cmd.find || (self.cmd.find && self.cmd.virtual === false)) &&
                (
                    !is.string(result.documents[0].cursor) ||
                    result.documents[0].$err ||
                    result.documents[0].errmsg ||
                    is.array(result.documents[0].result)
                )
            ) {

                // We have a an error document return the error
                if (result.documents[0].$err || result.documents[0].errmsg) {
                    return callback(MongoError.create(result.documents[0]), null);
                }

                // We have a cursor document
                if (!is.nil(result.documents[0].cursor) && !is.string(result.documents[0].cursor)) {
                    const id = result.documents[0].cursor.id;
                    // If we have a namespace change set the new namespace for getmores
                    if (result.documents[0].cursor.ns) {
                        self.ns = result.documents[0].cursor.ns;
                    }
                    // Promote id to long if needed
                    self.cursorState.cursorId = is.number(id) ? adone.data.bson.Long.fromNumber(id) : id;
                    self.cursorState.lastCursorId = self.cursorState.cursorId;
                    // If we have a firstBatch set it
                    if (is.array(result.documents[0].cursor.firstBatch)) {
                        self.cursorState.documents = result.documents[0].cursor.firstBatch;//.reverse();
                    }

                    // Return after processing command cursor
                    return callback(null, null);
                }

                if (is.array(result.documents[0].result)) {
                    self.cursorState.documents = result.documents[0].result;
                    self.cursorState.cursorId = adone.data.bson.Long.ZERO;
                    return callback(null, null);
                }
            }

            // Otherwise fall back to regular find path
            self.cursorState.cursorId = result.cursorId;
            self.cursorState.documents = result.documents;
            self.cursorState.lastCursorId = result.cursorId;

            // Transform the results with passed in transformation method if provided
            if (self.cursorState.transforms && is.function(self.cursorState.transforms.query)) {
                self.cursorState.documents = self.cursorState.transforms.query(result);
            }

            // Return callback
            callback(null, null);
        };

        // Options passed to the pool
        const queryOptions = {};

        // If we have a raw query decorate the function
        if (self.options.raw || self.cmd.raw) {
            // queryCallback.raw = self.options.raw || self.cmd.raw;
            queryOptions.raw = self.options.raw || self.cmd.raw;
        }

        // Do we have documentsReturnedIn set on the query
        if (is.string(self.query.documentsReturnedIn)) {
            // queryCallback.documentsReturnedIn = self.query.documentsReturnedIn;
            queryOptions.documentsReturnedIn = self.query.documentsReturnedIn;
        }

        // Add promote Long value if defined
        if (is.boolean(self.cursorState.promoteLongs)) {
            queryOptions.promoteLongs = self.cursorState.promoteLongs;
        }

        // Add promote values if defined
        if (is.boolean(self.cursorState.promoteValues)) {
            queryOptions.promoteValues = self.cursorState.promoteValues;
        }

        // Add promote values if defined
        if (is.boolean(self.cursorState.promoteBuffers)) {
            queryOptions.promoteBuffers = self.cursorState.promoteBuffers;
        }

        // Write the initial command out
        self.server.s.pool.write(self.query, queryOptions, queryCallback);
    }

    _getmore(callback) {
        // Determine if it's a raw query
        const raw = this.options.raw || this.cmd.raw;

        // Set the current batchSize
        let batchSize = this.cursorState.batchSize;
        if (this.cursorState.limit > 0
            && ((this.cursorState.currentLimit + batchSize) > this.cursorState.limit)) {
            batchSize = this.cursorState.limit - this.cursorState.currentLimit;
        }

        // Default pool
        const pool = this.server.s.pool;

        // We have a wire protocol handler
        this.server.wireProtocolHandler.getMore(
            this.bson,
            this.ns,
            this.cursorState,
            batchSize,
            raw,
            pool,
            this.options,
            callback
        );
    }

    _killcursor(callback) {
        // Set cursor to dead
        this.cursorState.dead = true;
        this.cursorState.killed = true;
        // Remove documents
        this.cursorState.documents = [];

        // If no cursor id just return
        if (
            is.nil(this.cursorState.cursorId) ||
            this.cursorState.cursorId.isZero() ||
            this.cursorState.init === false
        ) {
            if (callback) {
                callback(null, null);
            }
            return;
        }

        // Default pool
        const pool = this.server.s.pool;
        // Execute command
        this.server.wireProtocolHandler.killCursor(this.bson, this.ns, this.cursorState.cursorId, pool, callback);
    }

    /**
     * Clone the cursor
     * @method
     * @return {Cursor}
     */
    clone() {
        return this.topology.cursor(this.ns, this.cmd, this.options);
    }

    /**
     * Checks if the cursor is dead
     * @method
     * @return {boolean} A boolean signifying if the cursor is dead or not
     */
    isDead() {
        return this.cursorState.dead === true;
    }

    /**
     * Checks if the cursor was killed by the application
     * @method
     * @return {boolean} A boolean signifying if the cursor was killed by the application
     */
    isKilled() {
        return this.cursorState.killed === true;
    }

    /**
     * Checks if the cursor notified it's caller about it's death
     * @method
     * @return {boolean} A boolean signifying if the cursor notified the callback
     */
    isNotified() {
        return this.cursorState.notified === true;
    }

    /**
     * Returns current buffered documents length
     * @method
     * @return {number} The number of items in the buffered documents
     */
    bufferedCount() {
        return this.cursorState.documents.length - this.cursorState.cursorIndex;
    }

    /**
     * Returns current buffered documents
     * @method
     * @return {Array} An array of buffered documents
     */
    readBufferedDocuments(number) {
        const unreadDocumentsLength = this.cursorState.documents.length - this.cursorState.cursorIndex;
        const length = number < unreadDocumentsLength ? number : unreadDocumentsLength;
        let elements = this.cursorState.documents.slice(
            this.cursorState.cursorIndex,
            this.cursorState.cursorIndex + length
        );

        // Transform the doc with passed in transformation method if provided
        if (this.cursorState.transforms && is.function(this.cursorState.transforms.doc)) {
            // Transform all the elements
            for (let i = 0; i < elements.length; i++) {
                elements[i] = this.cursorState.transforms.doc(elements[i]);
            }
        }

        // Ensure we do not return any more documents than the limit imposed
        // Just return the number of elements up to the limit
        if (
            this.cursorState.limit > 0 &&
            (this.cursorState.currentLimit + elements.length) > this.cursorState.limit
        ) {
            elements = elements.slice(0, (this.cursorState.limit - this.cursorState.currentLimit));
            this.kill();
        }

        // Adjust current limit
        this.cursorState.currentLimit = this.cursorState.currentLimit + elements.length;
        this.cursorState.cursorIndex = this.cursorState.cursorIndex + elements.length;

        // Return elements
        return elements;
    }

    /**
     * Kill the cursor
     * @method
     * @param {resultCallback} callback A callback function
     */
    kill(callback) {
        this._killcursor(callback);
    }

    /**
     * Resets the cursor
     * @method
     * @return {null}
     */
    rewind() {
        if (this.cursorState.init) {
            if (!this.cursorState.dead) {
                this.kill();
            }

            this.cursorState.currentLimit = 0;
            this.cursorState.init = false;
            this.cursorState.dead = false;
            this.cursorState.killed = false;
            this.cursorState.notified = false;
            this.cursorState.documents = [];
            this.cursorState.cursorId = null;
            this.cursorState.cursorIndex = 0;
        }
    }

    /**
     * Retrieve the next document from the cursor
     * @method
     * @param {resultCallback} callback A callback function
     */
    next(callback) {
        // We have notified about it
        if (this.cursorState.notified) {
            return callback(new x.IllegalState("cursor is exhausted"));
        }

        // Cursor is killed return null
        if (isCursorKilled(this, callback)) {
            return;
        }

        // Cursor is dead but not marked killed, return null
        if (isCursorDeadButNotkilled(this, callback)) {
            return;
        }

        // We have a dead and killed cursor, attempting to call next should error
        if (isCursorDeadAndKilled(this, callback)) {
            return;
        }

        // We have just started the cursor
        if (!this.cursorState.init) {
            // Topology is not connected, save the call in the provided store to be
            // Executed at some point when the handler deems it's reconnected
            if (!this.topology.isConnected(this.options) && !is.nil(this.disconnectHandler)) {
                if (this.topology.isDestroyed()) {
                    // Topology was destroyed, so don't try to wait for it to reconnect
                    return callback(new MongoError("Topology was destroyed"));
                }
                return this.disconnectHandler.addObjectAndMethod("cursor", this, "next", [callback], callback);
            }

            try {
                this.server = this.topology.getServer(this.options);
            } catch (err) {
                // Handle the error and add object to next method call
                if (!is.nil(this.disconnectHandler)) {
                    return this.disconnectHandler.addObjectAndMethod("cursor", this, "next", [callback], callback);
                }

                // Otherwise return the error
                return callback(err);
            }

            // Set as init
            this.cursorState.init = true;

            // Server does not support server
            if (this.cmd && this.cmd.collation && this.server.ismaster.maxWireVersion < 5) {
                return callback(new MongoError(`server ${this.server.name} does not support collation`));
            }

            try {
                this.query = this.server.wireProtocolHandler.command(
                    this.bson,
                    this.ns,
                    this.cmd,
                    this.cursorState,
                    this.topology,
                    this.options
                );
            } catch (err) {
                return callback(err);
            }
        }

        const { data: { bson: { Long } } } = adone;

        // If we don't have a cursorId execute the first query
        if (is.nil(this.cursorState.cursorId)) {
            // Check if pool is dead and return if not possible to
            // execute the query against the db
            if (isConnectionDead(this, callback)) {
                return;
            }

            // Check if topology is destroyed
            if (this.topology.isDestroyed()) {
                return callback(new MongoError("connection destroyed, not possible to instantiate cursor"));
            }

            // query, cmd, options, cursorState, callback
            this._find((err) => {
                if (err) {
                    return handleCallback(callback, err, null);
                }

                if (
                    this.cursorState.documents.length === 0 &&
                    this.cursorState.cursorId &&
                    this.cursorState.cursorId.isZero() &&
                    !this.cmd.tailable &&
                    !this.cmd.awaitData
                ) {
                    return setCursorNotified(this, callback);
                }

                this.next(callback);
            });
        } else if (this.cursorState.limit > 0 && this.cursorState.currentLimit >= this.cursorState.limit) {
            // Ensure we kill the cursor on the server
            this.kill();
            // Set cursor in dead and notified state
            return setCursorDeadAndNotified(this, callback);
        } else if (
            this.cursorState.cursorIndex === this.cursorState.documents.length &&
            !Long.ZERO.equals(this.cursorState.cursorId)
        ) {
            // Ensure an empty cursor state
            this.cursorState.documents = [];
            this.cursorState.cursorIndex = 0;

            // Check if topology is destroyed
            if (this.topology.isDestroyed()) {
                return callback(new MongoError("connection destroyed, not possible to instantiate cursor"));
            }

            // Check if connection is dead and return if not possible to
            // execute a getmore on this connection
            if (isConnectionDead(this, callback)) {
                return;
            }

            // Execute the next get more
            this._getmore((err, doc, connection) => {
                if (err) {
                    return handleCallback(callback, err);
                }

                // Save the returned connection to ensure all getMore's fire over the same connection
                this.connection = connection;

                // Tailable cursor getMore result, notify owner about it
                // No attempt is made here to retry, this is left to the user of the
                // core module to handle to keep core simple
                if (
                    this.cursorState.documents.length === 0 &&
                    this.cmd.tailable &&
                    Long.ZERO.equals(this.cursorState.cursorId)
                ) {
                    // No more documents in the tailed cursor
                    return handleCallback(callback, MongoError.create({
                        message: "No more documents in tailed cursor",
                        tailable: this.cmd.tailable,
                        awaitData: this.cmd.awaitData
                    }));
                } else if (
                    this.cursorState.documents.length === 0 &&
                    this.cmd.tailable &&
                    !Long.ZERO.equals(this.cursorState.cursorId)
                ) {
                    return this.next(callback);
                }

                if (this.cursorState.limit > 0 && this.cursorState.currentLimit >= this.cursorState.limit) {
                    return setCursorDeadAndNotified(this, callback);
                }

                this.next(callback);
            });
        } else if (
            this.cursorState.documents.length === this.cursorState.cursorIndex &&
            this.cmd.tailable &&
            Long.ZERO.equals(this.cursorState.cursorId)
        ) {
            return handleCallback(callback, MongoError.create({
                message: "No more documents in tailed cursor",
                tailable: this.cmd.tailable,
                awaitData: this.cmd.awaitData
            }));
        } else if (
            this.cursorState.documents.length === this.cursorState.cursorIndex &&
            Long.ZERO.equals(this.cursorState.cursorId)
        ) {
            setCursorDeadAndNotified(this, callback);
        } else {
            if (this.cursorState.limit > 0 && this.cursorState.currentLimit >= this.cursorState.limit) {
                // Ensure we kill the cursor on the server
                this.kill();
                // Set cursor in dead and notified state
                return setCursorDeadAndNotified(this, callback);
            }

            // Increment the current cursor limit
            this.cursorState.currentLimit += 1;

            // Get the document
            let doc = this.cursorState.documents[this.cursorState.cursorIndex++];

            // Doc overflow
            if (!doc || doc.$err) {
                // Ensure we kill the cursor on the server
                this.kill();
                // Set cursor in dead and notified state
                return setCursorDeadAndNotified(this, () => {
                    handleCallback(callback, new MongoError(doc ? doc.$err : undefined));
                });
            }

            // Transform the doc with passed in transformation method if provided
            if (this.cursorState.transforms && is.function(this.cursorState.transforms.doc)) {
                doc = this.cursorState.transforms.doc(doc);
            }

            // Return the document
            handleCallback(callback, null, doc);
        }
    }
}
