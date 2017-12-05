const {
    is
} = adone;

export default class Collection {
    constructor(col) {
        this.collection = col;
        this.collectionName = col.collectionName;
    }

    find(match, options) {
        return this.collection.find(match, options).toArray();
    }

    findOne(match, options) {
        return this.collection.findOne(match, options);
    }

    count(match, options) {
        return this.collection.count(match, options);
    }

    distinct(prop, match, options) {
        return this.collection.distinct(prop, match, options);
    }

    update(match, update, options) {
        return this.collection.update(match, update, options);
    }

    updateMany(match, update, options) {
        return this.collection.updateMany(match, update, options);
    }

    updateOne(match, update, options) {
        return this.collection.updateOne(match, update, options);
    };

    replaceOne(match, update, options) {
        return this.collection.replaceOne(match, update, options);
    }

    deleteOne(match, options) {
        return this.collection.deleteOne(match, options);
    }

    deleteMany(match, options) {
        return this.collection.deleteMany(match, options);
    }

    remove(match, options) {
        return this.collection.remove(match, options);
    }

    findAndModify(match, update, options) {
        const sort = is.array(options.sort) ? options.sort : [];
        return this.collection.findAndModify(match, sort, update, options);
    }

    findStream(match, findOptions, streamOptions) {
        return this.collection.find(match, findOptions).stream(streamOptions);
    }

    findCursor(match, findOptions) {
        return this.collection.find(match, findOptions);
    }
}
