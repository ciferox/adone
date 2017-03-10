
const { EventEmitter, o, noop, util, is, x } = adone;

const lazy = adone.lazify({
    utils: "../utils",
    Redis: "../redis"
}, null, require);

const setKey = (node = {}) => {
    node.port = node.port || 6379;
    node.host = node.host || "127.0.0.1";
    node.key = node.key || `${node.host}:${node.port}`;
    return node;
};

export default class ConnectionPool extends EventEmitter {
    constructor(redisOptions) {
        super();
        this.redisOptions = redisOptions;

        this.nodes = {
            all: {},
            master: {},
            slave: {}
        };

        this.specifiedOptions = {};
    }

    findOrCreate(node, readOnly) {
        setKey(node);
        readOnly = Boolean(readOnly);

        if (this.specifiedOptions[node.key]) {
            o(node, this.specifiedOptions[node.key]);
        } else {
            this.specifiedOptions[node.key] = node;
        }

        let redis;
        if (this.nodes.all[node.key]) {
            redis = this.nodes.all[node.key];
            if (redis.options.readOnly !== readOnly) {
                redis.options.readOnly = readOnly;
                redis[readOnly ? "readonly" : "readwrite"]().catch(noop);
                if (readOnly) {
                    delete this.nodes.master[node.key];
                    this.nodes.slave[node.key] = redis;
                } else {
                    delete this.nodes.slave[node.key];
                    this.nodes.master[node.key] = redis;
                }
            }
        } else {
            redis = new lazy.Redis(o({
                retryStrategy: null,
                readOnly,
                lazyConnect: true
            }, this.redisOptions, node));
            this.nodes.all[node.key] = redis;
            this.nodes[readOnly ? "slave" : "master"][node.key] = redis;

            redis.once("end", () => {
                delete this.nodes.all[node.key];
                delete this.nodes.master[node.key];
                delete this.nodes.slave[node.key];
                this.emit("-node", redis);
                if (util.keys(this.nodes.all).length === 0) {
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

    reset(nodes) {
        const newNodes = {};
        for (const node of nodes) {
            let options = {};
            if (is.object(node)) {
                options = o(node, options);
            } else if (is.string(node)) {
                options = o(lazy.utils.parseURL(node), options);
            } else if (is.number(node)) {
                options.port = node;
            } else {
                throw new x.InvalidArgument(`Invalid argument ${node}`);
            }
            if (is.string(options.port)) {
                options.port = parseInt(options.port, 10);
            }
            delete options.db;

            setKey(options);
            newNodes[options.key] = options;
        }

        for (const key of util.keys(this.nodes.all)) {
            if (!newNodes[key]) {
                this.nodes.all[key].disconnect();
            }
        }

        for (const node of util.values(newNodes)) {
            this.findOrCreate(node, node.readOnly);
        }
    }
}
