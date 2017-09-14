const {
    database: { mongo },
    is
} = adone;
const {
    core: {
        Query,
        MongoError,
        helper
    }
} = adone.private(mongo);

const executeWrite = (pool, bson, type, opsField, ns, ops, options = {}, callback) => {
    if (ops.length === 0) {
        throw new MongoError("insert must contain at least one document");
    }
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    // Split the ns up to get db and collection
    const p = ns.split(".");
    const d = p.shift();
    // Options
    const ordered = is.boolean(options.ordered) ? options.ordered : true;
    const writeConcern = options.writeConcern;

    // return skeleton
    const writeCommand = {};
    writeCommand[type] = p.join(".");
    writeCommand[opsField] = ops;
    writeCommand.ordered = ordered;

    // Did we specify a write concern
    if (writeConcern && !is.emptyObject(writeConcern)) {
        writeCommand.writeConcern = writeConcern;
    }

    // If we have collation passed in
    if (options.collation) {
        for (const t of writeCommand[opsField]) {
            if (!t.collation) {
                t.collation = options.collation;
            }
        }
    }

    // Do we have bypassDocumentValidation set, then enable it on the write command
    if (is.boolean(options.bypassDocumentValidation)) {
        writeCommand.bypassDocumentValidation = options.bypassDocumentValidation;
    }

    // Options object
    const opts = { command: true };
    const queryOptions = { checkKeys: false, numberToSkip: 0, numberToReturn: 1 };
    if (type === "insert") {
        queryOptions.checkKeys = true;
    }
    if (is.boolean(options.checkKeys)) {
        queryOptions.checkKeys = options.checkKeys;
    }

    // Ensure we support serialization of functions
    if (options.serializeFunctions) {
        queryOptions.serializeFunctions = options.serializeFunctions;
    }
    // Do not serialize the undefined fields
    if (options.ignoreUndefined) {
        queryOptions.ignoreUndefined = options.ignoreUndefined;
    }

    try {
        // Create write command
        const cmd = new Query(bson, `${d}.$cmd`, writeCommand, queryOptions);
        // Execute command
        pool.write(cmd, opts, callback);
    } catch (err) {
        callback(err);
    }
};

