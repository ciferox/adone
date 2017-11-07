const {
    is,
    database: {
        pouch: {
            plugin: { replication: plugin }
        }
    }
} = adone;

export default function replication(PouchDB) {
    PouchDB.replicate = plugin.replicate;
    PouchDB.sync = plugin.sync;

    Object.defineProperty(PouchDB.prototype, "replicate", {
        get() {
            const self = this;
            if (is.undefined(this.replicateMethods)) {
                this.replicateMethods = {
                    from(other, opts, callback) {
                        return self.constructor.replicate(other, self, opts, callback);
                    },
                    to(other, opts, callback) {
                        return self.constructor.replicate(self, other, opts, callback);
                    }
                };
            }
            return this.replicateMethods;
        }
    });

    PouchDB.prototype.sync = function (dbName, opts, callback) {
        return this.constructor.sync(this, dbName, opts, callback);
    };
}
