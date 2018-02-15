import { UNKNOWN_EXPRESSION, UNKNOWN_VALUE } from "../values";
export default class Variable {
    constructor(name) {
        this.name = name;
        this.safeName = null;
    }

    /**
     * Binds identifiers that reference this variable to this variable.
     * Necessary to be able to change variable names.
     */
    addReference(_identifier) { }

    reassignPath(_path, _options) { }

    forEachReturnExpressionWhenCalledAtPath(_path, _callOptions, _callback, _options) { }

    getName(reset) {
        if (reset && this.safeName && this.safeName !== this.name &&
            this.safeName[this.name.length] === "$" &&
            this.safeName[this.name.length + 1] === "$") {
            this.safeName = undefined;
            return this.name;
        }
        return this.safeName || this.name;
    }

    getValue() {
        return UNKNOWN_VALUE;
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 0;
    }

    hasEffectsWhenAssignedAtPath(_path, _options) {
        return true;
    }

    hasEffectsWhenCalledAtPath(_path, _callOptions, _options) {
        return true;
    }

    /**
     * Marks this variable as being part of the bundle, which is usually the case when one of
     * its identifiers becomes part of the bundle. Returns true if it has not been included
     * previously.
     * Once a variable is included, it should take care all its declarations are included.
     */
    includeVariable() {
        if (this.included) {
            return false;
        }
        this.included = true;
        return true;
    }

    someReturnExpressionWhenCalledAtPath(_path, _callOptions, predicateFunction, options) {
        return predicateFunction(options)(UNKNOWN_EXPRESSION);
    }

    toString() {
        return this.name;
    }

    setSafeName(name) {
        this.safeName = name;
    }
}
