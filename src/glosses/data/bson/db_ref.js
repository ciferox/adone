const { is } = adone;

export default class DBRef {
    constructor(namespace, oid, db) {
        this._bsontype = "DBRef";
        this.namespace = namespace;
        this.oid = oid;
        this.db = db;
    }

    toJSON() {
        return {
            $ref: this.namespace,
            $id: this.oid,
            $db: is.nil(this.db) ? "" : this.db
        };
    }
}
