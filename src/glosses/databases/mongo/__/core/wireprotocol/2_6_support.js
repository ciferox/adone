const {
    database: { mongo },
    is,
    util
} = adone;
const {
    core: {
        KillCursor,
        GetMore,
        Query,
        MongoError,
        helper
    }
} = adone.private(mongo);

const executeWrite = (pool, bson, type, opsField, ns, ops, options, callback) => {
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

const setupClassicFind = function (bson, ns, cmd, cursorState, topology, options = {}) {
    // Get the readPreference
    const readPreference = helper.getReadPreference(cmd, options);
    // Set the optional batchSize
    cursorState.batchSize = cmd.batchSize || cursorState.batchSize;
    let numberToReturn = 0;

    // Unpack the limit and batchSize values
    if (cursorState.limit === 0) {
        numberToReturn = cursorState.batchSize;
    } else if (
        cursorState.limit < 0 ||
        cursorState.limit < cursorState.batchSize ||
        (cursorState.limit > 0 && cursorState.batchSize === 0)
    ) {
        numberToReturn = cursorState.limit;
    } else {
        numberToReturn = cursorState.batchSize;
    }

    const numberToSkip = cursorState.skip || 0;
    // Build actual find command
    let findCmd = {};
    // Using special modifier
    let usesSpecialModifier = false;

    // We have a Mongos topology, check if we need to add a readPreference
    if (topology.type === "mongos" && readPreference) {
        findCmd.$readPreference = readPreference.toJSON();
        usesSpecialModifier = true;
    }

    // Add special modifiers to the query
    if (cmd.sort) {
        findCmd.orderby = cmd.sort, usesSpecialModifier = true;
    }
    if (cmd.hint) {
        findCmd.$hint = cmd.hint, usesSpecialModifier = true;
    }
    if (cmd.snapshot) {
        findCmd.$snapshot = cmd.snapshot, usesSpecialModifier = true;
    }
    if (cmd.returnKey) {
        findCmd.$returnKey = cmd.returnKey, usesSpecialModifier = true;
    }
    if (cmd.maxScan) {
        findCmd.$maxScan = cmd.maxScan, usesSpecialModifier = true;
    }
    if (cmd.min) {
        findCmd.$min = cmd.min, usesSpecialModifier = true;
    }
    if (cmd.max) {
        findCmd.$max = cmd.max, usesSpecialModifier = true;
    }
    if (cmd.showDiskLoc) {
        findCmd.$showDiskLoc = cmd.showDiskLoc, usesSpecialModifier = true;
    }
    if (cmd.comment) {
        findCmd.$comment = cmd.comment, usesSpecialModifier = true;
    }
    if (cmd.maxTimeMS) {
        findCmd.$maxTimeMS = cmd.maxTimeMS, usesSpecialModifier = true;
    }

    if (cmd.explain) {
        // nToReturn must be 0 (match all) or negative (match N and close cursor)
        // nToReturn > 0 will give explain results equivalent to limit(0)
        numberToReturn = -Math.abs(cmd.limit || 0);
        usesSpecialModifier = true;
        findCmd.$explain = true;
    }

    // If we have a special modifier
    if (usesSpecialModifier) {
        findCmd.$query = cmd.query;
    } else {
        findCmd = cmd.query;
    }

    // Throw on majority readConcern passed in
    if (cmd.readConcern && cmd.readConcern.level !== "local") {
        throw new MongoError(`server find command does not support a readConcern level of ${cmd.readConcern.level}`);
    }

    // Remove readConcern, ensure no failing commands
    if (cmd.readConcern) {
        cmd = util.clone(cmd);
        delete cmd.readConcern;
    }

    // Serialize functions
    const serializeFunctions = is.boolean(options.serializeFunctions)
        ? options.serializeFunctions
        : false;
    const ignoreUndefined = is.boolean(options.ignoreUndefined)
        ? options.ignoreUndefined
        : false;

    // Build Query object
    const query = new Query(bson, ns, findCmd, {
        numberToSkip,
        numberToReturn,
        checkKeys: false,
        returnFieldSelector: cmd.fields,
        serializeFunctions,
        ignoreUndefined
    });

    // Set query flags
    query.slaveOk = readPreference.slaveOk();

    // Set up the option bits for wire protocol
    if (is.boolean(cmd.tailable)) {
        query.tailable = cmd.tailable;
    }

    if (is.boolean(cmd.oplogReplay)) {
        query.oplogReplay = cmd.oplogReplay;
    }

    if (is.boolean(cmd.noCursorTimeout)) {
        query.noCursorTimeout = cmd.noCursorTimeout;
    }

    if (is.boolean(cmd.awaitData)) {
        query.awaitData = cmd.awaitData;
    }

    if (is.boolean(cmd.partial)) {
        query.partial = cmd.partial;
    }

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

    const ignoreUndefined = is.boolean(options.ignoreUndefined)
        ? options.ignoreUndefined
        : false;

    // Throw on majority readConcern passed in
    if (cmd.readConcern && cmd.readConcern.level !== "local") {
        throw new MongoError(`server ${JSON.stringify(cmd)} command does not support a readConcern level of ${cmd.readConcern.level}`);
    }

    // Remove readConcern, ensure no failing commands
    if (cmd.readConcern) {
        delete cmd.readConcern;
    }

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
        // Create a kill cursor command
        const killCursor = new KillCursor(bson, [cursorId]);
        // Execute the kill cursor command
        if (pool && pool.isConnected()) {
            pool.write(killCursor, {
                immediateRelease: true, noResponse: true
            });
        }

        // Callback
        if (is.function(callback)) {
            callback(null, null);
        }
    }

    getMore(bson, ns, cursorState, batchSize, raw, connection, options, callback) {
        // Create getMore command
        const getMore = new GetMore(bson, ns, cursorState.cursorId, { numberToReturn: batchSize });

        // Query callback
        const queryCallback = (err, result) => {
            if (err) {
                return callback(err);
            }
            // Get the raw message
            const r = result.message;

            // If we have a timed out query or a cursor that was killed
            if ((r.responseFlags & (1 << 0)) !== 0) {
                return callback(new MongoError("cursor does not exist, was killed or timed out"), null);
            }

            // Ensure we have a Long valie cursor id
            const cursorId = is.number(r.cursorId) ? adone.data.bson.Long.fromNumber(r.cursorId) : r.cursorId;

            // Set all the values
            cursorState.documents = r.documents;
            cursorState.cursorId = cursorId;

            // Return
            callback(null, null, r.connection);
        };

        // Contains any query options
        const queryOptions = {};

        // If we have a raw query decorate the function
        if (raw) {
            queryOptions.raw = raw;
        }

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
        connection.write(getMore, queryOptions, queryCallback);
    }

    command(bson, ns, cmd, cursorState, topology, options) {
        // Establish type of command
        if (cmd.find) {
            return setupClassicFind(bson, ns, cmd, cursorState, topology, options);
        } else if (!is.nil(cursorState.cursorId)) {
            return;
        } else if (cmd) {
            return setupCommand(bson, ns, cmd, cursorState, topology, options);
        }
        throw new MongoError(`command ${JSON.stringify(cmd)} does not return a cursor`);
    }
}
