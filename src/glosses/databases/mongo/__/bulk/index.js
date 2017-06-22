const { lazify } = adone;

const bulk = lazify({
    BulkWriteResult: ["./common", (x) => x.BulkWriteResult],
    WriteError: ["./common", (x) => x.WriteError],
    Batch: ["./common", (x) => x.Batch],
    LegacyOp: ["./common", (x) => x.LegacyOp],
    mergeBatchResults: ["./common", (x) => x.mergeBatchResults],
    cloneOptions: ["./common", (x) => x.cloneOptions],
    writeConcern: ["./common", (x) => x.writeConcern],
    INVALID_BSON_ERROR: ["./common", (x) => x.INVALID_BSON_ERROR],
    WRITE_CONCERN_ERROR: ["./common", (x) => x.WRITE_CONCERN_ERROR],
    MULTIPLE_ERROR: ["./common", (x) => x.MULTIPLE_ERROR],
    UNKNOWN_ERROR: ["./common", (x) => x.UNKNOWN_ERROR],
    INSERT: ["./common", (x) => x.INSERT],
    UPDATE: ["./common", (x) => x.UPDATE],
    REMOVE: ["./common", (x) => x.REMOVE],
    OrderedBulkOperation: "./ordered",
    UnorderedBulkOperation: "./unordered"
}, exports, require);

export const initializeOrderedBulkOp = (topology, collection, options) => {
    return new bulk.OrderedBulkOperation(topology, collection, options);
};

export const initializeUnorderedBulkOp = (topology, collection, options) => {
    return new bulk.UnorderedBulkOperation(topology, collection, options);
};
