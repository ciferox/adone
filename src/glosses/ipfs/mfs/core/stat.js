const {
    formatCid,
    toMfsPath,
    loadNode
} = require("./utils");

const log = require("debug")("ipfs:mfs:stat");

const {
    async: { waterfall },
    stream: { pull },
    // multiformat: { CID }
} = adone;
const { collect, asyncMap } = pull;

const {
    ipfs: { UnixFs: { unmarshal }, unixfsExporter: exporter }
} = adone;

const defaultOptions = {
    hash: false,
    size: false,
    withLocal: false,
    cidBase: "base58btc"
};

module.exports = (context) => {
    return function mfsStat(path, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        options = Object.assign({}, defaultOptions, options);

        log(`Fetching stats for ${path}`);

        waterfall([
            (cb) => toMfsPath(context, path, cb),
            ({ mfsPath, depth }, cb) => {
                pull(
                    exporter(mfsPath, context.ipld, {
                        maxDepth: depth
                    }),

                    asyncMap((file, cb) => {
                        if (options.hash) {
                            return cb(null, {
                                hash: formatCid(file.cid, options.cidBase)
                            });
                        }

                        if (options.size) {
                            return cb(null, {
                                size: file.size
                            });
                        }

                        loadNode(context, {
                            cid: file.cid
                        }, (err, result) => {
                            if (err) {
                                return cb(err);
                            }

                            const {
                                node, cid
                            } = result;

                            const meta = unmarshal(node.data);
                            let blocks = node.links.length;

                            if (meta.type === "file") {
                                blocks = meta.blockSizes.length;
                            }

                            cb(null, {
                                hash: formatCid(cid, options.cidBase),
                                size: meta.fileSize() || 0,
                                cumulativeSize: node.size,
                                blocks,
                                type: meta.type,
                                local: undefined,
                                sizeLocal: undefined,
                                withLocality: false
                            });
                        });
                    }),
                    collect((error, results) => {
                        if (error) {
                            return cb(error);
                        }

                        if (!results.length) {
                            return cb(new Error(`${path} does not exist`));
                        }

                        log(`Stats for ${path}`, results[0]);

                        return cb(null, results[0]);
                    })
                );
            }
        ], callback);
    };
};
