const { is, vault: { __ } } = adone;

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

    async set(name, value, type) {
        let keyMeta = this._getKeyUnsafe(name);
        let id;
        let isNew = false;
        let shouldUpdateMeta = false;
        type = (type ? type : adone.util.typeOf(value));
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
            isNew = true;
            if (is.number(value.length)) {
                keyMeta.size = value.length;
            }
            shouldUpdateMeta = true;
        } else {
            id = keyMeta.id;
            if (keyMeta.type !== type) {
                keyMeta.type = type;
                shouldUpdateMeta = true;
            }
            if (is.number(value.length) && (is.undefined(keyMeta.size) || keyMeta.size !== value.length)) {
                keyMeta.size = value.length;
                shouldUpdateMeta = true;
            }
        }

        if (shouldUpdateMeta) {
            await this.vault._setMeta(__.vkey(this.id, id), keyMeta);
        }
        await this.vault._setMeta(__.vvalue(this.id, id), value);
        return isNew;
    }

    async setMulti(pairs) {
        for (const [name, value] of Object.entries(pairs)) {
            await this.set(name, value);
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

    async delete(name) {
        const keyMeta = this._getKey(name);
        const index = this.meta.kids.indexOf(keyMeta.id);
        this.meta.kids.splice(index, 1);
        this._keys.delete(name);

        // Delete key meta and value from db.
        await this.vault._deleteMeta(__.vkey(this.id, keyMeta.id));
        await this.vault._deleteMeta(__.vvalue(this.id, keyMeta.id));

        // Update valuable meta data
        return this._updateMeta();
    }

    async clear() {
        const names = this.keys();
        for (const name of names) {
            await this.delete(name);
        }
    }

    async addTag(tag) {
        if (is.array(tag)) {
            let result = false;
            for (const t of tag) {
                if (!__.hasTag(this._tags, t)) {
                    result = true;
                    await this.addTag(t);
                }
            }
            return result;
        }
        if (!__.hasTag(this._tags, tag)) {
            tag = adone.vault.normalizeTag(tag);
            const tids = await this.vault._getTids([tag], this.id);
            this.meta.tids.push(tids[0]);
            this._tags.push(tag);
            await this._updateMeta();
            return true;
        }
        return false;
    }

    hasTag(tag) {
        return __.hasTag(this._tags, tag);
    }

    async deleteTag(tag) {
        if (__.hasTag(this._tags, tag)) {
            tag = adone.vault.normalizeTag(tag);
            const index = this._tags.findIndex((t) => t.name === tag.name);
            this._tags.splice(index, 1);
            this.meta.tids.splice(this.meta.tids.indexOf(this.vault.tagsMap.get(tag.name).id), 1);
            await this._updateMeta();
            return true;
        }
        return false;
    }

    keys() {
        return [...this._keys.keys()];
    }

    async entries() {
        const result = {};
        const keys = this.keys();

        for (const key of keys) {
            result[key] = await this.get(key);
        }

        return result;
    }

    tags() {
        return this._tags;
    }

    _getKeyUnsafe(name) {
        return this._keys.get(name);
    }

    _getKey(name) {
        const keyMeta = this._getKeyUnsafe(name);
        if (is.undefined(keyMeta)) {
            throw new adone.x.NotExists(`Key not exists: ${name}`);
        }
        return keyMeta;
    }

    _updateMeta() {
        return this.vault._setMeta(__.valuable(this.id), this.meta);
    }
}
adone.tag.define("VAULT_VALUABLE", "vaultValuable");
adone.tag.set(Valuable, adone.tag.VAULT_VALUABLE);
