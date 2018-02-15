import ExecutionPathOptions from "../ExecutionPathOptions";
import { isIdentifier } from "./Identifier";
import { NodeBase } from "./shared/Node";
export default class UpdateExpression extends NodeBase {
    bindNode() {
        this.argument.reassignPath([], ExecutionPathOptions.create());
        if (isIdentifier(this.argument)) {
            const variable = this.scope.findVariable(this.argument.name);
            variable.isReassigned = true;
        }
    }

    hasEffects(options) {
        return (this.argument.hasEffects(options) ||
            this.argument.hasEffectsWhenAssignedAtPath([], options));
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
}
