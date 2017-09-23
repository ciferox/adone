const { is } = adone;

const noValue = Symbol("noValue");
const noGetter = () => noValue;
const getter = (obj) => (key) => key in obj ? obj[key] : noValue;

/**
 * Represents a Map that has a default values factory object or function.
 * Each get of non-existent key goes through the factory
 */
export default class DefaultMap extends Map {
    constructor(factory, ...args) {
        super(...args);
        if (!is.function(factory)) {
            // object
            if (!factory) {
                this.factory = noGetter;
            } else {
                this.factory = getter(factory);
            }
        } else {
            this.factory = factory;
        }
    }

    get(key) {
        if (!this.has(key)) {
            const value = this.factory(key);
            if (value !== noValue) {
                this.set(key, value);
            }
        }
        return super.get(key);
    }
}
