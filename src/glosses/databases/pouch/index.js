const pouch = adone.lazify({
    __: "./__",
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
