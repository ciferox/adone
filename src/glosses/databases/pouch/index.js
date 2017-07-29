import DB from "./core";

import LevelPouch from "./adapter-leveldb";
import mapreduce from "./mapreduce";
import replication from "./replication";

DB.plugin(LevelPouch)
    .plugin(mapreduce)
    .plugin(replication);

export { DB };

export const coverage = adone.lazify({
    DB: "./for-coverage"
}, null, require);