const executeFindCommand = (bson, ns, cmd, cursorState, topology, options = {}) => {
    // Get the readPreference
    const readPreference = helper.getReadPreference(cmd, options);
    // Set the optional batchSize
    cursorState.batchSize = cmd.batchSize || cursorState.batchSize;

    // Build command namespace
    const parts = ns.split(/\./);
    // Command namespace
    const commandns = `${parts.shift()}.$cmd`;

    // Build actual find command
    let findCmd = {
        find: parts.join(".")
    };

    // I we provided a filter
    if (cmd.query) {
        // Check if the user is passing in the $query parameter
        if (cmd.query.$query) {
            findCmd.filter = cmd.query.$query;
        } else {
            findCmd.filter = cmd.query;
        }
    }

    // Sort value
    let sortValue = cmd.sort;

    // Handle issue of sort being an Array
    if (is.array(sortValue)) {
        const sortObject = {};

        if (sortValue.length > 0 && !is.array(sortValue[0])) {
            let sortDirection = sortValue[1];
            // Translate the sort order text
            if (sortDirection === "asc") {
                sortDirection = 1;
            } else if (sortDirection === "desc") {
                sortDirection = -1;
            }

            // Set the sort order
            sortObject[sortValue[0]] = sortDirection;
        } else {
            for (const [k, v] of sortValue) {
                let sortDirection = v;
                // Translate the sort order text
                if (sortDirection === "asc") {
                    sortDirection = 1;
                } else if (sortDirection === "desc") {
                    sortDirection = -1;
                }

                // Set the sort order
                sortObject[k] = sortDirection;
            }
        }

        sortValue = sortObject;
    }

    // Add sort to command
    if (cmd.sort) {
        findCmd.sort = sortValue;
    }
    // Add a projection to the command
    if (cmd.fields) {
        findCmd.projection = cmd.fields;
    }
    // Add a hint to the command
    if (cmd.hint) {
        findCmd.hint = cmd.hint;
    }
    // Add a skip
    if (cmd.skip) {
        findCmd.skip = cmd.skip;
    }
    // Add a limit
    if (cmd.limit) {
        findCmd.limit = cmd.limit;
    }
    // Add a batchSize
    if (is.number(cmd.batchSize)) {
        findCmd.batchSize = Math.abs(cmd.batchSize);
    }

    // Check if we wish to have a singleBatch
    if (cmd.limit < 0) {
        findCmd.limit = Math.abs(cmd.limit);
        findCmd.singleBatch = true;
    }

    // Add a batchSize
    if (is.number(cmd.batchSize)) {
        if (cmd.batchSize < 0) {
            if (cmd.limit !== 0 && Math.abs(cmd.batchSize) < Math.abs(cmd.limit)) {
                findCmd.limit = Math.abs(cmd.batchSize);
            }

            findCmd.singleBatch = true;
        }

        findCmd.batchSize = Math.abs(cmd.batchSize);
    }

    // If we have comment set
    if (cmd.comment) {
        findCmd.comment = cmd.comment;
    }

    // If we have maxScan
    if (cmd.maxScan) {
        findCmd.maxScan = cmd.maxScan;
    }

    // If we have maxTimeMS set
    if (cmd.maxTimeMS) {
        findCmd.maxTimeMS = cmd.maxTimeMS;
    }

    // If we have min
    if (cmd.min) {
        findCmd.min = cmd.min;
    }

    // If we have max
    if (cmd.max) {
        findCmd.max = cmd.max;
    }

    // If we have returnKey set
    if (cmd.returnKey) {
        findCmd.returnKey = cmd.returnKey;
    }

    // If we have showDiskLoc set
    if (cmd.showDiskLoc) {
        findCmd.showRecordId = cmd.showDiskLoc;
    }

    // If we have snapshot set
    if (cmd.snapshot) {
        findCmd.snapshot = cmd.snapshot;
    }

    // If we have tailable set
    if (cmd.tailable) {
        findCmd.tailable = cmd.tailable;
    }

    // If we have oplogReplay set
    if (cmd.oplogReplay) {
        findCmd.oplogReplay = cmd.oplogReplay;
    }

    // If we have noCursorTimeout set
    if (cmd.noCursorTimeout) {
        findCmd.noCursorTimeout = cmd.noCursorTimeout;
    }

    // If we have awaitData set
    if (cmd.awaitData) {
        findCmd.awaitData = cmd.awaitData;
    }
    if (cmd.awaitdata) {
        findCmd.awaitData = cmd.awaitdata;
    }

    // If we have partial set
    if (cmd.partial) {
        findCmd.partial = cmd.partial;
    }

    // If we have collation passed in
    if (cmd.collation) {
        findCmd.collation = cmd.collation;
    }

    // If we have explain, we need to rewrite the find command
    // to wrap it in the explain command
    if (cmd.explain) {
        findCmd = {
            explain: findCmd
        };
    }

    // Did we provide a readConcern
    if (cmd.readConcern) {
        findCmd.readConcern = cmd.readConcern;
    }

    // Set up the serialize and ignoreUndefined fields
    const serializeFunctions = is.boolean(options.serializeFunctions)
        ? options.serializeFunctions
        : false;
    const ignoreUndefined = is.boolean(options.ignoreUndefined)
        ? options.ignoreUndefined
        : false;

    // We have a Mongos topology, check if we need to add a readPreference
    if (topology.type === "mongos" && readPreference && readPreference.preference !== "primary") {
        findCmd = {
            $query: findCmd,
            $readPreference: readPreference.toJSON()
        };
    }

    // Build Query object
    const query = new Query(bson, commandns, findCmd, {
        numberToSkip: 0,
        numberToReturn: 1,
        checkKeys: false,
        returnFieldSelector: null,
        serializeFunctions,
        ignoreUndefined
    });

    // Set query flags
    query.slaveOk = readPreference.slaveOk();

    // Return the query
    return query;
};

const setupCommand = (bson, ns, cmd, cursorState, topology, options = {}) => {
    // Get the readPreference
    const readPreference = helper.getReadPreference(cmd, options);

    // Final query
    let finalCmd = {};
    for (const name in cmd) {
        finalCmd[name] = cmd[name];
    }

    // Build command namespace
    const parts = ns.split(/\./);

    // Serialize functions
    const serializeFunctions = is.boolean(options.serializeFunctions)
        ? options.serializeFunctions
        : false;

    // Set up the serialize and ignoreUndefined fields
    const ignoreUndefined = is.boolean(options.ignoreUndefined)
        ? options.ignoreUndefined
        : false;

    // We have a Mongos topology, check if we need to add a readPreference
    if (topology.type === "mongos" && readPreference && readPreference.preference !== "primary") {
        finalCmd = {
            $query: finalCmd,
            $readPreference: readPreference.toJSON()
        };
    }

    // Build Query object
    const query = new Query(bson, `${parts.shift()}.$cmd`, finalCmd, {
        numberToSkip: 0,
        numberToReturn: -1,
        checkKeys: false,
        serializeFunctions,
        ignoreUndefined
    });

    // Set query flags
    query.slaveOk = readPreference.slaveOk();

    // Return the query
    return query;
};

export default class WireProtocol {
    constructor(legacyWireProtocol) {
        this.legacyWireProtocol = legacyWireProtocol;
    }

    insert(pool, ismaster, ns, bson, ops, options, callback) {
        executeWrite(pool, bson, "insert", "documents", ns, ops, options, callback);
    }

    update(pool, ismaster, ns, bson, ops, options, callback) {
        executeWrite(pool, bson, "update", "updates", ns, ops, options, callback);
    }

    remove(pool, ismaster, ns, bson, ops, options, callback) {
        executeWrite(pool, bson, "delete", "deletes", ns, ops, options, callback);
    }

