const {
    datastore: { backend: { MemoryDatastore } },
    ipfs: { ipld: { Ipld }, ipldInMemory },
    std: { path }
} = adone;

export const srcPath = (...args) => adone.getPath("lib", "glosses", "ipfs", "mfs", ...args);

const core = require(srcPath("core"));
const isWebWorker = require("detect-webworker");
const promisify = require("promisify-es6");
const inMemoryIpld = promisify(ipldInMemory.bind(null, Ipld));

export const createMfs = async () => {
    const ipld = await inMemoryIpld();
    const datastore = new MemoryDatastore();

    const mfs = core({
        ipld,
        repo: {
            datastore
        },

        // https://github.com/Joris-van-der-Wel/karma-mocha-webworker/issues/4
        // There is no IPFS node running on the main thread so run it on the
        // worker along with the tests
        repoOwner: isWebWorker
    });

    // to allow tests to verify information
    mfs.ipld = {
        get: promisify(ipld.get.bind(ipld)),
        getMany: promisify(ipld.getMany.bind(ipld)),
        put: promisify(ipld.put.bind(ipld))
    };
    mfs.datastore = datastore;

    return mfs;
};

adone.lazify({
    cidAtPath: require("./cid_at_path"),
    collectLeafCids: require("./collect_leaf_cids"),
    createShard: require("./create_shard"),
    createShardedDirectory: require("./create_sharded_directory"),
    createTwoShards: require("./create_two_shards"),
    findTreeWithDepth: require("./find_tree_with_depth"),
    printTree: require("./print_tree")
}, exports, require);

export const EMPTY_DIRECTORY_HASH = "QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn";
export const EMPTY_DIRECTORY_HASH_BASE32 = "bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354";


