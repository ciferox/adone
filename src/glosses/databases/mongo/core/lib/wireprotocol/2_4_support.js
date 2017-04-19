const Insert = require("./commands").Insert;
const Update = require("./commands").Update;
const Remove = require("./commands").Remove;
const copy = require("../connection/utils").copy;
const retrieveBSON = require("../connection/utils").retrieveBSON;
const KillCursor = require("../connection/commands").KillCursor;
const GetMore = require("../connection/commands").GetMore;
const Query = require("../connection/commands").Query;
const f = require("util").format;
const CommandResult = require("../connection/command_result");
const MongoError = require("../error");
const getReadPreference = require("./shared").getReadPreference;

const BSON = retrieveBSON();
const Long = adone.data.bson.Long;

// Write concern fields
const writeConcernFields = ["w", "wtimeout", "j", "fsync"];

const WireProtocol = function () { };

//
// Needs to support legacy mass insert as well as ordered/unordered legacy
// emulation
//
WireProtocol.prototype.insert = function (pool, ismaster, ns, bson, ops, options, callback) {
    options = options || {};
    // Default is ordered execution
    const ordered = typeof options.ordered === "boolean" ? options.ordered : true;
    ops = Array.isArray(ops) ? ops : [ops];

    // If we have more than a 1000 ops fails
    if (ops.length > 1000) {
        return callback(new MongoError("exceeded maximum write batch size of 1000"));
    }

    // Write concern
    const writeConcern = options.writeConcern || { w: 1 };

    // We are unordered
    if (!ordered || writeConcern.w == 0) {
        return executeUnordered("insert", Insert, ismaster, ns, bson, pool, ops, options, callback);
    }

    return executeOrdered("insert", Insert, ismaster, ns, bson, pool, ops, options, callback);
};

WireProtocol.prototype.update = function (pool, ismaster, ns, bson, ops, options, callback) {
    options = options || {};
    // Default is ordered execution
    const ordered = typeof options.ordered === "boolean" ? options.ordered : true;
    ops = Array.isArray(ops) ? ops : [ops];

    // Write concern
    const writeConcern = options.writeConcern || { w: 1 };

    // We are unordered
    if (!ordered || writeConcern.w == 0) {
        return executeUnordered("update", Update, ismaster, ns, bson, pool, ops, options, callback);
    }

    return executeOrdered("update", Update, ismaster, ns, bson, pool, ops, options, callback);
};

WireProtocol.prototype.remove = function (pool, ismaster, ns, bson, ops, options, callback) {
    options = options || {};
    // Default is ordered execution
    const ordered = typeof options.ordered === "boolean" ? options.ordered : true;
    ops = Array.isArray(ops) ? ops : [ops];

    // Write concern
    const writeConcern = options.writeConcern || { w: 1 };

    // We are unordered
    if (!ordered || writeConcern.w == 0) {
        return executeUnordered("remove", Remove, ismaster, ns, bson, pool, ops, options, callback);
    }

    return executeOrdered("remove", Remove, ismaster, ns, bson, pool, ops, options, callback);
};

WireProtocol.prototype.killCursor = function (bson, ns, cursorId, pool, callback) {
    // Create a kill cursor command
    const killCursor = new KillCursor(bson, [cursorId]);
    // Execute the kill cursor command
    if (pool && pool.isConnected()) {
        pool.write(killCursor, {
            immediateRelease: true, noResponse: true
        });
    }

    // Callback
    if (typeof callback === "function") {
        callback(null, null);
    }
};

