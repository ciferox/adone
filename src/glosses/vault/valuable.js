const { is, vault: { _ } } = adone;

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
            await this.vault.setMeta(_.vkey(this.id, id), keyMeta);
        }
        await this.vault.setMeta(_.vvalue(this.id, id), value);
        return isNew;
    }

    get(name) {
        return this.vault.getMeta(_.vvalue(this.id, this._getKey(name).id));
    }

    async delete(name) {
        const keyMeta = this._getKey(name);
        const index = this.meta.kids.indexOf(keyMeta.id);
        this.meta.kids.splice(index, 1);
        this._keys.delete(name);

        // Delete key meta and value from db.
        await this.vault.deleteMeta(_.vkey(this.id, keyMeta.id));
        await this.vault.deleteMeta(_.vvalue(this.id, keyMeta.id));

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
        if (!this._tags.includes(tag)) {
            const tids = await this.vault._getTids([tag], this.id);
            this.meta.tids.push(tids[0]);
            this._tags.push(tag);
            await this._updateMeta();
            return true;
        }
        return false;
    }

    async deleteTag(tag) {
        if (this._tags.includes(tag)) {
            this._tags.splice(this._tags.indexOf(tag), 1);
            this.meta.tids.splice(this.meta.tids.indexOf(this.vault.tagIdMap.get(tag)), 1);
            await this._updateMeta();
            return true;
        }
        return false;
    }

    keys() {
        return [...this._keys.keys()];
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
            throw new adone.x.NotExists("Key not exists: ${name}");
        }
        return keyMeta;
    }

    _updateMeta() {
        return this.vault.setMeta(_.valuable(this.id), this.meta);
    }
}
