const {
    is
} = adone;

export default class XClass extends adone.js.adone.Base {
    constructor(options) {
        super(options);
        this.superClassName = null;
        if (!is.null(this.ast)) {
            if (!is.null(this.ast.id)) {
                this.name = this.ast.id.name;
            }

            if (!is.null(this.ast.superClass)) {
                const node = this.ast.superClass;
                switch (node.type) {
                    case "Identifier": {
                        const globalObject = this.xModule.getGlobal(node.name);
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
        } else {
            this.name = null;            
        }
    }

    getType() {
        return "Class";
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
