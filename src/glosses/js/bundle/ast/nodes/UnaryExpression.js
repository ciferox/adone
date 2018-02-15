import { UNKNOWN_VALUE } from "../values";
import ExecutionPathOptions from "../ExecutionPathOptions";
import { NodeBase } from "./shared/Node";
const operators = {
    "-": (value) => -value,
    "+": (value) => Number(value),
    "!": (value) => !value,
    "~": (value) => ~value,
    typeof: (value) => typeof value,
    void: () => undefined,
    delete: () => UNKNOWN_VALUE
};
export default class UnaryExpression extends NodeBase {
    bindNode() {
        if (this.operator === "delete") {
            this.argument.reassignPath([], ExecutionPathOptions.create());
        }
    }

    getValue() {
        const argumentValue = this.argument.getValue();
        if (argumentValue === UNKNOWN_VALUE) {
            return UNKNOWN_VALUE; 
        }
        return operators[this.operator](argumentValue);
    }

    hasEffects(options) {
        return (this.argument.hasEffects(options) ||
            (this.operator === "delete" &&
                this.argument.hasEffectsWhenAssignedAtPath([], options)));
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        if (this.operator === "void") {
            return path.length > 0;
        }
        return path.length > 1;
    }

    initialiseNode() {
        this.value = this.getValue();
    }
}
