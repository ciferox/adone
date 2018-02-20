const {
    is,
    error
} = adone;

export default class SlicedValuable {
    constructor(valuable, prefix, separator = ".") {
        if (!is.vaultValuable(valuable)) {
            throw new error.NotValid("Not valid parent valuable");
        }

        if (is.string(prefix)) {
            prefix = prefix.split(separator);
        }
        
        if (is.array(prefix) && prefix.length > 0) {
            for (let i = 0; i < prefix.length; i++) {
                prefix[i] = prefix[i].trim();
                if (prefix[i].length === 0 || prefix[i] === separator) {
                    throw new error.NotValid("Not valid prefix");
                }
            }

            prefix = `${prefix.join(separator)}${separator}`;
        } else {
            throw new error.NotValid("Not valid prefix");
        }

        this._valuable = valuable;
        
        if (is.function(this._valuable._fullName)) {
            this._prefix = this._valuable._fullName(prefix);
            this._fullName = (name) => this._valuable._fullName(`${prefix}${name}`);
        } else {
            this._prefix = prefix;
            this._fullName = (name) => `${prefix}${name}`;
        }
    }

    name() {
        return this._valuable.name();
    }

    internalId() {
        return this._valuable.internalId();
    }

    getNotes() {
        return this._valuable.getNotes();
    }

    setNotes(notes) {
        return this._valuable.setNotes(notes);
    }

    async set(name, value, type) {
        return this._valuable.set(this._fullName(name), value, type);
    }

    async setMulti(entries) {
        for (const [name, value] of Object.entries(entries)) {
            await this.set(name, value); // eslint-disable-line
        }
    }

    get(name) {
        return this._valuable.get(this._fullName(name));
    }

    type(name) {
        return this._valuable.type(this._fullName(name));
    }

    has(name) {
        return this._valuable.has(this._fullName(name));
    }

    keys() {
        const keys = this._valuable.keys();
        const startPos = this._prefix.length;
        return keys.filter((x) => x.startsWith(this._prefix)).map((x) => x.substr(startPos));
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
        return this._valuable.delete(this._fullName(name));
    }

    async clear(options) {
        return this._valuable.clear(options);
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
                result.tags = this._valuable._tags;
                break;
            case "onlyName":
                result.tags = this._valuable._tags.map((t) => t.name);
                break;
            case "onlyId":
                result.tags = this._valuable.meta.tids;
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
            this._valuable.meta.order = order;
        } else if (is.plainObject(json.entries)) {
            await this.setMulti(json.entries);
        }

        if (is.array(json.tags)) {
            for (const tag of json.tags) {
                await this.addTag(tag, true); // eslint-disable-line
            }
        }

        return this._valuable._updateMeta();
    }

    addTag(tag, _isWeak) {
        return this._valuable.addTag(tag, _isWeak);
    }

    hasTag(tag) {
        return this._valuable.hasTag(tag);
    }

    deleteTag(tag) {
        return this._valuable.deleteTag(tag);
    }

    deleteAllTags() {
        return this._valuable.deleteAllTags();
    }

    tags() {
        return this._valuable.tags();
    }
}
adone.tag.add(SlicedValuable, "VAULT_VALUABLE");
