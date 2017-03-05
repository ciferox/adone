import adone from "adone";
const { Contextable, Description, Private, Public, Property } = adone.netron.decorator;

@Private
@Contextable
@Description("Contextable map")
@Property("size", { private: false, readonly: true, type: Number })
export class ContextableMap extends Map {
    @Public
    set(key, value) {
        return super.set(key, value);
    }

    @Public
    has(key) {
        return super.has(key);
    }

    @Public
    get(key) {
        return super.get(key);
    }

    @Public
    forEach(callback, thisArg) {
        return super.forEach(callback, thisArg);
    }

    @Public
    delete(key) {
        return super.delete(key);
    }

    @Public
    clear() {
        super.clear();
    }
}
