import adone from "adone";
const { is, x } = adone;
const { Investigator } = adone.netron;

export default class Definitions {
    constructor(...args) {
        this._defs = new Array(...args);
    }

    get length() {
        return this._defs.length;
    }

    get(index) {
        return this._defs[index];
    }

    set(index, val) {
        this._defs[index] = val;
    }

    indexOf(def) {
        return this._defs.indexOf(def);
    }

    find(callback, thisArg) {
        return this._defs.find(callback, thisArg);
    }

    push(...args) {
        let ret;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (!is.netronDefinition(arg) && !Investigator.isContextable(arg) && !is.netronInterface(arg)) {
                throw new x.InvalidArgument(`Invalid argument ${i} (${typeof(arg)})`);
            }
            ret = this._defs.push(arg);
        }
        return ret;
    }

    pop() {
        return this._defs.pop();
    }

    shift() {
        return this._defs.shift();
    }

    unshift(...args) {
        let ret;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (!is.netronDefinition(arg) && !Investigator.isContextable(arg) && !is.netronInterface(arg)) {
                throw new x.InvalidArgument(`Invalid argument ${i} (${typeof(arg)})`);
            }
            ret = this._defs.unshift(arg);
        }
        return ret;
    }

    slice(begin, end) {
        return this._defs.slice(begin, end);
    }

    splice(begin, end, ...items) {
        return this._defs.splice(begin, end, ...items);
    }
}
adone.tag.set(Definitions, adone.tag.NETRON_DEFINITIONS);
