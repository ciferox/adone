class Delegator {
    constructor(dest, target) {
        this.dest = dest;
        this.target = target;
    }

    method(name) {
        const { dest, target } = this;
        dest[name] = function (...args) {
            const source = this[target];
            return source[name].apply(source, args);
        };
        return this;
    }

    access(name) {
        const { dest, target } = this;
        Object.defineProperty(dest, name, {
            get() {
                return this[target][name];
            },
            set(val) {
                this[target][name] = val;
            }
        });
        return this;
    }

    getter(name) {
        const { dest, target } = this;
        Object.defineProperty(dest, name, {
            get() {
                return this[target][name];
            }
        });
        return this;
    }

    setter(name) {
        const { dest, target } = this;
        Object.defineProperty(dest, name, {
            set(val) {
                this[target][name] = val;
            }
        });
        return this;
    }
}

const delegate = (object, property) => new Delegator(object, property);

export default delegate;
