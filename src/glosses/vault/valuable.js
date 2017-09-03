const {
    is,
    x,
    vault
} = adone;

const __ = adone.private(vault);

export default class Valuable {
    constructor(vault, id, metaData, tags) {
        this.vault = vault;
        this.id = id;
        this.meta = metaData;
        this._tags = tags;
        this._keys = new Map();
    }

    name() {
        return this.meta.name;
    }

    internalId() {
        return this.id;
    }

    getNotes() {
        return this.meta.notes;
    }

    setNotes(notes) {
        this.meta.notes = notes;
        return this._updateMeta();
    }

    async set(name, value, type) {
        let keyMeta = this._getKeyUnsafe(name);
        let id;
        let shouldUpdateMeta = false;
        type = (is.undefined(type) ? adone.util.typeOf(value) : type);
        if (is.undefined(keyMeta)) {
            id = this.meta.nextKeyId++;
            keyMeta = {
                id,
                name,
                type
            };
            this.meta.kids.push(id);
            await this._updateMeta();
            this._keys.set(name, keyMeta);
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
            await this.vault._setMeta(__.vkey(this.id, id), keyMeta);
        }
        await this.vault._setMeta(__.vvalue(this.id, id), value);
        return id;
    }

    async setMulti(entries) {
        for (const [name, value] of Object.entries(entries)) {
            await this.set(name, value); // eslint-disable-line
        }
    }

    get(name) {
        return this.vault._getMeta(__.vvalue(this.id, this._getKey(name).id));
    }

    type(name) {
        return this._getKey(name).type;
    }

    has(name) {
        return this._keys.has(name);
    }

    keys() {
        return [...this._keys.keys()];
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
            this.meta.notes = "";
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
                result.tags = this._tags;
                break;
            case "onlyName":
                result.tags = this._tags.map((t) => t.name);
                break;
            case "onlyId":
                result.tags = this.meta.tids;
                break;
        }

        return result;
    }

    async fromJSON(json) {
        await this.clear();
        if (is.string(json.notes) && json.notes !== this.meta.notes) {
            this.meta.notes = json.notes;
        }

        if (is.array(json.entries)) {
            const order = [];
            for (const entry of json.entries) {
                const id = await this.set(entry.name, entry.value); // eslint-disable-line
                order.push(id);
            }
            this.meta.order = order;
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
                if (!__.hasTag(this._tags, t)) {
                    result.push(await this.addTag(t)); // eslint-disable-line
                }
            }
            return result;
        }
        if (!__.hasTag(this._tags, tag)) {
            const tagId = await this.vault.addTag(tag, this.id);
            this.meta.tids.push(tagId);
            this._tags.push(__.normalizeTag(tag));
            if (!_isWeak) {
                await this._updateMeta();
            }
            return tagId;
        }
        return null;
    }

    hasTag(tag) {
        return __.hasTag(this._tags, tag);
    }

    async deleteTag(tag) {
        if (__.hasTag(this._tags, tag)) {
            tag = __.normalizeTag(tag);
            const index = this._tags.findIndex((t) => t.name === tag.name);
            this._tags.splice(index, 1);
            this.meta.tids.splice(this.meta.tids.indexOf(this.vault.tagsMap.get(tag.name).id), 1);
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
        return this._tags;
    }

    async _delete(name) {
        const keyMeta = this._getKey(name);
        const index = this.meta.kids.indexOf(keyMeta.id);
        this.meta.kids.splice(index, 1);
        this._keys.delete(name);

        // Delete key meta and value from db.
        await this.vault._deleteMeta(__.vkey(this.id, keyMeta.id));
        await this.vault._deleteMeta(__.vvalue(this.id, keyMeta.id));
    }

    _deleteAllTags() {
        for (let i = this._tags.length; --i >= 0;) {
            this.meta.tids.splice(this.meta.tids.indexOf(this.vault.tagsMap.get(this._tags[i].name).id), 1);
            this._tags.splice(i, 1);
        }
    }

    _getKeyUnsafe(name) {
        return this._keys.get(name);
    }

    _getKey(name) {
        const keyMeta = this._getKeyUnsafe(name);
        if (is.undefined(keyMeta)) {
            throw new x.NotExists(`Key not exists: ${name}`);
        }
        return keyMeta;
    }

    _updateMeta() {
        return this.vault._setMeta(__.valuable(this.id), this.meta);
    }
}
adone.tag.define("VAULT_VALUABLE", "vaultValuable");
adone.tag.set(Valuable, adone.tag.VAULT_VALUABLE);