    killCursor(bson, ns, cursorId, pool, callback) {
        // Build command namespace
        const parts = ns.split(/\./);
        // Command namespace
        const commandns = `${parts.shift()}.$cmd`;
        // Create getMore command
        const killcursorCmd = {
            killCursors: parts.join("."),
            cursors: [cursorId]
        };

        // Build Query object
        const query = new Query(bson, commandns, killcursorCmd, {
            numberToSkip: 0,
            numberToReturn: -1,
            checkKeys: false,
            returnFieldSelector: null
        });

        // Set query flags
        query.slaveOk = true;

        // Kill cursor callback
        const killCursorCallback = (err, result) => {
            if (err) {
                if (!is.function(callback)) {
                    return;
                }
                return callback(err);
            }

            // Result
            const r = result.message;
            // If we have a timed out query or a cursor that was killed
            if ((r.responseFlags & (1 << 0)) !== 0) {
                if (!is.function(callback)) {
                    return;
                }
                return callback(new MongoError("cursor killed or timed out"), null);
            }

            if (!is.array(r.documents) || r.documents.length === 0) {
                if (!is.function(callback)) {
                    return;
                }
                return callback(new MongoError(`invalid killCursors result returned for cursor id ${cursorId}`));
            }

            // Return the result
            if (is.function(callback)) {
                callback(null, r.documents[0]);
            }
        };

        // Execute the kill cursor command
        if (pool && pool.isConnected()) {
            pool.write(query, {
                command: true
            }, killCursorCallback);
        }
    }

    getMore(bson, ns, cursorState, batchSize, raw, connection, options = {}, callback) { // eslint-disable-line no-unused-vars
        // Build command namespace
        const parts = ns.split(/\./);
        // Command namespace
        const commandns = `${parts.shift()}.$cmd`;

        // Create getMore command
        const getMoreCmd = {
            getMore: cursorState.cursorId,
            collection: parts.join("."),
            batchSize: Math.abs(batchSize)
        };

        if (cursorState.cmd.tailable && is.number(cursorState.cmd.maxAwaitTimeMS)) {
            getMoreCmd.maxTimeMS = cursorState.cmd.maxAwaitTimeMS;
        }

        // Build Query object
        const query = new Query(bson, commandns, getMoreCmd, {
            numberToSkip: 0,
            numberToReturn: -1,
            checkKeys: false,
            returnFieldSelector: null
        });

        // Set query flags
        query.slaveOk = true;

        // Query callback
        const queryCallback = (err, result) => {
            if (err) {
                return callback(err);
            }
            // Get the raw message
            const r = result.message;

            // If we have a timed out query or a cursor that was killed
            if ((r.responseFlags & (1 << 0)) !== 0) {
                return callback(new MongoError("cursor killed or timed out"), null);
            }

            // Raw, return all the extracted documents
            if (raw) {
                cursorState.documents = r.documents;
                cursorState.cursorId = r.cursorId;
                return callback(null, r.documents);
            }

            // We have an error detected
            if (r.documents[0].ok === 0) {
                return callback(MongoError.create(r.documents[0]));
            }

            // Ensure we have a Long valid cursor id
            const cursorId = is.number(r.documents[0].cursor.id)
                ? adone.data.bson.Long.fromNumber(r.documents[0].cursor.id)
                : r.documents[0].cursor.id;

            // Set all the values
            cursorState.documents = r.documents[0].cursor.nextBatch;
            cursorState.cursorId = cursorId;

            // Return the result
            callback(null, r.documents[0], r.connection);
        };

        // Query options
        const queryOptions = { command: true };

        // If we have a raw query decorate the function
        if (raw) {
            queryOptions.raw = raw;
        }

        // Add the result field needed
        queryOptions.documentsReturnedIn = "nextBatch";

        // Check if we need to promote longs
        if (is.boolean(cursorState.promoteLongs)) {
            queryOptions.promoteLongs = cursorState.promoteLongs;
        }

        if (is.boolean(cursorState.promoteValues)) {
            queryOptions.promoteValues = cursorState.promoteValues;
        }

        if (is.boolean(cursorState.promoteBuffers)) {
            queryOptions.promoteBuffers = cursorState.promoteBuffers;
        }

        // Write out the getMore command
        connection.write(query, queryOptions, queryCallback);
    }

    command(bson, ns, cmd, cursorState, topology, options = {}) {
        // Check if this is a wire protocol command or not
        const wireProtocolCommand = is.boolean(options.wireProtocolCommand) ? options.wireProtocolCommand : true;

        // Establish type of command
        if (cmd.find && wireProtocolCommand) {
            // Create the find command
            const query = executeFindCommand(bson, ns, cmd, cursorState, topology, options);
            // Mark the cmd as virtual
            cmd.virtual = false;
            // Signal the documents are in the firstBatch value
            query.documentsReturnedIn = "firstBatch";
            // Return the query
            return query;
        } else if (!is.nil(cursorState.cursorId)) {
            return;
        } else if (cmd) {
            return setupCommand(bson, ns, cmd, cursorState, topology, options);
        }
        throw new MongoError(`command ${JSON.stringify(cmd)} does not return a cursor`);
    }
}
