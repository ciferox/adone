const { database: { redis }, EventEmitter, noop, util, is, x } = adone;
const { __ } = redis;

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
            Object.assign(node, this.specifiedOptions[node.key]);
        } else {
            this.specifiedOptions[node.key] = node;
        }

        let instance;
        if (this.nodes.all[node.key]) {
            instance = this.nodes.all[node.key];
            if (instance.options.readOnly !== readOnly) {
                instance.options.readOnly = readOnly;
                instance[readOnly ? "readonly" : "readwrite"]().catch(noop);
                if (readOnly) {
                    delete this.nodes.master[node.key];
                    this.nodes.slave[node.key] = instance;
                } else {
                    delete this.nodes.slave[node.key];
                    this.nodes.master[node.key] = instance;
                }
            }
        } else {
            instance = new redis.Redis({
                retryStrategy: null,
                readOnly,
                lazyConnect: true,
                ...this.redisOptions,
                ...node
            });
            this.nodes.all[node.key] = instance;
            this.nodes[readOnly ? "slave" : "master"][node.key] = instance;

            instance.once("end", () => {
                delete this.nodes.all[node.key];
                delete this.nodes.master[node.key];
                delete this.nodes.slave[node.key];
                this.emit("-node", instance);
                if (util.keys(this.nodes.all).length === 0) {
                    this.emit("drain");
                }
            });

            this.emit("+node", instance);

            instance.on("error", (error) => {
                this.emit("nodeError", error);
            });
        }

        return instance;
    }

    reset(nodes) {
        const newNodes = {};
        for (const node of nodes) {
            let options = {};
            if (is.object(node)) {
                options = { ...node, ...options };
            } else if (is.string(node)) {
                options = { ...__.util.parseURL(node), ...options };
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
