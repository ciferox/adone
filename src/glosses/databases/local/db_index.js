
const { database: { local: { Model } }, is, collection } = adone;

const projectForUnique = (elt) => {
    if (is.null(elt)) {
        return "$null";
    }
    if (is.string(elt)) {
        return `$string${elt}`;
    }
    if (is.boolean(elt)) {
        return `$boolean${elt}`;
    }
    if (is.number(elt)) {
        return `$number${elt}`;
    }
    if (is.array(elt)) {
        return `$date${elt.getTime()}`;
    }

    return elt;  // Arrays and objects, will check for pointer equality
};


export default class Index {
    constructor({ fieldName, unique = false, sparse = false } = {}) {
        this.fieldName = fieldName;
        this.unique = unique;
        this.sparse = sparse;

        this.treeOptions = { unique: this.unique, compareKeys: Model.compareThings };

        this.reset();   // No data in the beginning
    }

    reset(newData) {
        this.tree = new collection.AVLTree(this.treeOptions);

        if (newData) {
            this.insert(newData);
        }
    }

    insert(doc) {
        if (is.array(doc)) {
            this.insertMultipleDocs(doc);
            return;
        }

        const key = Model.getDotValue(doc, this.fieldName);

        // We don"t index documents that don"t contain the field if the index is sparse
        if (is.undefined(key) && this.sparse) {
            return;
        }

        if (!is.array(key)) {
            this.tree.insert(key, doc);
            return;
        }
        // If an insert fails due to a unique constraint, roll back all inserts before it
        const keys = adone.util.unique(key, projectForUnique);

        let error;
        let failingIndex;

        for (let i = 0; i < keys.length; ++i) {
            try {
                this.tree.insert(keys[i], doc);
            } catch (e) {
                error = e;
                failingIndex = i;
                break;
            }
        }

        if (error) {
            for (let i = 0; i < failingIndex; i += 1) {
                this.tree.delete(keys[i], doc);
            }

            throw error;
        }
    }

    insertMultipleDocs(docs) {
        let failingIndex;
        let error;
        for (let i = 0; i < docs.length; ++i) {
            try {
                this.insert(docs[i]);
            } catch (e) {
                error = e;
                failingIndex = i;
                break;
            }
        }

        if (error) {
            for (let i = 0; i < failingIndex; i += 1) {
                this.remove(docs[i]);
            }

            throw error;
        }
    }

    remove(doc) {
        if (is.array(doc)) {
            for (let i = 0; i < doc.length; ++i) {
                this.remove(doc[i]);
            }
            return;
        }

        const key = Model.getDotValue(doc, this.fieldName);

        if (is.undefined(key) && this.sparse) {
            return;
        }

        if (!is.array(key)) {
            this.tree.delete(key, doc);
        } else {
            const keys = adone.util.unique(key, projectForUnique);
            for (let i = 0; i < keys.length; ++i) {
                this.tree.delete(keys[i], doc);
            }
        }
    }

    update(oldDoc, newDoc) {
        if (is.array(oldDoc)) {
            this.updateMultipleDocs(oldDoc);
            return;
        }

        this.remove(oldDoc);

        try {
            this.insert(newDoc);
        } catch (e) {
            this.insert(oldDoc);
            throw e;
        }
    }

    updateMultipleDocs(pairs) {
        for (let i = 0; i < pairs.length; ++i) {
            this.remove(pairs[i].oldDoc);
        }

        let error;
        let failingIndex;
        for (let i = 0; i < pairs.length; ++i) {
            try {
                this.insert(pairs[i].newDoc);
            } catch (e) {
                error = e;
                failingIndex = i;
                break;
            }
        }

        // If an error was raised, roll back changes in the inverse order
        if (error) {
            for (let i = 0; i < failingIndex; ++i) {
                this.remove(pairs[i].newDoc);
            }

            for (let i = 0; i < pairs.length; ++i) {
                this.insert(pairs[i].oldDoc);
            }
            throw error;
        }
    }

    revertUpdate(oldDoc, newDoc) {
        const revert = [];

        if (!is.array(oldDoc)) {
            this.update(newDoc, oldDoc);
        } else {
            for (let i = 0; i < oldDoc.length; ++i) {
                const pair = oldDoc[i];
                revert.push({ oldDoc: pair.newDoc, newDoc: pair.oldDoc });
            }
            this.update(revert);
        }
    }

    getMatching(value) {
        if (!is.array(value)) {
            return this.tree.search(value);
        }
        const _res = new Map();

        for (let i = 0; i < value.length; ++i) {
            const match = this.getMatching(value[i]);
            for (let j = 0; j < match.length; ++j) {
                _res.set(match[j]._id, match[j]);
            }
        }

        return [..._res.values()];
    }

    getBetweenBounds(query) {
        return this.tree.betweenBounds(query);
    }

    getAll() {
        const res = [];

        this.tree.executeOnEveryNode((node) => {
            const { data } = node;
            for (let i = 0; i < data.length; ++i) {
                res.push(data[i]);
            }
        });

        return res;
    }
}
