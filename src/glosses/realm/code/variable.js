/**
 * Variable represents declared variable in some scope.
 * 
 * The `value` of variable does not correspond to the one that will be assigned to the variable in runtime,
 * but that used in the sandbox (in some cases, it equals with the runtime value).
 */
export default class Variable {
    constructor(name, value, isNative = false) {
        this.name = name;
        this.value = value;
        this.refs = 0;
        this.isNative = isNative;
    }
}
