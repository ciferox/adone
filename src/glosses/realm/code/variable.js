const {
    is,
    realm: { code }
} = adone;

/**
 * Variable represents declared variable in some scope.
 * 
 * The `value` of variable does not correspond to the one that will be assigned to the variable in runtime,
 * but that used in the sandbox (in some cases, it equals with the runtime value).
 */
export default class Variable {
    constructor(name, value = adone.null, node = null) {
        this.name = name;
        this.value = value;
        this.refs = 0;
        this.node = node;
        
        if (node instanceof code.BaseNode) {
            node.variable = this;
        }
    }

    get isNative() {
        return is.null(this.node);
    }
}
