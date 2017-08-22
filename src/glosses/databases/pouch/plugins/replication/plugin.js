const { database: { pouch: { plugin: { replication: plugin } } } } = adone;

export default function replication(PouchDB) {
    PouchDB.replicate = plugin.replicate;
    PouchDB.sync = plugin.sync;

    Object.defineProperty(PouchDB.prototype, "replicate", {
        get() {
            const self = this;
            return {
                from(other, opts, callback) {
                    return self.constructor.replicate(other, self, opts, callback);
                },
                to(other, opts, callback) {
                    return self.constructor.replicate(self, other, opts, callback);
                }
            };
        }
    });

    PouchDB.prototype.sync = function (dbName, opts, callback) {
        return this.constructor.sync(this, dbName, opts, callback);
    };
}
