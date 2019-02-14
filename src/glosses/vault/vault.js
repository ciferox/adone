const {
    is,
    vault,
    database: { level }
} = adone;

const VIDS = "vids";
const TIDS = "tids";
const CREATED = "created";
const UPDATED = "updated";
const NOTES = "notes";
const NEXT_TAG_ID = "nextTagId";
const NEXT_VALUABLE_ID = "nextValuableId";

const {
    vkey,
    tagId,
    hasTag,
    normalizeTag,
    normalizeTags,
    valuableId,
    VALUABLE_ID,
    VALUABLE_KEYS
} = adone.private(vault);

const createDB = (options) => {
    let backend;

    if (is.string(options.location)) {
        backend = new level.backend.LevelDB(options.location);
    } else {
        backend = new level.backend.Memory();
    }

    const codecOptions = adone.util.pick(options, ["keyEncoding", "valueEncoding", "encoding"]);
    const dbOptions = adone.util.omit(options, ["keyEncoding", "valueEncoding", "encoding", "location"]);

    return new level.DB(new level.backend.Encoding(backend, codecOptions), dbOptions);
};

/**
 * Vault implementation based on `adone.database.level`.
 */
export default class Vault {
    /**
     * Creates vault instance
     * @param {{ location, ValuableClass } = {}} options
     */
    constructor(options) {
        this.options = Object.assign({}, options, {
            valueEncoding: "mpak"
        });
        if (is.class(this.options.ValuableClass)) {
            this.Valuable = this.options.ValuableClass;
            delete this.options.ValuableClass;
        } else {
            this.Valuable = vault.Valuable;
        }
        this.store = createDB(this.options);
        this._reset();
    }

    async open() {
        await this.store.open();
        // Load valuable ids
        try {
            this.vids = await this._getMeta(VIDS);
            for (const id of this.vids) {
                // eslint-disable-next-line no-await-in-loop
                const metaData = await this._getMeta(valuableId(id));
                this.nameIdMap.set(metaData.name, id);
            }
        } catch (err) {
            this.vids = [];
        }

        // Load tag ids
        try {
            this.tids = await this._getMeta(TIDS);
            for (const id of this.tids) {
                // eslint-disable-next-line no-await-in-loop
                const tagMetaData = await this._getMeta(tagId(id));
                this.tagsMap.set(tagMetaData.tag.name, tagMetaData);
            }
        } catch (err) {
            this.tids = [];
        }

        // Load timestamps
        try {
            this.created = await this._getMeta(CREATED);
        } catch (err) {
            this.created = (new Date()).getTime();
            await this._setMeta(CREATED, this.created);
        }

        try {
            this.updated = await this._getMeta(UPDATED);
        } catch (err) {
            this.updated = (new Date()).getTime();
            await this._setMeta(UPDATED, this.updated);
        }

        // Load description
        try {
            this.notes = await this._getMeta(NOTES);
        } catch (err) {
            /* ignore */
        }

        try {
            this.nextValuableId = await this._getMeta(NEXT_VALUABLE_ID);
        } catch (err) {
            this.nextValuableId = 1;
        }

        try {
            this.nextTagId = await this._getMeta(NEXT_TAG_ID);
        } catch (err) {
            this.nextTagId = 1;
        }
    }

    async close() {
        for (const name of this.keys()) {
            await this.release(name); // eslint-disable-line
        }

        await this.store.close();

        this.nameIdMap.clear();
        this.tagsMap.clear();

        this._reset();
    }

    location() {
        return this.options.location;
    }

    async create(name, { Valuable = this.Valuable, tags = [] } = {}) {
        if (this.nameIdMap.has(name)) {
            throw new adone.error.ExistsException(`Already exists: '${name}'`);
        }

        const id = await this._getNextId(NEXT_VALUABLE_ID);
        this.vids.push(id);
        await this._setMeta(VIDS, this.vids);
        this.nameIdMap.set(name, id);
        const normTags = normalizeTags(tags);
        const metaData = {
            name,
            notes: "",
            tids: await this._getTids(normTags, id),
            kids: [],
            nextKeyId: 1
        };
        await this._setMeta(valuableId(id), metaData);

        const valuable = new Valuable(this, id, metaData, normTags);
        this._vcache.set(id, valuable);
        return valuable;
    }

    async get(name, { Valuable = this.Valuable } = {}) {
        const id = this._getVid(name);
        let valuable = this._vcache.get(id);
        if (is.undefined(valuable)) {
            const metaData = await this._getMeta(valuableId(id));
            valuable = new Valuable(this, id, metaData, await this.tags(metaData.tids));

            for (const kid of metaData.kids) {
                const keyMeta = await this._getMeta(vkey(id, kid)); // eslint-disable-line
                valuable[VALUABLE_KEYS].set(keyMeta.name, keyMeta);
            }
            this._vcache.set(id, valuable);
        }

        return valuable;
    }

    release(name) {
        return this._vcache.delete(this._getVid(name).id);
    }

    async delete(name) {
        const val = await this.get(name);
        await val.clear();
        this.vids.splice(this.vids.indexOf(val[VALUABLE_ID]), 1);
        this.nameIdMap.delete(name);
        await this._setMeta(VIDS, this.vids); // TODO: do it in one batch somehow?
        await this._deleteMeta(valuableId(val[VALUABLE_ID]));
    }

