const each = require("async/each");

const {
    ipfs: { httpClient, ipfsdCtl }
} = adone;

const createFactory = function (options) {
    options = options || {};

    options.factoryOptions = options.factoryOptions || {};
    options.spawnOptions = options.spawnOptions || { initOptions: { bits: 1024, profile: "test" } };

    const ipfsFactory = ipfsdCtl.create(options.factoryOptions);

    return function createCommon() {
        const nodes = [];
        let setup; let teardown;

        if (options.createSetup) {
            setup = options.createSetup({ ipfsFactory, nodes }, options);
        } else {
            setup = (callback) => {
                callback(null, {
                    spawnNode(cb) {
                        ipfsFactory.spawn(options.spawnOptions, (err, _ipfsd) => {
                            if (err) {
                                return cb(err);
                            }

                            nodes.push(_ipfsd);
                            cb(null, httpClient(_ipfsd.apiAddr));
                        });
                    }
                });
            };
        }

        if (options.createTeardown) {
            teardown = options.createTeardown({ ipfsFactory, nodes }, options);
        } else {
            teardown = (callback) => each(nodes, (node, cb) => node.stop(cb), callback);
        }

        return { setup, teardown };
    };
};

exports.create = createFactory;
