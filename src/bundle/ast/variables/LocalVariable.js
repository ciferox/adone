import * as NodeType from '../nodes/NodeType';
import { UNKNOWN_VALUE } from '../values';
import Variable from './Variable';
// To avoid infinite recursions
const MAX_PATH_DEPTH = 7;
export default class LocalVariable extends Variable {
    constructor(name, declarator, init) {
        super(name);
        this.declarations = declarator ? [declarator] : [];
        this.init = init;
    }
    addDeclaration(identifier) {
        this.declarations.push(identifier);
    }
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        if (!this.isReassigned &&
            this.init &&
            path.length <= MAX_PATH_DEPTH &&
            !options.hasNodeBeenCalledAtPathWithOptions(path, this.init, callOptions)) {
            this.init.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options.addCalledNodeAtPathWithOptions(path, this.init, callOptions));
        }
    }
    getLiteralValueAtPath(path, options) {
        if (this.isReassigned ||
            !this.init ||
            path.length > MAX_PATH_DEPTH ||
            options.hasNodeValueBeenRetrievedAtPath(path, this.init)) {
            return UNKNOWN_VALUE;
        }
        return this.init.getLiteralValueAtPath(path, options.addRetrievedNodeValueAtPath(path, this.init));
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        if (path.length === 0)
            return false;
        return (this.isReassigned ||
            path.length > MAX_PATH_DEPTH ||
            (this.init &&
                !options.hasNodeBeenAccessedAtPath(path, this.init) &&
                this.init.hasEffectsWhenAccessedAtPath(path, options.addAccessedNodeAtPath(path, this.init))));
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (this.included || path.length > MAX_PATH_DEPTH)
            return true;
        if (path.length === 0)
            return false;
        return (this.isReassigned ||
            (this.init &&
                !options.hasNodeBeenAssignedAtPath(path, this.init) &&
                this.init.hasEffectsWhenAssignedAtPath(path, options.addAssignedNodeAtPath(path, this.init))));
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length > MAX_PATH_DEPTH)
            return true;
        return (this.isReassigned ||
            (this.init &&
                !options.hasNodeBeenCalledAtPathWithOptions(path, this.init, callOptions) &&
                this.init.hasEffectsWhenCalledAtPath(path, callOptions, options.addCalledNodeAtPathWithOptions(path, this.init, callOptions))));
    }
    include() {
        if (!this.included) {
            this.included = true;
            for (const declaration of this.declarations) {
                // If node is a default export, it can save a tree-shaking run to include the full declaration now
                if (!declaration.included)
                    declaration.include();
                let node = declaration.parent;
                while (!node.included) {
                    // We do not want to properly include parents in case they are part of a dead branch
                    // in which case .include() might pull in more dead code
                    node.included = true;
                    if (node.type === NodeType.Program)
                        break;
                    node = node.parent;
                }
            }
        }
    }
    reassignPath(path, options) {
        if (path.length > MAX_PATH_DEPTH)
            return;
        if (!(this.isReassigned || options.hasNodeBeenAssignedAtPath(path, this))) {
            if (path.length === 0) {
                this.isReassigned = true;
            }
            else if (this.init) {
                this.init.reassignPath(path, options.addAssignedNodeAtPath(path, this));
            }
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (path.length > MAX_PATH_DEPTH)
            return true;
        return (this.isReassigned ||
            (this.init &&
                !options.hasNodeBeenCalledAtPathWithOptions(path, this.init, callOptions) &&
                this.init.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options.addCalledNodeAtPathWithOptions(path, this.init, callOptions))));
    }
}
