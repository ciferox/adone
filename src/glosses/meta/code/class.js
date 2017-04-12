const { is } = adone;

export default class XClass extends adone.meta.code.Base {
    constructor(options) {
        super(options);
        this.superClassName = null;
        if (!is.null(this.ast)) {
            this.name = this.ast.id.name;
        } else {
            this.name = null;            
        }

        if (!is.null(this.ast.superClass)) {
            const node = this.ast.superClass;
            switch (node.type) {
                case "Identifier": {
                    const globalObject = this.xModule.globals.find((g) => (g.name === node.name && !g.isNamespace));
                    if (!is.undefined(globalObject)) {
                        this.superClassName = globalObject.full;
                    }
                    break;
                }
                case "MemberExpression": {
                    break;
                }
                default:
                    throw new adone.x.Unknown(`Unknown super class type: ${node.type}`);
            }
        }
    }

    references() {
        super.references();
        if (is.string(this.superClassName)) {
            this._addReference(this.superClassName);
        }
        return this._references;
    }
}
adone.tag.define("CODEMOD_CLASS");
adone.tag.set(XClass, adone.tag.CODEMOD_CLASS);
