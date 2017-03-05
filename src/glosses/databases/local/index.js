import adone from "adone";

adone.lazify({
    Datastore: "./datastore",
    Persistence: "./persistence",
    Executor: "./executor",
    Index: "./db_index",
    Cursor: "./cursor",
    Storage: "./storage",
    Model: "./model"
}, exports, require);
