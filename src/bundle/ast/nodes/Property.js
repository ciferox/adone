import CallOptions from '../CallOptions';
import { UNKNOWN_EXPRESSION, UNKNOWN_VALUE } from '../values';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
export function isProperty(node) {
    return node.type === NodeType.Property;
}
export default class Property extends NodeBase {
    declare(kind, _init) {
        this.value.declare(kind, UNKNOWN_EXPRESSION);
    }
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        if (this.kind === 'get') {
            this.value.forEachReturnExpressionWhenCalledAtPath([], this.accessorCallOptions, (innerOptions, node) => node.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, innerOptions), options);
        }
        else {
            this.value.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
    }
    getLiteralValueAtPath(path, options) {
        if (this.kind === 'get') {
            return UNKNOWN_VALUE;
        }
        return this.value.getLiteralValueAtPath(path, options);
    }
    hasEffects(options) {
        return this.key.hasEffects(options) || this.value.hasEffects(options);
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        if (this.kind === 'get') {
            return (this.value.hasEffectsWhenCalledAtPath([], this.accessorCallOptions, options.getHasEffectsWhenCalledOptions()) ||
                (!options.hasReturnExpressionBeenAccessedAtPath(path, this) &&
                    this.value.someReturnExpressionWhenCalledAtPath([], this.accessorCallOptions, (innerOptions, node) => node.hasEffectsWhenAccessedAtPath(path, innerOptions.addAccessedReturnExpressionAtPath(path, this)), options)));
        }
        return this.value.hasEffectsWhenAccessedAtPath(path, options);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (this.kind === 'get') {
            return (path.length === 0 ||
                this.value.someReturnExpressionWhenCalledAtPath([], this.accessorCallOptions, (innerOptions, node) => node.hasEffectsWhenAssignedAtPath(path, innerOptions.addAssignedReturnExpressionAtPath(path, this)), options));
        }
        if (this.kind === 'set') {
            return (path.length > 0 ||
                this.value.hasEffectsWhenCalledAtPath([], this.accessorCallOptions, options.getHasEffectsWhenCalledOptions()));
        }
        return this.value.hasEffectsWhenAssignedAtPath(path, options);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (this.kind === 'get') {
            return (this.value.hasEffectsWhenCalledAtPath([], this.accessorCallOptions, options.getHasEffectsWhenCalledOptions()) ||
                (!options.hasReturnExpressionBeenCalledAtPath(path, this) &&
                    this.value.someReturnExpressionWhenCalledAtPath([], this.accessorCallOptions, (innerOptions, node) => node.hasEffectsWhenCalledAtPath(path, callOptions, innerOptions.addCalledReturnExpressionAtPath(path, this)), options)));
        }
        return this.value.hasEffectsWhenCalledAtPath(path, callOptions, options);
    }
    initialise() {
        this.included = false;
        this.accessorCallOptions = CallOptions.create({
            withNew: false,
            callIdentifier: this
        });
    }
    reassignPath(path, options) {
        if (this.kind === 'get') {
            path.length > 0 &&
                this.value.forEachReturnExpressionWhenCalledAtPath([], this.accessorCallOptions, (innerOptions, node) => node.reassignPath(path, innerOptions.addAssignedReturnExpressionAtPath(path, this)), options);
        }
        else if (this.kind !== 'set') {
            this.value.reassignPath(path, options);
        }
    }
    render(code, options) {
        if (!this.shorthand) {
            this.key.render(code, options);
        }
        this.value.render(code, options);
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (this.kind === 'get') {
            return (this.value.hasEffectsWhenCalledAtPath([], this.accessorCallOptions, options.getHasEffectsWhenCalledOptions()) ||
                this.value.someReturnExpressionWhenCalledAtPath([], this.accessorCallOptions, (innerOptions, node) => node.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, innerOptions), options));
        }
        return this.value.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
    }
}
