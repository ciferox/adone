

const promisify = require("promisify-es6");
const CID = require("cids");
const pull = require("pull-stream");
const mapAsync = require("async/map");
const setImmediate = require("async/setImmediate");
const flattenDeep = require("lodash/flattenDeep");
const errCode = require("err-code");

module.exports = function dag(self) {
    return {
        put: promisify((dagNode, options, callback) => {
            if (is.function(options)) {
                callback = options;
                options = {};
            }

            options = options || {};

            if (options.cid && (options.format || options.hashAlg)) {
                return callback(new Error("Can't put dag node. Please provide either `cid` OR `format` and `hashAlg` options."));
            } else if (((options.format && !options.hashAlg) || (!options.format && options.hashAlg))) {
                return callback(new Error("Can't put dag node. Please provide `format` AND `hashAlg` options."));
            }

            const optionDefaults = {
                format: "dag-cbor",
                hashAlg: "sha2-256"
            };

            options = options.cid ? options : Object.assign({}, optionDefaults, options);

            self._ipld.put(dagNode, options, (err, cid) => {
                if (err) {
                    return callback(err);
                }

                if (options.preload !== false) {
                    self._preload(cid);
                }

                callback(null, cid);
            });
        }),

        get: promisify((cid, path, options, callback) => {
            if (is.function(path)) {
                callback = path;
                path = undefined;
            }

            if (is.function(options)) {
                callback = options;

                // Allow options in path position
                if (!is.string(path)) {
                    options = path;
                    path = null;
                } else {
                    options = {};
                }
            }

            options = options || {};

            if (is.string(cid)) {
                const split = cid.split("/");

                try {
                    cid = new CID(split[0]);
                } catch (err) {
                    return setImmediate(() => callback(errCode(err, "ERR_INVALID_CID")));
                }

                split.shift();

                if (split.length > 0) {
                    path = split.join("/");
                } else {
                    path = "/";
                }
            } else if (is.buffer(cid)) {
                try {
                    cid = new CID(cid);
                } catch (err) {
                    return setImmediate(() => callback(errCode(err, "ERR_INVALID_CID")));
                }
            }

            if (options.preload !== false) {
                self._preload(cid);
            }

            self._ipld.get(cid, path, options, callback);
        }),

        tree: promisify((cid, path, options, callback) => {
            if (typeof path === "object") {
                callback = options;
                options = path;
                path = undefined;
            }

            if (is.function(path)) {
                callback = path;
                path = undefined;
            }

            if (is.function(options)) {
                callback = options;
                options = {};
            }

            options = options || {};

            if (is.string(cid)) {
                const split = cid.split("/");

                try {
                    cid = new CID(split[0]);
                } catch (err) {
                    return setImmediate(() => callback(errCode(err, "ERR_INVALID_CID")));
                }

                split.shift();

                if (split.length > 0) {
                    path = split.join("/");
                } else {
                    path = undefined;
                }
            }

            if (options.preload !== false) {
                self._preload(cid);
            }

            pull(
                self._ipld.treeStream(cid, path, options),
                pull.collect(callback)
            );
        }),

        // TODO - use IPLD selectors once they are implemented
        _getRecursive: promisify((multihash, options, callback) => {
            // gets flat array of all DAGNodes in tree given by multihash

            if (is.function(options)) {
                callback = options;
                options = {};
            }

            options = options || {};

            let cid;

            try {
                cid = new CID(multihash);
            } catch (err) {
                return setImmediate(() => callback(errCode(err, "ERR_INVALID_CID")));
            }

            self.dag.get(cid, "", options, (err, res) => {
                if (err) {
                    return callback(err); 
                }

                mapAsync(res.value.links, (link, cb) => {
                    self.dag._getRecursive(link.cid, options, cb);
                }, (err, nodes) => {
                    // console.log('nodes:', nodes)
                    if (err) {
                        return callback(err);
                    }
                    callback(null, flattenDeep([res.value, nodes]));
                });
            });
        })
    };
};
