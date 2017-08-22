const { database: { pouch: { plugin: { find: plugin } } } } = adone;
const {
    massageCreateIndexRequest
} = plugin;

const createIndex = (db, requestDef, callback) => {
    requestDef = massageCreateIndexRequest(requestDef);

    db.request({
        method: "POST",
        url: "_index",
        body: requestDef
    }, callback);
};

const find = (db, requestDef, callback) => {
    db.request({
        method: "POST",
        url: "_find",
        body: requestDef
    }, callback);
};

const explain = (db, requestDef, callback) => {
    db.request({
        method: "POST",
        url: "_explain",
        body: requestDef
    }, callback);
};

const getIndexes = (db, callback) => {
    db.request({
        method: "GET",
        url: "_index"
    }, callback);
};

const deleteIndex = (db, indexDef, callback) => {
    const ddoc = indexDef.ddoc;
    const type = indexDef.type || "json";
    const name = indexDef.name;

    if (!ddoc) {
        return callback(new Error("you must provide an index's ddoc"));
    }

    if (!name) {
        return callback(new Error("you must provide an index's name"));
    }

    const url = `_index/${[ddoc, type, name].map(encodeURIComponent).join("/")}`;

    db.request({
        method: "DELETE",
        url
    }, callback);
};

export {
    createIndex,
    find,
    getIndexes,
    deleteIndex,
    explain
};
