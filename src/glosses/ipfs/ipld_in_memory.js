const {
    datastore: { backend: { MemoryDatastore } },
    ipfs: { BlockService, Repo }
} = adone;

/**
 * Create an IPLD instance with an in memory blockservice and repo.
 *
 * @param {IPLD} IPLD An IPLD constructor
 * @param {function(Error, IPLD)} callback
 * @returns {void}
 */
module.exports = (IPLD, callback) => {
    const repo = new Repo("in-memory", {
        storageBackends: {
            root: MemoryDatastore,
            blocks: MemoryDatastore,
            datastore: MemoryDatastore,
            keys: MemoryDatastore
        },
        lock: "memory"
    });
    const blockService = new BlockService(repo);

    repo.init({}, (err) => {
        if (err) {
            return callback(err);
        }

        repo.open((err) => {
            if (err) {
                return callback(err);
            }
            callback(null, new IPLD({ blockService }));
        });
    });
};
