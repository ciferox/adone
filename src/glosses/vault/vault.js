const { is, vault: { _, Valuable } } = adone;

const vids = "vids";
const tids = "tids";
const nextTagId = "nextTagId";
const nextValuableId = "nextValuableId";

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
        this.tagIdMap = new Map();
        this.nextTagId = undefined;
        this.nextValuableId = undefined;
        this._vcache = new Map();
    }

    async open() {
        await this._db.open();
        // Load valuable ids
        try {
            this.vids = await this.getMeta(vids);
            for (const id of this.vids) {
                const metaData = await this.getMeta(_.valuable(id));
                this.nameIdMap.set(metaData.name, id);
            }
        } catch (err) {
            this.vids = [];
        }

        // Load tag ids
        try {
            this.tids = await this.getMeta(tids);
            for (const id of this.tids) {
                const metaData = await this.getMeta(_.tag(id));
                this.tagIdMap.set(metaData.name, id);
            }
        } catch (err) {
            this.tids = [];
        }

        try {
            this.nextValuableId = await this.getMeta(nextValuableId);
        } catch (err) {
            this.nextValuableId = 1;
        }

        try {
            this.nextTagId = await this.getMeta(nextTagId);
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
            throw new adone.x.Exists(`Valuable '${name}' already exists`);
        }

        const id = await this._getNextId(nextValuableId);
        this.vids.push(id);
        await this.setMeta(vids, this.vids);
        this.nameIdMap.set(name, id);
        const metaData = {
            name,
            tids: await this._getTids(tags, id),
            kids: [],
            nextKeyId: 1
        };
        await this.setMeta(_.valuable(id), metaData);
 
        const valuable = new this.Valuable(this, id, metaData, tags);
        this._vcache.set(id, valuable);
        return valuable;
    }

    async get(name) {
        const id = this._getVid(name);

        let valuable = this._vcache.get(id);
        if (is.undefined(valuable)) {
            const metaData = await this.getMeta(_.valuable(id));
            valuable = new this.Valuable(this, id, metaData, await this._getTagNames(metaData.tids));
            
            for (const kid of metaData.kids) {
                const keyMeta = await this.getMeta(_.vkey(id, kid));
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
        await this.deleteMeta(_.valuable(val.id));         
    }

    has(name) {
        return this.nameIdMap.has(name);
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

    tags() {
        return this._getTagNames(this.tids);
    }

    async _getTagNames(ids) {
        const names = [];
        if (ids.length > 0) {
            for (const [name, id] of this.tagIdMap.entries()) {
                if (ids.includes(id)) {
                    names.push(name);
                }
            }
        }
        return names;
    }

    _getVid(name) {
        const id = this.nameIdMap.get(name);
        if (is.undefined(id)) {
            throw new adone.x.NotExists(`Valuable '${name}' not exists`);
        }
        return id;
    }

    async _getNextId(key) {
        const id = this[key]++;
        await this._db.put(key, this[key]);
        return id;
    }

    async _getTids(tags, vid) {
        const ids = [];
        let needUpdate = false;
        for (const name of tags) {
            let id = this.tagIdMap.get(name);
            if (is.undefined(id)) {
                needUpdate = true;
                id = await this._getNextId(nextTagId);
                this.tids.push(id);
                this.tagIdMap.set(name, id);
                await this.setMeta(_.tag(id), {
                    name,
                    vids: [vid]
                });
            }
            ids.push(id);
        }

        if (needUpdate) {
            await this.setMeta(tids, this.tids);
        }
        return ids;
    }
}
