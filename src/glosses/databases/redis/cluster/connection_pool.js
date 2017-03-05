import adone from "adone";

const imports = adone.lazify({
    utils: "../utils",
    Redis: "../redis"
}, null, require);

export default class ConnectionPool extends adone.EventEmitter {
    constructor(redisOptions) {
        super();
        this.redisOptions = redisOptions;

        // master + slave = all
        this.nodes = {
            all: {},
            master: {},
            slave: {}
        };

        this.specifiedOptions = {};
    }

    /**
     * Find or create a connection to the node
     *
     * @param {Object} node - the node to connect to
     * @param {boolean} [readOnly=false] - whether the node is a slave
     * @return {Redis}
     * @public
     */
    findOrCreate(node, readOnly) {
        setKey(node);
        readOnly = Boolean(readOnly);

        if (this.specifiedOptions[node.key]) {
            Object.assign(node, this.specifiedOptions[node.key]);
        } else {
            this.specifiedOptions[node.key] = node;
        }

        let redis;
        if (this.nodes.all[node.key]) {
            redis = this.nodes.all[node.key];
            if (redis.options.readOnly !== readOnly) {
                redis.options.readOnly = readOnly;
                redis[readOnly ? "readonly" : "readwrite"]().catch(adone.noop);
                if (readOnly) {
                    delete this.nodes.master[node.key];
                    this.nodes.slave[node.key] = redis;
                } else {
                    delete this.nodes.slave[node.key];
                    this.nodes.master[node.key] = redis;
                }
            }
        } else {
            redis = new imports.Redis(adone.vendor.lodash.defaults({
                retryStrategy: null,
                readOnly
            }, node, this.redisOptions, { lazyConnect: true }));
            this.nodes.all[node.key] = redis;
            this.nodes[readOnly ? "slave" : "master"][node.key] = redis;

            redis.once("end", () => {
                delete this.nodes.all[node.key];
                delete this.nodes.master[node.key];
                delete this.nodes.slave[node.key];
                this.emit("-node", redis);
                if (!Object.keys(this.nodes.all).length) {
                    this.emit("drain");
                }
            });

            this.emit("+node", redis);

            redis.on("error", (error) => {
                this.emit("nodeError", error);
            });
        }

        return redis;
    }

    /**
     * Reset the pool with a set of nodes.
     * The old node will be removed.
     *
     * @param {Object[]} nodes
     * @public
     */
    reset(nodes) {
        const newNodes = {};
        for (const node of nodes) {
            const options = {};
            if (adone.is.object(node)) {
                adone.vendor.lodash.defaults(options, node);
            } else if (adone.is.string(node)) {
                adone.vendor.lodash.defaults(options, imports.utils.parseURL(node));
            } else if (adone.is.number(node)) {
                options.port = node;
            } else {
                throw new adone.x.Exception(`Invalid argument ${node}`);
            }
            if (adone.is.string(options.port)) {
                options.port = parseInt(options.port, 10);
            }
            delete options.db;

            setKey(options);
            newNodes[options.key] = options;
        }

        for (const key of Object.keys(this.nodes.all)) {
            if (!newNodes[key]) {
                this.nodes.all[key].disconnect();
            }
        }

        for (const key of Object.keys(newNodes)) {
            this.findOrCreate(newNodes[key], newNodes[key].readOnly);
        }
    }
}

/**
 * Set key property
 *
 * @private
 */
function setKey(node) {
    node = node || {};
    node.port = node.port || 6379;
    node.host = node.host || "127.0.0.1";
    node.key = node.key || node.host + ":" + node.port;
    return node;
}

module.exports = ConnectionPool;
