adone.lazify({
    interface: "./interface",
    backend: "./backends",
    KeyTransformDatastore: "./core/keytransform",
    ShardingDatastore: "./core/sharding",
    MountDatastore: "./core/mount",
    TieredDatastore: "./core/tiered",
    NamespaceDatastore: "./core/namespace",
    shard: "./core/shard"
}, adone.asNamespace(exports), require);
