const {
    netron: { Context, Public }
} = adone;

@Context({
    description: "Service valuable used for storing service runtime configuration"
})
export default class ServiceValuable {
    constructor(valuable) {
        this._valuable = valuable;
    }

    @Public()
    set(name, value, type) {
        return this._valuable.set(name, value, type);
    }

    @Public()
    setMulti(entries) {
        return this._valuable.setMulti(entries);
    }

    @Public()
    get(name) {
        return this._valuable.get(name);
    }

    @Public()
    type(name) {
        return this._valuable.type(name);
    }

    @Public()
    has(name) {
        return this._valuable.has(name);
    }

    @Public()
    keys() {
        return this._valuable.keys();
    }

    @Public()
    entries(options) {
        this._valuable.entries(options);
    }

    @Public()
    delete(name) {
        return this._valuable.delete(name);
    }

    @Public()
    clear(options) {
        return this._valuable.clear(options);
    }

    @Public()
    toJSON(options) {
        return this._valuable.toJSON(options);
    }

    @Public()
    fromJSON(json) {
        return this._valuable.fromJSON(json);
    }

    @Public()
    addTag(tag, _isWeak) {
        return this._valuable.addTag(tag, _isWeak);
    }

    @Public()
    hasTag(tag) {
        return this._valuable.hasTag(tag);
    }

    @Public()
    deleteTag(tag) {
        return this._valuable.deleteTag(tag);
    }

    @Public()
    deleteAllTags() {
        return this._valuable.deleteAllTags();
    }

    @Public()
    tags() {
        return this._valuable.tags();
    }
}
