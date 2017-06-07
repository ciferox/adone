import DB from "./pouchdb-core";

import LevelPouch from "./pouchdb-adapter-leveldb";
import HttpPouch from "./pouchdb-adapter-http";
import mapreduce from "./pouchdb-mapreduce";
import replication from "./pouchdb-replication";

DB.plugin(LevelPouch)
    .plugin(HttpPouch)
    .plugin(mapreduce)
    .plugin(replication);

export { DB };

export const coverage = adone.lazify({
    DB: "./pouchdb-for-coverage"
}, null, require);
