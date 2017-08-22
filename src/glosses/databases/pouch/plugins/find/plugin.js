const { is, database: { pouch: { __, plugin: { find: plugin } } }, promise: { callbackify } } = adone;
const { util: { toPromise, isRemote } } = __;
const { adapter } = plugin;

export default {
    createIndex: toPromise(function (requestDef, callback) {
        if (!is.object(requestDef)) {
            return callback(new Error("you must provide an index to create"));
        }

        const createIndex = isRemote(this)
            ? adapter.http.createIndex
            : callbackify(adapter.local.createIndex);
        createIndex(this, requestDef, callback);
    }),
    find: toPromise(function (requestDef, callback) {
        if (is.undefined(callback)) {
            callback = requestDef;
            requestDef = undefined;
        }

        if (!is.object(requestDef)) {
            return callback(new Error("you must provide search parameters to find()"));
        }
        const find = isRemote(this)
            ? adapter.http.find
            : callbackify(adapter.local.find);
        find(this, requestDef, callback);
    }),
    explain: toPromise(function (requestDef, callback) {
        if (is.undefined(callback)) {
            callback = requestDef;
            requestDef = undefined;
        }

        if (!is.object(requestDef)) {
            return callback(new Error("you must provide search parameters to explain()"));
        }

        const find = isRemote(this)
            ? adapter.http.explain
            : callbackify(adapter.local.explain);
        find(this, requestDef, callback);
    }),
    getIndexes: toPromise(function (callback) {
        const getIndexes = isRemote(this)
            ? adapter.http.getIndexes
            : callbackify(adapter.local.getIndexes);
        getIndexes(this, callback);
    }),
    deleteIndex: toPromise(function (indexDef, callback) {
        if (!is.object(indexDef)) {
            return callback(new Error("you must provide an index to delete"));
        }

        const deleteIndex = isRemote(this)
            ? adapter.http.deleteIndex
            : callbackify(adapter.local.deleteIndex);
        deleteIndex(this, indexDef, callback);
    })
};

