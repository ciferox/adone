const {
    netron2: { DContext, DPublic }
} = adone;

@DContext({
    description: "Service valuable used for storing service runtime configuration"
})
export default class ServiceValuable {
    constructor(valuable) {
        this._valuable = valuable;
    }

    @DPublic()
    name() {
        return this._valuable.name();
    }

    @DPublic()
    internalId() {
        return this._valuable.internalId();
    }

    @DPublic()
    getNotes() {
        return this._valuable.getNotes();
    }

    @DPublic()
    setNotes(notes) {
        return this._valuable.setNotes(notes);
    }

    @DPublic()
    set(name, value, type) {
        return this._valuable.set(name, value, type);
    }

    @DPublic()
    setMulti(entries) {
        return this._valuable.setMulti(entries);
    }

    @DPublic()
    get(name) {
        return this._valuable.get(name);
    }

    @DPublic()
    type(name) {
        return this._valuable.type(name);
    }

    @DPublic()
    has(name) {
        return this._valuable.has(name);
    }

    @DPublic()
    keys() {
        return this._valuable.keys();
    }

    @DPublic()
    entries(options) {
        this._valuable.entries(options);
    }

    @DPublic()
    delete(name) {
        return this._valuable.delete(name);
    }

    @DPublic()
    clear(options) {
        return this._valuable.clear(options);
    }

    @DPublic()
    toJSON(options) {
        return this._valuable.toJSON(options);
    }

    @DPublic()
    fromJSON(json) {
        return this._valuable.fromJSON(json);
    }

    @DPublic()
    addTag(tag, _isWeak) {
        return this._valuable.addTag(tag, _isWeak);
    }

    @DPublic()
    hasTag(tag) {
        return this._valuable.hasTag(tag);
    }

    @DPublic()
    deleteTag(tag) {
        return this._valuable.deleteTag(tag);
    }

    @DPublic()
    deleteAllTags() {
        return this._valuable.deleteAllTags();
    }

    @DPublic()
    tags() {
        return this._valuable.tags();
    }
}
