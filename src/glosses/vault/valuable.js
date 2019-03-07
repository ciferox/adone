const {
    is,
    error,
    vault
} = adone;

const {
    vkey,
    vvalue,
    hasTag,
    normalizeTag,
    valuableId,
    VALUABLE_VAULT,
    VALUABLE_ID,
    VALUABLE_META,
    VALUABLE_TAGS,
    VALUABLE_KEYS
} = adone.private(vault);

const VALUABLE_STR_ID = Symbol();

export default class Valuable {
    constructor(vault, id, metaData, tags) {
        this[VALUABLE_VAULT] = vault;
        this[VALUABLE_ID] = id;
        this[VALUABLE_STR_ID] = valuableId(id);
        this[VALUABLE_META] = metaData;
        this[VALUABLE_TAGS] = tags;
        this[VALUABLE_KEYS] = new Map();
    }

    name() {
        return this[VALUABLE_META].name;
    }

    internalId() {
        return this[VALUABLE_ID];
    }

    getVault() {
        return this[VALUABLE_VAULT];
    }

    getNotes() {
        return this[VALUABLE_META].notes;
    }

    setNotes(notes) {
        this[VALUABLE_META].notes = notes;
        return this._updateMeta();
    }

    slice(prefix, separator) {
        return vault.slice(this, prefix, separator);
    }

    async set(name, value, type) {
        let keyMeta = this._getKeyUnsafe(name);
        let id;
        let shouldUpdateMeta = false;
        type = (is.undefined(type) ? adone.typeOf(value) : type);
        if (is.undefined(keyMeta)) {
            id = this[VALUABLE_META].nextKeyId++;
            keyMeta = {
                id,
                name,
                type
            };
            this[VALUABLE_META].kids.push(id);
            await this._updateMeta();
            this[VALUABLE_KEYS].set(name, keyMeta);
            if (value && is.number(value.length)) {
                keyMeta.size = value.length;
            }
            shouldUpdateMeta = true;
        } else {
            id = keyMeta.id;
            if (keyMeta.type !== type) {
                keyMeta.type = type;
                shouldUpdateMeta = true;
            }
            if (value && is.number(value.length) && (is.undefined(keyMeta.size) || keyMeta.size !== value.length)) {
                keyMeta.size = value.length;
                shouldUpdateMeta = true;
            }
        }

        if (shouldUpdateMeta) {
            await this[VALUABLE_VAULT]._setMeta(vkey(this[VALUABLE_ID], id), keyMeta);
        }
        await this[VALUABLE_VAULT]._setMeta(vvalue(this[VALUABLE_ID], id), value);
        return id;
    }

    async add(name, value, type) {
        if (this.has(name)) {
            throw new error.ExistsException(`Key already exists: ${name}`);
        }

        return this.set(name, value, type);
    }

    async setMulti(entries) {
        for (const [name, value] of Object.entries(entries)) {
            await this.set(name, value); // eslint-disable-line
        }
    }

    get(name) {
        return this[VALUABLE_VAULT]._getMeta(vvalue(this[VALUABLE_ID], this._getKey(name).id));
    }

    type(name) {
        return this._getKey(name).type;
    }

    has(name) {
        return this[VALUABLE_KEYS].has(name);
    }

    keys() {
        return [...this[VALUABLE_KEYS].keys()];
    }

    size() {
        return this[VALUABLE_KEYS].size;
    }

    async entries({ includeEntryId = false, entriesAsArray = false } = {}) {
        let result;
        const keys = this.keys();

        if (entriesAsArray) {
            result = [];
            for (const name of keys) {
                const entry = {
                    name,
                    value: await this.get(name), // eslint-disable-line
                    type: this.type(name)
                };

                if (includeEntryId) {
                    entry.id = this._getKey(name).id;
                }

                result.push(entry);
            }
        } else {
            result = {};
            for (const key of keys) {
                result[key] = await this.get(key); // eslint-disable-line
            }
        }

        return result;
    }

    async delete(name) {
        await this._delete(name);
        return this._updateMeta();
    }

    async clear({ includeNotes = true, includeTags = true } = {}) {
        const names = this.keys();
        for (const name of names) {
            await this._delete(name); // eslint-disable-line
        }

        if (includeTags) {
            this._deleteAllTags();
        }

        if (includeNotes) {
            this[VALUABLE_META].notes = "";
        }

        return this._updateMeta();
    }

