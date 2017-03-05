import adone from "adone";
const CollectionsMap = adone.collection.Map.CollectionsMap;

export default class MultiMap extends CollectionsMap {
    constructor(values, bucket, equals, hash) {
        super(values, equals, hash, function getDefault(key) {
            const bucket = this.bucket(key);
            CollectionsMap.prototype.set.call(this, key, bucket);
            return bucket;
        });
        this.bucket = bucket;
    }
}

MultiMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.bucket,
        this.contentEquals,
        this.contentHash
    );
};

MultiMap.prototype.set = function (key, newValues) {
    const values = this.get(key);
    values.swap(0, values.length, newValues);
};

MultiMap.prototype.bucket = function (key) {
    return [];
};
