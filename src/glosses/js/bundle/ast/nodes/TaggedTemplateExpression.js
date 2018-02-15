import CallOptions from "../CallOptions";
import { isGlobalVariable } from "../variables/GlobalVariable";
import { isNamespaceVariable } from "../variables/NamespaceVariable";
import { NodeBase } from "./shared/Node";
export default class TaggedTemplateExpression extends NodeBase {
    bindNode() {
        if (this.tag.type === "Identifier" /* Identifier */) {
            const variable = this.scope.findVariable(this.tag.name);
            if (isNamespaceVariable(variable)) {
                this.module.error({
                    code: "CANNOT_CALL_NAMESPACE",
                    message: `Cannot call a namespace ('${this.tag.name}')`
                }, this.start);
            }
            if (this.tag.name === "eval" && isGlobalVariable(variable)) {
                this.module.warn({
                    code: "EVAL",
                    message: "Use of eval is strongly discouraged, as it poses security risks and may cause issues with minification",
                    url: "https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval"
                }, this.start);
            }
        }
    }

    hasEffects(options) {
        return (super.hasEffects(options) ||
            this.tag.hasEffectsWhenCalledAtPath([], this._callOptions, options.getHasEffectsWhenCalledOptions()));
    }

    initialiseNode() {
        this._callOptions = CallOptions.create({ withNew: false, callIdentifier: this });
    }
}