    async clear({ entries = true, tags = false } = {}) {
        if (entries) {
            const names = this.keys();
            for (const name of names) {
                await this.delete(name); // eslint-disable-line
            }
        }

        if (tags) {
            const tags = this._getTags();
            for (const tag of tags) {
                await this.deleteTag(tag); // eslint-disable-line
            }
        }

        return this.updated;
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
            // eslint-disable-next-line no-await-in-loop
            vaults.push(await this.get(name));
        }

        return vaults;
    }

    async entries() {
        const vaults = {};
        for (const name of this.nameIdMap.keys()) {
            // eslint-disable-next-line no-await-in-loop
            vaults[name] = await this.get(name);
        }

        return vaults;
    }

    async toJSON({ valuable, includeStats = false } = {}) {
        const result = {};

        if (is.plainObject(valuable)) {
            const valuables = [];
            for (const name of this.nameIdMap.keys()) {
                // eslint-disable-next-line no-await-in-loop
                valuables.push(await (await this.get(name)).toJSON(valuable));
            }
            result.valuables = valuables;
        }

        if (includeStats) {
            result.stats = {
                location: this.location(),
                created: this.created,
                updated: this.updated
            };
        }

        return result;
    }

    async addTag(tag, vid = null) {
        const tags = this._getTags();
        if (!hasTag(tags, tag)) {
            const tagIds = await this._getTids([normalizeTag(tag)], vid);
            return tagIds[0];
        }
        return null;
    }

    async deleteTag(tag) {
        const tags = this._getTags();
        if (hasTag(tags, tag)) {
            const valuables = await this.values();
            for (const val of valuables) {
                // eslint-disable-next-line no-await-in-loop
                await val.deleteTag(tag);
            }
            tag = normalizeTag(tag);
            const tid = this.tagsMap.get(tag.name).id;
            this.tids.splice(this.tids.indexOf(tid), 1);
            await this._setMeta(TIDS, this.tids);

            this.tagsMap.delete(tag.name);
            await this._deleteMeta(tagId(tid));
            return true;
        }
        return false;
    }

    tags(ids = null, { privateProps = false } = {}) {
        let factory;
        if (privateProps) {
            factory = (t) => Object.assign({
                $id: t.id,
                $vids: t.vids
            }, t.tag);
        } else {
            factory = (t) => t.tag;
        }

        const vals = [...this.tagsMap.values()];
        return (is.array(ids) ? vals.filter((t) => ids.includes(t.id)).map(factory) : vals.map(factory));
    }

    tagNames(ids) {
        if (is.array(ids)) {
            return [...this.tagsMap.values()].filter((t) => ids.includes(t.id)).map((t) => t.tag.name);
        }
        return [...this.tagsMap.values()].map((t) => t.tag.name);
    }

    getNotes() {
        return this.notes;
    }

    async setNotes(descr) {
        await this._setMeta(NOTES, descr);
        this.notes = descr;
    }

    _getTags() {
        return [...this.tagsMap.values()].map((meta) => meta.tag);
    }

    _getMeta(id) {
        return this.store.get(id);
    }

    async _setMeta(id, data) {
        this.updated = (new Date()).getTime();
        await this.store.batch([
            { type: "put", key: id, value: data },
            { type: "put", key: UPDATED, value: this.updated }
        ]);
        return this.updated;
    }

    async _deleteMeta(id) {
        this.updated = (new Date()).getTime();
        await this.store.batch([
            { type: "del", key: id },
            { type: "put", key: UPDATED, value: this.updated }
        ]);
        return this.updated;
    }

    _getVid(name) {
        const id = this.nameIdMap.get(name);
        if (is.undefined(id)) {
            throw new adone.error.NotExistsException(`Not exists: '${name}'`);
        }
        return id;
    }

    async _getNextId(key) {
        const id = this[key]++;
        await this.store.put(key, this[key]);
        return id;
    }

    async _getTids(tags, vid = null) {
        // tags must be normalized

        const ids = [];
        let needUpdate = false;

        for (const tag of tags) {
            if (!is.string(tag.name)) {
                throw new adone.error.NotValidException("The tag must be a string or an object with at least one property: 'name'");
            }
            let tagMetaData = this.tagsMap.get(tag.name);
            if (is.undefined(tagMetaData)) {
                needUpdate = true;
                // eslint-disable-next-line no-await-in-loop
                const id = await this._getNextId(NEXT_TAG_ID);
                this.tids.push(id);
                tagMetaData = {
                    id,
                    tag,
                    vids: []
                };
                if (!is.null(vid)) {
                    tagMetaData.vids.push(vid);
                }
                this.tagsMap.set(tag.name, tagMetaData);
                // eslint-disable-next-line no-await-in-loop
                await this._setMeta(tagId(id), tagMetaData);
            }
            ids.push(tagMetaData.id);
        }

        if (needUpdate) {
            await this._setMeta(TIDS, this.tids);
        }
        return ids;
    }

    _reset() {
        this.vids = undefined; // valuable ids
        this.tids = undefined; // tag ids
        this.nameIdMap = new Map();
        this.tagsMap = new Map();
        this.nextTagId = undefined;
        this.nextValuableId = undefined;
        this._vcache = new Map();
        this.notes = "";
        this.created = null;
        this.updated = null;
    }
}