WireProtocol.prototype.getMore = function (bson, ns, cursorState, batchSize, raw, connection, options, callback) {
    // Create getMore command
    const getMore = new GetMore(bson, ns, cursorState.cursorId, { numberToReturn: batchSize });

    // Query callback
    const queryCallback = function (err, result) {
        if (err) {
            return callback(err);
        }
        // Get the raw message
        const r = result.message;

        // If we have a timed out query or a cursor that was killed
        if ((r.responseFlags & (1 << 0)) != 0) {
            return callback(new MongoError("cursor does not exist, was killed or timed out"), null);
        }

        // Ensure we have a Long valie cursor id
        const cursorId = typeof r.cursorId === "number"
            ? Long.fromNumber(r.cursorId)
            : r.cursorId;

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
    if (typeof cursorState.promoteLongs === "boolean") {
        queryOptions.promoteLongs = cursorState.promoteLongs;
    }

    if (typeof cursorState.promoteValues === "boolean") {
        queryOptions.promoteValues = cursorState.promoteValues;
    }

    if (typeof cursorState.promoteBuffers === "boolean") {
        queryOptions.promoteBuffers = cursorState.promoteBuffers;
    }

    // Write out the getMore command
    connection.write(getMore, queryOptions, queryCallback);
};

WireProtocol.prototype.command = function (bson, ns, cmd, cursorState, topology, options) {
    // Establish type of command
    if (cmd.find) {
        return setupClassicFind(bson, ns, cmd, cursorState, topology, options);
    } else if (cursorState.cursorId != null) {
        return;
    } else if (cmd) {
        return setupCommand(bson, ns, cmd, cursorState, topology, options);
    } else {
        throw new MongoError(f("command %s does not return a cursor", JSON.stringify(cmd)));
    }
};

//
// Execute a find command
const setupClassicFind = function (bson, ns, cmd, cursorState, topology, options) {
    // Ensure we have at least some options
    options = options || {};
    // Get the readPreference
    const readPreference = getReadPreference(cmd, options);
    // Set the optional batchSize
    cursorState.batchSize = cmd.batchSize || cursorState.batchSize;
    let numberToReturn = 0;

    // Unpack the limit and batchSize values
    if (cursorState.limit == 0) {
        numberToReturn = cursorState.batchSize;
    } else if (cursorState.limit < 0 || cursorState.limit < cursorState.batchSize || (cursorState.limit > 0 && cursorState.batchSize == 0)) {
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
    if (topology.type == "mongos" && readPreference) {
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
    if (cmd.readConcern && cmd.readConcern.level != "local") {
        throw new MongoError(f("server find command does not support a readConcern level of %s", cmd.readConcern.level));
    }

    // Remove readConcern, ensure no failing commands
    if (cmd.readConcern) {
        cmd = copy(cmd);
        delete cmd.readConcern;
    }

    // Set up the serialize and ignoreUndefined fields
    const serializeFunctions = typeof options.serializeFunctions === "boolean"
        ? options.serializeFunctions : false;
    const ignoreUndefined = typeof options.ignoreUndefined === "boolean"
        ? options.ignoreUndefined : false;

    // Build Query object
    const query = new Query(bson, ns, findCmd, {
        numberToSkip, numberToReturn,
        checkKeys: false, returnFieldSelector: cmd.fields,
        serializeFunctions, ignoreUndefined
    });

    // Set query flags
    query.slaveOk = readPreference.slaveOk();

    // Set up the option bits for wire protocol
    if (typeof cmd.tailable === "boolean") {
        query.tailable = cmd.tailable;
    }
    if (typeof cmd.oplogReplay === "boolean") {
        query.oplogReplay = cmd.oplogReplay;
    }
    if (typeof cmd.noCursorTimeout === "boolean") {
        query.noCursorTimeout = cmd.noCursorTimeout;
    }
    if (typeof cmd.awaitData === "boolean") {
        query.awaitData = cmd.awaitData;
    }
    if (typeof cmd.partial === "boolean") {
        query.partial = cmd.partial;
    }
    // Return the query
    return query;
};

//
// Set up a command cursor
const setupCommand = function (bson, ns, cmd, cursorState, topology, options) {
    // Set empty options object
    options = options || {};
    // Get the readPreference
    const readPreference = getReadPreference(cmd, options);
    // Final query
    let finalCmd = {};
    for (const name in cmd) {
        finalCmd[name] = cmd[name];
    }

    // Build command namespace
    const parts = ns.split(/\./);

    // Throw on majority readConcern passed in
    if (cmd.readConcern && cmd.readConcern.level != "local") {
        throw new MongoError(f("server %s command does not support a readConcern level of %s", JSON.stringify(cmd), cmd.readConcern.level));
    }

    // Remove readConcern, ensure no failing commands
    if (cmd.readConcern) {
        delete cmd.readConcern;
    }

    // Serialize functions
    const serializeFunctions = typeof options.serializeFunctions === "boolean"
        ? options.serializeFunctions : false;

    // Set up the serialize and ignoreUndefined fields
    const ignoreUndefined = typeof options.ignoreUndefined === "boolean"
        ? options.ignoreUndefined : false;

    // We have a Mongos topology, check if we need to add a readPreference
    if (topology.type == "mongos"
        && readPreference
        && readPreference.preference != "primary") {
        finalCmd = {
            $query: finalCmd,
            $readPreference: readPreference.toJSON()
        };
    }

    // Build Query object
    const query = new Query(bson, f("%s.$cmd", parts.shift()), finalCmd, {
        numberToSkip: 0, numberToReturn: -1,
        checkKeys: false, serializeFunctions,
        ignoreUndefined
    });

    // Set query flags
    query.slaveOk = readPreference.slaveOk();

    // Return the query
    return query;
};

const hasWriteConcern = function (writeConcern) {
    if (writeConcern.w
        || writeConcern.wtimeout
        || writeConcern.j == true
        || writeConcern.fsync == true
        || Object.keys(writeConcern).length == 0) {
        return true;
    }
    return false;
};

const cloneWriteConcern = function (writeConcern) {
    const wc = {};
    if (writeConcern.w != null) {
        wc.w = writeConcern.w;
    }
    if (writeConcern.wtimeout != null) {
        wc.wtimeout = writeConcern.wtimeout;
    }
    if (writeConcern.j != null) {
        wc.j = writeConcern.j;
    }
    if (writeConcern.fsync != null) {
        wc.fsync = writeConcern.fsync;
    }
    return wc;
};

//
// Aggregate up all the results
//
const aggregateWriteOperationResults = function (opType, ops, results, connection) {
    const finalResult = { ok: 1, n: 0 };
    if (opType == "update") {
        finalResult.nModified = 0;
    }

    // Map all the results coming back
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const op = ops[i];

        if ((result.upserted || (result.updatedExisting == false)) && finalResult.upserted == null) {
            finalResult.upserted = [];
        }

        // Push the upserted document to the list of upserted values
        if (result.upserted) {
            finalResult.upserted.push({ index: i, _id: result.upserted });
        }

        // We have an upsert where we passed in a _id
        if (result.updatedExisting == false && result.n == 1 && result.upserted == null) {
            finalResult.upserted.push({ index: i, _id: op.q._id });
        } else if (result.updatedExisting == true) {
            finalResult.nModified += result.n;
        }

        // We have an insert command
        if (result.ok == 1 && opType == "insert" && result.err == null) {
            finalResult.n = finalResult.n + 1;
        }

        // We have a command error
        if (result != null && result.ok == 0 || result.err || result.errmsg) {
            if (result.ok == 0) {
                finalResult.ok = 0;
            }
            finalResult.code = result.code;
            finalResult.errmsg = result.errmsg || result.err || result.errMsg;

            // Check if we have a write error
            if (result.code == 11000
                || result.code == 11001
                || result.code == 12582
                || result.code == 16544
                || result.code == 16538
                || result.code == 16542
                || result.code == 14
                || result.code == 13511) {
                if (finalResult.writeErrors == null) {
                    finalResult.writeErrors = [];
                }
                finalResult.writeErrors.push({
                    index: i,
                    code: result.code,
                    errmsg: result.errmsg || result.err || result.errMsg
                });
            } else {
                finalResult.writeConcernError = {
                    code: result.code,
                    errmsg: result.errmsg || result.err || result.errMsg
                };
            }
        } else if (typeof result.n === "number") {
            finalResult.n += result.n;
        } else {
            finalResult.n += 1;
        }

        // Result as expected
        if (result != null && result.lastOp) {
            finalResult.lastOp = result.lastOp;
        }
    }

    // Return finalResult aggregated results
    return new CommandResult(finalResult, connection);
};

//
// Execute all inserts in an ordered manner
//
const executeOrdered = function (opType, command, ismaster, ns, bson, pool, ops, options, callback) {
    const _ops = ops.slice(0);
    // Collect all the getLastErrors
    const getLastErrors = [];
    // Execute an operation
    const executeOp = function (list, _callback) {
        // No more items in the list
        if (list.length == 0) {
            return process.nextTick(() => {
                _callback(null, aggregateWriteOperationResults(opType, ops, getLastErrors, null));
            });
        }

        // Get the first operation
        const doc = list.shift();
        // Create an insert command
        const op = new command(Query.getRequestId(), ismaster, bson, ns, [doc], options);
        // Write concern
        const optionWriteConcern = options.writeConcern || { w: 1 };
        // Final write concern
        const writeConcern = cloneWriteConcern(optionWriteConcern);

        // Get the db name
        const db = ns.split(".").shift();

        try {
            // Add binary message to list of commands to execute
            const commands = [op];

            // Add getLastOrdered
            const getLastErrorCmd = { getlasterror: 1 };
            // Merge all the fields
            for (let i = 0; i < writeConcernFields.length; i++) {
                if (writeConcern[writeConcernFields[i]] != null) {
                    getLastErrorCmd[writeConcernFields[i]] = writeConcern[writeConcernFields[i]];
                }
            }

            // Create a getLastError command
            const getLastErrorOp = new Query(bson, f("%s.$cmd", db), getLastErrorCmd, { numberToReturn: -1 });
            // Add getLastError command to list of ops to execute
            commands.push(getLastErrorOp);

            // getLastError callback
            const getLastErrorCallback = function (err, result) {
                if (err) {
                    return callback(err);
                }
                // Get the document
                const doc = result.result;
                // Save the getLastError document
                getLastErrors.push(doc);

                // If we have an error terminate
                if (doc.ok == 0 || doc.err || doc.errmsg) {
                    return callback(null, aggregateWriteOperationResults(opType, ops, getLastErrors, result.connection));
                }

                // Execute the next op in the list
                executeOp(list, callback);
            };

            // Write both commands out at the same time
            pool.write(commands, getLastErrorCallback);
        } catch (err) {
            // We have a serialization error, rewrite as a write error to have same behavior as modern
            // write commands
            getLastErrors.push({ ok: 1, errmsg: typeof err === "string" ? err : err.message, code: 14 });
            // Return due to an error
            process.nextTick(() => {
                _callback(null, aggregateWriteOperationResults(opType, ops, getLastErrors, null));
            });
        }
    };

    // Execute the operations
    executeOp(_ops, callback);
};

const executeUnordered = function (opType, command, ismaster, ns, bson, pool, ops, options, callback) {
    // Total operations to write
    let totalOps = ops.length;
    // Collect all the getLastErrors
    const getLastErrors = [];
    // Write concern
    const optionWriteConcern = options.writeConcern || { w: 1 };
    // Final write concern
    const writeConcern = cloneWriteConcern(optionWriteConcern);
    // Driver level error
    let error;

    // Execute all the operations
    for (let i = 0; i < ops.length; i++) {
        // Create an insert command
        const op = new command(Query.getRequestId(), ismaster, bson, ns, [ops[i]], options);
        // Get db name
        const db = ns.split(".").shift();

        try {
            // Add binary message to list of commands to execute
            const commands = [op];

            // If write concern 0 don't fire getLastError
            if (hasWriteConcern(writeConcern)) {
                const getLastErrorCmd = { getlasterror: 1 };
                // Merge all the fields
                for (let j = 0; j < writeConcernFields.length; j++) {
                    if (writeConcern[writeConcernFields[j]] != null)                        {
                        getLastErrorCmd[writeConcernFields[j]] = writeConcern[writeConcernFields[j]];
                    }
                }

                // Create a getLastError command
                const getLastErrorOp = new Query(bson, f("%s.$cmd", db), getLastErrorCmd, { numberToReturn: -1 });
                // Add getLastError command to list of ops to execute
                commands.push(getLastErrorOp);

                // Give the result from getLastError the right index
                const callbackOp = function (_index) {
                    return function (err, result) {
                        if (err) {
                            error = err;
                        }
                        // Update the number of operations executed
                        totalOps = totalOps - 1;
                        // Save the getLastError document
                        if (!err) {
                            getLastErrors[_index] = result.result;
                        }
                        // Check if we are done
                        if (totalOps == 0) {
                            process.nextTick(() => {
                                if (error) {
                                    return callback(error);
                                }
                                callback(null, aggregateWriteOperationResults(opType, ops, getLastErrors, result.connection));
                            });
                        }
                    };
                };

                // Write both commands out at the same time
                pool.write(commands, callbackOp(i));
            } else {
                pool.write(commands, { immediateRelease: true, noResponse: true });
            }
        } catch (err) {
            // Update the number of operations executed
            totalOps = totalOps - 1;
            // We have a serialization error, rewrite as a write error to have same behavior as modern
            // write commands
            getLastErrors[i] = { ok: 1, errmsg: typeof err === "string" ? err : err.message, code: 14 };
            // Check if we are done
            if (totalOps == 0) {
                callback(null, aggregateWriteOperationResults(opType, ops, getLastErrors, null));
            }
        }
    }

    // Empty w:0 return
    if (writeConcern
        && writeConcern.w == 0 && callback) {
        callback(null, new CommandResult({ ok: 1 }, null));
    }
};

module.exports = WireProtocol;
