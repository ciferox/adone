const pouch = adone.lazify({
    x: "./x",
    adapter: "./adapters",
    plugin: "./plugins",
    BaseDB: "./db",
    DB: () => {
        const {
            adapter: {
                level
            },
            plugin: {
                changesFilter,
                mapreduce,
                replication,
                find
            }
        } = pouch;
        return pouch.BaseDB.defaults()
            .plugin(changesFilter.plugin)
            .adapter("leveldb", level.adapter, true)
            .plugin(mapreduce.plugin)
            .plugin(replication.plugin)
            .plugin(find.plugin);
    },
    MemoryDB: () => {
        return pouch.DB.defaults({ db: adone.database.level.backend.Memory });
    }
}, exports, require);

adone.lazifyPrivate({
    util: "./__/utils",
    DB: "./__/db",
    Adapter: "./__/adapter",
    Changes: "./__/changes",
    TaskQueue: "./__/task_queue",
    changesFilter: "./__/changes_filter",
    selector: "./__/selector",
    collate: "./__/collate",
    plugin: "./__/plugins"
}, exports, require);
