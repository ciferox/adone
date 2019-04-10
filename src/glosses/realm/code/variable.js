const {
    is,
    js: { compiler: { types: t } },
    realm: { code }
} = adone;

/**
 * Variable represents declared variable in some scope.
 * 
 * The `value` of variable does not correspond to the one that will be assigned to the variable in runtime,
 * but that used in the sandbox (in some cases, it equals with the runtime value).
 */
export default class Variable {
    constructor({ name, value = adone.null, node = null, isArg = false } = {}) {
        this.name = name;
        this.value = value;
        this.refs = 0;
        this.node = node;
        this.isArg = isArg;


        if (!is.null(node)) {
            node.variable = this;

            const initNode = node.ast.init;
            
            if (t.isLiteral(initNode)) {
                if (t.isRegExpLiteral(initNode)) {
                    this.rawValue = new RegExp(initNode.pattern);
                } else if (t.isNullLiteral(initNode)) {
                    this.rawValue = null;
                } else {
                    this.rawValue = initNode.value;
                }
            }
        }
    }

    get isNative() {
        return is.null(this.node);
    }
}
