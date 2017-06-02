const { is, vault: { __, Valuable } } = adone;

const VIDS = "vids";
const TIDS = "tids";
const NEXT_TAG_ID = "nextTagId";
const NEXT_VALUABLE_ID = "nextValuableId";

export default class Vault {
    constructor(options) {
        this.options = Object.assign({}, options, {
            valueEncoding: "mpak"
        });
        if (is.class(this.options.valuable)) {
            this.Valuable = this.options.valuable;
            delete this.options.valuable;
        } else {
            this.Valuable = Valuable;
        }
        this._db = new adone.database.level.DB(this.options);
        this.vids = undefined; // valuable ids
        this.tids = undefined; // tag ids
        this.nameIdMap = new Map();
        this.tagsMap = new Map();
        this.nextTagId = undefined;
        this.nextValuableId = undefined;
        this._vcache = new Map();
    }

    async open() {
        await this._db.open();
        // Load valuable ids
        try {
            this.vids = await this.getMeta(VIDS);
            for (const id of this.vids) {
                const metaData = await this.getMeta(__.valuable(id));
                this.nameIdMap.set(metaData.name, id);
            }
        } catch (err) {
            this.vids = [];
        }

        // Load tag ids
        try {
            this.tids = await this.getMeta(TIDS);
            for (const id of this.tids) {
                const tagMetaData = await this.getMeta(__.tag(id));
                this.tagsMap.set(tagMetaData.tag.name, tagMetaData);
            }
        } catch (err) {
            this.tids = [];
        }

        try {
            this.nextValuableId = await this.getMeta(NEXT_VALUABLE_ID);
        } catch (err) {
            this.nextValuableId = 1;
        }

        try {
            this.nextTagId = await this.getMeta(NEXT_TAG_ID);
        } catch (err) {
            this.nextTagId = 1;
        }
    }

    close() {
        return this._db.close();
    }

    location() {
        return this._db.location;
    }

    async create(name, tags = []) {
        if (this.nameIdMap.has(name)) {
            throw new adone.x.Exists(`Already exists: '${name}'`);
        }

        const id = await this._getNextId(NEXT_VALUABLE_ID);
        this.vids.push(id);
        await this.setMeta(VIDS, this.vids);
        this.nameIdMap.set(name, id);
        const normTags = __.normalizeTags(tags);
        const metaData = {
            name,
            tids: await this._getTids(normTags, id),
            kids: [],
            nextKeyId: 1
        };
        await this.setMeta(__.valuable(id), metaData);

        const valuable = new this.Valuable(this, id, metaData, normTags);
        this._vcache.set(id, valuable);
        return valuable;
    }

    async get(name) {
        const id = this._getVid(name);

        let valuable = this._vcache.get(id);
        if (is.undefined(valuable)) {
            const metaData = await this.getMeta(__.valuable(id));
            valuable = new this.Valuable(this, id, metaData, await this.tags(metaData.tids));

            for (const kid of metaData.kids) {
                const keyMeta = await this.getMeta(__.vkey(id, kid));
                valuable._keys.set(keyMeta.name, keyMeta);
            }
        }

        return valuable;
    }

    release(name) {
        return this._vcache.delete(this._getVid(name).id);
    }

    async delete(name) {
        const val = await this.get(name);
        await val.clear();
        this.vids.splice(this.vids.indexOf(val.id), 1);
        this.nameIdMap.delete(name);
        await this.deleteMeta(__.valuable(val.id));
    }

    has(name) {
        return this.nameIdMap.has(name);
    }

    keys() {
        return [...this.nameIdMap.keys()];
    }

    async values() {
        const vaults = [];
        for (const name of this.nameIdMap.keys()) {
            vaults.push(await this.get(name));
        }

        return vaults;
    }

    async entries() {
        const vaults = {};
        for (const name of this.nameIdMap.keys()) {
            vaults[name] = await this.get(name);
        }

        return vaults;
    }

    tags(ids = null) {
        if (is.array(ids)) {
            return [...this.tagsMap.values()].filter((t) => ids.includes(t.id)).map((t) => t.tag);
        }
        return [...this.tagsMap.values()].map((t) => t.tag);
    }

    tagNames(ids) {
        if (is.array(ids)) {
            return [...this.tagsMap.values()].filter((t) => ids.includes(t.id)).map((t) => t.tag.name);
        }
        return [...this.tagsMap.values()].map((t) => t.tag.name);
    }

    async _getTagNames(ids) {
        const names = [];
        if (ids.length > 0) {
            for (const [name, metaData] of this.tagsMap.entries()) {
                if (ids.includes(metaData.id)) {
                    names.push(name);
                }
            }
        }
        return names;
    }

    getMeta(id) {
        return this._db.get(id);
    }

    setMeta(id, data) {
        return this._db.put(id, data);
    }

    deleteMeta(id) {
        return this._db.del(id);
    }

    _getVid(name) {
        const id = this.nameIdMap.get(name);
        if (is.undefined(id)) {
            throw new adone.x.NotExists(`Not exists: '${name}'`);
        }
        return id;
    }

    async _getNextId(key) {
        const id = this[key]++;
        await this._db.put(key, this[key]);
        return id;
    }

    async _getTids(tags, vid) {
        // tags must be normalized

        const ids = [];
        let needUpdate = false;

        for (const tag of tags) {
            if (!is.string(tag.name)) {
                throw new adone.x.NotValid("The tag must be a string or an object with at least one property: 'name'");
            }
            let metaData = this.tagsMap.get(tag.name);
            if (is.undefined(metaData)) {
                needUpdate = true;
                const id = await this._getNextId(NEXT_TAG_ID);
                this.tids.push(id);
                metaData = {
                    id,
                    tag,
                    vids: [vid]
                };
                this.tagsMap.set(tag.name, metaData);
                await this.setMeta(__.tag(id), metaData);
            }
            ids.push(metaData.id);
        }

        if (needUpdate) {
            await this.setMeta(TIDS, this.tids);
        }
        return ids;
    }
}
