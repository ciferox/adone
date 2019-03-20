// Default configuration for a repo in node.js

const {
    datastore: { backend: { FsDatastore, LevelDatastore } }
} = adone;

module.exports = {
    lock: "fs",
    storageBackends: {
        root: FsDatastore,
        blocks: FsDatastore,
        keys: FsDatastore,
        datastore: LevelDatastore
    },
    storageBackendOptions: {
        root: {
            extension: ""
        },
        blocks: {
            sharding: true,
            extension: ".data"
        },
        keys: {
        }
    }
};
