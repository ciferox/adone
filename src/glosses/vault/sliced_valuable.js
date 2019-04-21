const {
    is,
    error
} = adone;

const {
    VALUABLE_META,
    VALUABLE_TAGS
} = adone.getPrivate(adone.vault);

const _PARENT_VALUABLE = Symbol();

export default class SlicedValuable {
    constructor(valuable, prefix, separator = ".") {
        if (!is.vaultValuable(valuable)) {
            throw new error.NotValidException("Not valid parent valuable");
        }

        if (is.string(prefix)) {
            prefix = prefix.split(separator);
        }
        
        if (is.array(prefix) && prefix.length > 0) {
            for (let i = 0; i < prefix.length; i++) {
                prefix[i] = prefix[i].trim();
                if (prefix[i].length === 0 || prefix[i] === separator) {
                    throw new error.NotValidException("Not valid prefix");
                }
            }

            prefix = `${prefix.join(separator)}${separator}`;
        } else {
            throw new error.NotValidException("Not valid prefix");
        }

        this[_PARENT_VALUABLE] = valuable;
        
        if (is.function(this[_PARENT_VALUABLE]._fullName)) {
            this._prefix = this[_PARENT_VALUABLE]._fullName(prefix);
            this._fullName = (name) => this[_PARENT_VALUABLE]._fullName(`${prefix}${name}`);
        } else {
            this._prefix = prefix;
            this._fullName = (name) => `${prefix}${name}`;
        }
    }

    name() {
        return this[_PARENT_VALUABLE].name();
    }

    internalId() {
        return this[_PARENT_VALUABLE].internalId();
    }

    getVault() {
        return this[_PARENT_VALUABLE].getVault();
    }

    getNotes() {
        return this[_PARENT_VALUABLE].getNotes();
    }

    setNotes(notes) {
        return this[_PARENT_VALUABLE].setNotes(notes);
    }

    slice(prefix, separator) {
        return adone.vault.slice(this, prefix, separator);
    }

    async set(name, value, type) {
        return this[_PARENT_VALUABLE].set(this._fullName(name), value, type);
    }

    async setMulti(entries) {
        for (const [name, value] of Object.entries(entries)) {
            await this.set(name, value); // eslint-disable-line
        }
    }

    get(name) {
        return this[_PARENT_VALUABLE].get(this._fullName(name));
    }

    type(name) {
        return this[_PARENT_VALUABLE].type(this._fullName(name));
    }

    has(name) {
        return this[_PARENT_VALUABLE].has(this._fullName(name));
    }

    keys() {
        const keys = this[_PARENT_VALUABLE].keys();
        const startPos = this._prefix.length;
        return keys.filter((x) => x.startsWith(this._prefix)).map((x) => x.substr(startPos));
    }

    size() {
        return this[_PARENT_VALUABLE].size();
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
        return this[_PARENT_VALUABLE].delete(this._fullName(name));
    }

    async clear(options) {
        return this[_PARENT_VALUABLE].clear(options);
    }

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
                result.tags = this[_PARENT_VALUABLE][VALUABLE_TAGS];
                break;
            case "onlyName":
                result.tags = this[_PARENT_VALUABLE][VALUABLE_TAGS].map((t) => t.name);
                break;
            case "onlyId":
                result.tags = this[_PARENT_VALUABLE][VALUABLE_META].tids;
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
            this[_PARENT_VALUABLE][VALUABLE_META].order = order;
        } else if (is.plainObject(json.entries)) {
            await this.setMulti(json.entries);
        }

        if (is.array(json.tags)) {
            for (const tag of json.tags) {
                await this.addTag(tag, true); // eslint-disable-line
            }
        }

        return this[_PARENT_VALUABLE]._updateMeta();
    }

    addTag(tag, _isWeak) {
        return this[_PARENT_VALUABLE].addTag(tag, _isWeak);
    }

    hasTag(tag) {
        return this[_PARENT_VALUABLE].hasTag(tag);
    }

    deleteTag(tag) {
        return this[_PARENT_VALUABLE].deleteTag(tag);
    }

    deleteAllTags() {
        return this[_PARENT_VALUABLE].deleteAllTags();
    }

    tags() {
        return this[_PARENT_VALUABLE].tags();
    }
}
