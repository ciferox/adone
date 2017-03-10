
const { database: { local: { Model } }, x, is, util } = adone;

export default class Cursor {
    constructor(db, query = {}, execFn = null) {
        this.db = db;
        this.query = query;
        this.execFn = execFn;
    }

    limit(limit) {
        this._limit = limit;
        return this;
    }

    skip(skip) {
        this._skip = skip;
        return this;
    }

    sort(sortQuery) {
        this._sort = sortQuery;
        return this;
    }

    projection(projection) {
        this._projection = projection;
        return this;
    }

    project(candidates) {
        if (is.undefined(this._projection) || util.keys(this._projection).length === 0) {
            return candidates;
        }

        const keepId = this._projection._id === 0 ? false : true;
        delete this._projection._id;

        // Check for consistency
        const keys = util.keys(this._projection);
        let action;
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            if (!is.undefined(action) && this._projection[key] !== action) {
                throw new x.IllegalState("Can't both keep and omit fields except for _id");
            }
            action = this._projection[key];
        }

        // Do the actual projection
        const res = [];
        for (let i = 0; i < candidates.length; ++i) {
            const candidate = candidates[i];
            let toPush;
            if (action === 1) {   // pick-type projection
                toPush = { $set: {} };
                for (let j = 0; j < keys.length; ++j) {
                    const key = keys[j];
                    toPush.$set[key] = Model.getDotValue(candidate, key);
                    if (is.undefined(toPush.$set[key])) {
                        delete toPush.$set[key];
                    }
                }
                toPush = Model.modify({}, toPush);
            } else {   // omit-type projection
                toPush = { $unset: {} };
                for (let j = 0; j < keys.length; ++j) {
                    toPush.$unset[keys[j]] = true;
                }
                toPush = Model.modify(candidate, toPush);
            }
            if (keepId) {
                toPush._id = candidate._id;
            } else {
                delete toPush._id;
            }
            res.push(toPush);
        }

        return res;
    }

    async exec() {
        const candidates = await this.db.getCandidates(this.query);
        let res = [];
        let skipped = 0;
        let added = 0;
        for (let i = 0; i < candidates.length; ++i) {
            const candidate = candidates[i];
            if (Model.match(candidate, this.query)) {
                // If a sort is defined, wait for the results to be sorted before applying limit and skip
                if (!this._sort) {
                    if (this._skip && this._skip > skipped) {
                        skipped += 1;
                    } else {
                        res.push(candidate);
                        added += 1;
                        if (this._limit && this._limit <= added) {
                            break;
                        }
                    }
                } else {
                    res.push(candidate);
                }
            }
        }

        if (this._sort) {
            const keys = util.keys(this._sort);

            const criteria = [];
            for (let i = 0; i < keys.length; ++i) {
                criteria.push({ key: keys[i], direction: this._sort[keys[i]] });
            }
            res.sort((a, b) => {
                for (let i = 0; i < criteria.length; ++i) {
                    const criterion = criteria[i];
                    const compare = criterion.direction * Model.compareThings(Model.getDotValue(a, criterion.key), Model.getDotValue(b, criterion.key), this.db.compareStrings);
                    if (compare !== 0) {
                        return compare;
                    }
                }
                return 0;
            });

            const limit = this._limit || res.length;
            const skip = this._skip || 0;

            res = res.slice(skip, skip + limit);
        }

        const projected = await this.project(res);
        if (this.execFn) {
            return this.execFn(projected);
        }
        return projected;
    }
}
