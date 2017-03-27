const { is, x, util } = adone;

export default function installCompat() {
    // This must be called like `nunjucks.installCompat` so that `this` references the nunjucks instance
    const { runtime } = this;

    const origContextOrFrameLookup = runtime.contextOrFrameLookup;
    runtime.contextOrFrameLookup = function (context, frame, name) {
        const val = origContextOrFrameLookup.call(this, context, frame, name);
        if (is.undefined(val)) {
            switch (name) {
                case "True": {
                    return true;
                }
                case "False": {
                    return false;
                }
                case "None": {
                    return null;
                }
            }
        }

        return val;
    };

    const ARRAY_MEMBERS = {
        pop(index) {
            if (is.undefined(index)) {
                return this.pop();
            }
            if (index >= this.length || index < 0) {
                throw new x.Exception("KeyError");
            }
            return this.splice(index, 1);
        },
        append(element) {
            return this.push(element);
        },
        remove(element) {
            for (let i = 0; i < this.length; i++) {
                if (this[i] === element) {
                    return this.splice(i, 1);
                }
            }
            throw new x.Exception("ValueError");
        },
        count(element) {
            let count = 0;
            for (let i = 0; i < this.length; i++) {
                if (this[i] === element) {
                    count++;
                }
            }
            return count;
        },
        index(element) {
            const i = this.indexOf(element);
            if (i === -1) {
                throw new x.Exception("ValueError");
            }
            return i;
        },
        find(element) {
            return this.indexOf(element);
        },
        insert(index, elem) {
            return this.splice(index, 0, elem);
        }
    };
    const OBJECT_MEMBERS = {
        items() {
            return util.entries(this, { followProto: true });
        },
        values() {
            return util.values(this, { followProto: true });
        },
        keys() {
            return util.keys(this, { followProto: true });
        },
        get(key, def) {
            let output = this[key];
            if (is.undefined(output)) {
                output = def;
            }
            return output;
        },
        has_key(key) {  // eslint-disable-line camelcase
            return this.hasOwnProperty(key);
        },
        pop(key, def) {
            let output = this[key];
            if (is.undefined(output) && !is.undefined(def)) {
                output = def;
            } else if (is.undefined(output)) {
                throw new x.Exception("KeyError");
            } else {
                delete this[key];
            }
            return output;
        },
        popitem() {
            for (const k in this) {
                // Return the first object pair.
                const val = this[k];
                delete this[k];
                return [k, val];
            }
            throw new x.Exception("KeyError");
        },
        setdefault(key, def) {
            if (key in this) {
                return this[key];
            }
            if (is.undefined(def)) {
                def = null;
            }
            this[key] = def;
            return def;
        },
        update(kwargs) {
            for (const k in kwargs) {
                this[k] = kwargs[k];
            }
            return null;  // Always returns None
        }
    };
    OBJECT_MEMBERS.iteritems = OBJECT_MEMBERS.items;
    OBJECT_MEMBERS.itervalues = OBJECT_MEMBERS.values;
    OBJECT_MEMBERS.iterkeys = OBJECT_MEMBERS.keys;

    const origMemberLookup = runtime.memberLookup;

    runtime.memberLookup = function (obj = {}, val, autoescape) {
        // If the object is an object, return any of the methods that Python would otherwise provide.
        if (is.array(obj) && is.propertyOwned(ARRAY_MEMBERS, val)) {
            return (...args) => ARRAY_MEMBERS[val].apply(obj, args);
        }

        if (is.object(obj) && is.propertyOwned(OBJECT_MEMBERS, val)) {
            return (...args) => OBJECT_MEMBERS[val].apply(obj, args);
        }

        return origMemberLookup.apply(this, obj, val, autoescape);
    };
}