    // tag formats: 'none', 'normal', 'onlyName', 'onlyId'
    async toJSON({ includeId = false, includeEntryId = false, entriesAsArray = false, tags = "normal" } = {}) {
        const result = {
            name: this.name(),
            notes: this.getNotes()
        };
        if (includeId) {
            result.id = this.internalId();
        }

        result.entries = await this.entries({
            includeEntryId,
            entriesAsArray
        });

        switch (tags) {
            case "normal":
                result.tags = this[VALUABLE_TAGS];
                break;
            case "onlyName":
                result.tags = this[VALUABLE_TAGS].map((t) => t.name);
                break;
            case "onlyId":
                result.tags = this[VALUABLE_META].tids;
                break;
        }

        return result;
    }

    async fromJSON(json) {
        await this.clear();
        if (is.string(json.notes) && json.notes !== this[VALUABLE_META].notes) {
            this[VALUABLE_META].notes = json.notes;
        }

        if (is.array(json.entries)) {
            const order = [];
            for (const entry of json.entries) {
                const id = await this.set(entry.name, entry.value); // eslint-disable-line
                order.push(id);
            }
            this[VALUABLE_META].order = order;
        } else if (is.plainObject(json.entries)) {
            await this.setMulti(json.entries);
        }

        if (is.array(json.tags)) {
            for (const tag of json.tags) {
                await this.addTag(tag, true); // eslint-disable-line
            }
        }

        return this._updateMeta();
    }

    async addTag(tag, _isWeak = false) {
        if (is.array(tag)) {
            const result = [];
            for (const t of tag) {
                if (!hasTag(this[VALUABLE_TAGS], t)) {
                    result.push(await this.addTag(t)); // eslint-disable-line
                }
            }
            return result;
        }
        if (!hasTag(this[VALUABLE_TAGS], tag)) {
            const tagId = await this[VALUABLE_VAULT].addTag(tag, this[VALUABLE_ID]);
            this[VALUABLE_META].tids.push(tagId);
            this[VALUABLE_TAGS].push(normalizeTag(tag));
            if (!_isWeak) {
                await this._updateMeta();
            }
            return tagId;
        }
        return null;
    }

    hasTag(tag) {
        return hasTag(this[VALUABLE_TAGS], tag);
    }

    async deleteTag(tag) {
        if (hasTag(this[VALUABLE_TAGS], tag)) {
            tag = normalizeTag(tag);
            const index = this[VALUABLE_TAGS].findIndex((t) => t.name === tag.name);
            this[VALUABLE_TAGS].splice(index, 1);
            this[VALUABLE_META].tids.splice(this[VALUABLE_META].tids.indexOf(this[VALUABLE_VAULT].tagsMap.get(tag.name).id), 1);
            await this._updateMeta();
            return true;
        }
        return false;
    }

    async deleteAllTags() {
        this._deleteAllTags();
        return this._updateMeta();
    }

    tags() {
        return this[VALUABLE_TAGS];
    }

    async _delete(name) {
        const keyMeta = this._getKey(name);
        const index = this[VALUABLE_META].kids.indexOf(keyMeta.id);
        this[VALUABLE_META].kids.splice(index, 1);
        this[VALUABLE_KEYS].delete(name);

        // Delete key meta and value from db.
        await this[VALUABLE_VAULT]._deleteMeta(vkey(this[VALUABLE_ID], keyMeta.id));
        await this[VALUABLE_VAULT]._deleteMeta(vvalue(this[VALUABLE_ID], keyMeta.id));
    }

    _deleteAllTags() {
        for (let i = this[VALUABLE_TAGS].length; --i >= 0;) {
            this[VALUABLE_META].tids.splice(this[VALUABLE_META].tids.indexOf(this[VALUABLE_VAULT].tagsMap.get(this[VALUABLE_TAGS][i].name).id), 1);
            this[VALUABLE_TAGS].splice(i, 1);
        }
    }

    _getKeyUnsafe(name) {
        return this[VALUABLE_KEYS].get(name);
    }

    _getKey(name) {
        const keyMeta = this._getKeyUnsafe(name);
        if (is.undefined(keyMeta)) {
            throw new error.NotExistsException(`Key not exists: ${name}`);
        }
        return keyMeta;
    }

    _updateMeta() {
        return this[VALUABLE_VAULT]._setMeta(this[VALUABLE_STR_ID], this[VALUABLE_META]);
    }
}
