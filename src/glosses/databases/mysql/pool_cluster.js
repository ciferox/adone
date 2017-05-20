const { is, x, util, EventEmitter, database: { mysql: { PoolConfig, Pool } } } = adone;

const selector = {
    RR: () => {
        let index = 0;

        return (clusterIds) => {
            if (index >= clusterIds.length) {
                index = 0;
            }

            const clusterId = clusterIds[index++];

            return clusterId;
        };
    },
    RANDOM: () => (clusterIds) => clusterIds[Math.floor(Math.random() * clusterIds.length)],
    ORDER: () => (clusterIds) => clusterIds[0]
};


class PoolNamespace {
    constructor(cluster, pattern, _selector) {
        this._cluster = cluster;
        this._pattern = pattern;
        this._selector = selector[_selector]();
    }

    getConnection(cb) {
        const clusterNode = this._getClusterNode();

        if (clusterNode === null) {
            return cb(new x.NotExists("Pool does Not exists."));
        }

        return this._cluster._getConnection(clusterNode, (err, connection) => {
            if (err) {
                return cb(err);
            }

            if (connection === "retry") {
                return this.getConnection(cb);
            }

            return cb(null, connection);
        });
    }

    _getClusterNode() {
        const foundNodeIds = this._cluster._findNodeIds(this._pattern);

        if (foundNodeIds.length === 0) {
            return null;
        }

        const nodeId = (foundNodeIds.length === 1) ? foundNodeIds[0] : this._selector(foundNodeIds);

        return this._cluster._getNode(nodeId);
    }
}

export default class PoolCluster extends EventEmitter {
    constructor(config = {}) {
        super();
        this._canRetry = is.undefined(config.canRetry) ? true : config.canRetry;
        this._removeNodeErrorCount = config.removeNodeErrorCount || 5;
        this._defaultSelector = config.defaultSelector || "RR";

        this._closed = false;
        this._lastId = 0;
        this._nodes = {};
        this._serviceableNodeIds = [];
        this._namespaces = {};
        this._findCaches = {};
    }

    of(pattern, _selector) {
        pattern = pattern || "*";

        _selector = _selector || this._defaultSelector;
        _selector = _selector.toUpperCase();
        _selector = selector[_selector] || this._defaultSelector;

        const key = pattern + _selector;

        if (is.undefined(this._namespaces[key])) {
            this._namespaces[key] = new PoolNamespace(this, pattern, _selector);
        }

        return this._namespaces[key];
    }

    add(id, config) {
        if (is.object(id)) {
            config = id;
            id = `CLUSTER::${++this._lastId}`;
        }

        if (is.undefined(this._nodes[id])) {
            this._nodes[id] = {
                id,
                errorCount: 0,
                pool: new Pool({ config: new PoolConfig(config) })
            };

            this._serviceableNodeIds.push(id);

            this._clearFindCaches();
        }
    }

    getConnection(pattern, selector, cb) {
        let namespace;
        if (is.function(pattern)) {
            cb = pattern;
            namespace = this.of();
        } else {
            if (is.function(selector)) {
                cb = selector;
                selector = this._defaultSelector;
            }

            namespace = this.of(pattern, selector);
        }

        namespace.getConnection(cb);
    }

    end() {
        if (this._closed) {
            return;
        }

        this._closed = true;

        for (const node of util.values(this._nodes)) {
            node.pool.end();
        }
    }

    _findNodeIds(pattern) {
        if (!is.undefined(this._findCaches[pattern])) {
            return this._findCaches[pattern];
        }

        let foundNodeIds;

        if (pattern === "*") { // all
            foundNodeIds = this._serviceableNodeIds;
        } else if (this._serviceableNodeIds.includes(pattern)) { // one
            foundNodeIds = [pattern];
        } else { // wild matching
            const keyword = pattern.substring(pattern.length - 1, 0);

            foundNodeIds = this._serviceableNodeIds.filter((id) => {
                return id.indexOf(keyword) === 0;
            });
        }

        this._findCaches[pattern] = foundNodeIds;

        return foundNodeIds;
    }

    _getNode(id) {
        return this._nodes[id] || null;
    }

    _increaseErrorCount(node) {
        if (++node.errorCount >= this._removeNodeErrorCount) {
            const index = this._serviceableNodeIds.indexOf(node.id);
            if (index !== -1) {
                this._serviceableNodeIds.splice(index, 1);
                delete this._nodes[node.id];

                this._clearFindCaches();

                node.pool.end();

                this.emit("remove", node.id);
            }
        }
    }

    _decreaseErrorCount(node) {
        if (node.errorCount > 0) {
            --node.errorCount;
        }
    }

    _getConnection(node, cb) {
        const self = this;

        node.pool.getConnection((err, connection) => {
            if (err) {
                self._increaseErrorCount(node);

                if (self._canRetry) {
                    adone.warn(`[Error] PoolCluster : ${err}`);
                    return cb(null, "retry");
                } 
                return cb(err);
                
            } 
            self._decreaseErrorCount(node);
            

            connection._clusterId = node.id;

            return cb(null, connection);
        });
    }

    _clearFindCaches() {
        this._findCaches = {};
    }
}
