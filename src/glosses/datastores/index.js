adone.lazify({
    interface: "./interface",
    backend: "./backends",
    KeyTransformDatastore: "./core/key_transform",
    ShardingDatastore: "./core/sharding",
    MountDatastore: "./core/mount",
    TieredDatastore: "./core/tiered",
    NamespaceDatastore: "./core/namespace",
    shard: "./core/shard"
}, adone.asNamespace(exports), require);
