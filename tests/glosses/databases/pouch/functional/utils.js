const { util, fs, std: { path }, noop } = adone;

let DB = null;

export const tmpdir = new adone.fs.Directory(__dirname, "tmp");
export const tmppath = tmpdir.path();
export const prefix = path.resolve(tmppath, "_pouch_");

export const setup = async () => {
    if (DB) {
        return DB;
    }
    await fs.rm(tmppath);
    DB = adone.database.pouch.DB.defaults({
        prefix
    });
    await fs.mkdir(tmppath);
    return DB;
};

export const destroy = async () => {
    await fs.rm(tmppath);
};

export const cleanup = async (...dbs) => {
    await Promise.all(util.unique(dbs).map((db) => new DB(db).destroy().catch(noop)));
};

export const writeDocs = async (db, docs) => {
    const info = [];
    for (const doc of docs) {
        info.push(await db.put(doc));
    }
    return info;
};

// Put doc after prevRev (so that doc is a child of prevDoc
// in rev_tree). Doc must have _rev. If prevRev is not specified
// just insert doc with correct _rev (new_edits=false!)
export const putAfter = async (db, doc, prevRev) => {
    const newDoc = { ...doc };
    if (!prevRev) {
        return db.put(newDoc, { new_edits: false });
    }
    newDoc._revisions = {
        start: Number(newDoc._rev.split("-")[0]),
        ids: [
            newDoc._rev.split("-")[1],
            prevRev.split("-")[1]
        ]
    };
    return db.put(newDoc, { new_edits: false });
};

// docs will be inserted one after another
// starting from root
export const putBranch = async (db, docs) => {
    let prev = null;
    for (const doc of docs) {
        try {
            await db.get(doc._id, { rev: doc._rev });
        } catch (err) {
            await putAfter(db, doc, prev);
        }
        prev = doc._rev;
    }
};

export const putTree = async (db, tree) => {
    for (const branch of tree) {
        await putBranch(db, branch);
    }
};

export const btoa = adone.database.pouch.__.util.binary.btoa;

export const atob = adone.database.pouch.__.util.binary.atob;

export const binaryStringToBuffer = adone.database.pouch.__.util.binary.binaryStringToBuffer;

export const x = adone.database.pouch.x;

export const rev = adone.database.pouch.__.util.rev;

export const uuid = adone.database.pouch.__.util.uuid;

export const sortById = (a, b) => a._id < b._id ? -1 : 1;

export const generateReplicationId = adone.database.pouch.plugin.replication.generateReplicationId;
