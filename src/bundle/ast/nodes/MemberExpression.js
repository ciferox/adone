import { BLANK } from '../../utils/blank';
import relativeId from '../../utils/relativeId';
import { EMPTY_PATH, UNKNOWN_KEY, UNKNOWN_VALUE } from '../values';
import Identifier from './Identifier';
import Literal from './Literal';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
function getPropertyKey(memberExpression) {
    return memberExpression.computed
        ? getComputedPropertyKey(memberExpression.property)
        : memberExpression.property.name;
}
function getComputedPropertyKey(propertyKey) {
    if (propertyKey instanceof Literal) {
        return String(propertyKey.value);
    }
    return null;
}
function getPathIfNotComputed(memberExpression) {
    const nextPathKey = memberExpression.propertyKey;
    const object = memberExpression.object;
    if (typeof nextPathKey === 'string') {
        if (object instanceof Identifier) {
            return [
                { key: object.name, pos: object.start },
                { key: nextPathKey, pos: memberExpression.property.start }
            ];
        }
        if (isMemberExpression(object)) {
            const parentPath = getPathIfNotComputed(object);
            return (parentPath && [...parentPath, { key: nextPathKey, pos: memberExpression.property.start }]);
        }
    }
    return null;
}
export function isMemberExpression(node) {
    return node.type === NodeType.MemberExpression;
}
export default class MemberExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.variable = null;
    }
    bind() {
        if (this.bound)
            return;
        this.bound = true;
        const path = getPathIfNotComputed(this);
        const baseVariable = path && this.scope.findVariable(path[0].key);
        if (baseVariable && baseVariable.isNamespace) {
            const resolvedVariable = this.resolveNamespaceVariables(baseVariable, path.slice(1));
            if (!resolvedVariable) {
                super.bind();
            }
            else if (typeof resolvedVariable === 'string') {
                this.replacement = resolvedVariable;
            }
            else {
                if (resolvedVariable.isExternal && resolvedVariable.module) {
                    resolvedVariable.module.suggestName(path[0].key);
                }
                this.variable = resolvedVariable;
            }
        }
        else {
            super.bind();
        }
    }
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        if (!this.bound)
            this.bind();
        if (this.variable !== null) {
            this.variable.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
        else {
            this.object.forEachReturnExpressionWhenCalledAtPath([this.propertyKey || this.getComputedKey(options), ...path], callOptions, callback, options);
        }
    }
    getLiteralValueAtPath(path, options) {
        if (this.variable !== null) {
            return this.variable.getLiteralValueAtPath(path, options);
        }
        return this.object.getLiteralValueAtPath([this.propertyKey || this.getComputedKey(options), ...path], options);
    }
    hasEffects(options) {
        return (this.property.hasEffects(options) ||
            this.object.hasEffects(options) ||
            (this.arePropertyReadSideEffectsChecked &&
                this.object.hasEffectsWhenAccessedAtPath([this.propertyKey || this.getComputedKey(options)], options)));
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        if (path.length === 0) {
            return false;
        }
        if (this.variable !== null) {
            return this.variable.hasEffectsWhenAccessedAtPath(path, options);
        }
        return this.object.hasEffectsWhenAccessedAtPath([this.propertyKey || this.getComputedKey(options), ...path], options);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (this.variable !== null) {
            return this.variable.hasEffectsWhenAssignedAtPath(path, options);
        }
        return this.object.hasEffectsWhenAssignedAtPath([this.propertyKey || this.getComputedKey(options), ...path], options);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (this.variable !== null) {
            return this.variable.hasEffectsWhenCalledAtPath(path, callOptions, options);
        }
        return this.object.hasEffectsWhenCalledAtPath([this.propertyKey || this.getComputedKey(options), ...path], callOptions, options);
    }
    include() {
        if (!this.included) {
            this.included = true;
            if (this.variable !== null && !this.variable.included) {
                this.variable.include();
                this.context.requestTreeshakingPass();
            }
        }
        this.object.include();
        this.property.include();
    }
    initialise() {
        this.included = false;
        this.propertyKey = getPropertyKey(this);
        this.variable = null;
        this.arePropertyReadSideEffectsChecked = this.context.propertyReadSideEffects;
        this.bound = false;
        this.replacement = null;
    }
    reassignPath(path, options) {
        if (!this.bound)
            this.bind();
        if (path.length === 0)
            this.disallowNamespaceReassignment();
        if (this.variable) {
            this.variable.reassignPath(path, options);
        }
        else {
            this.object.reassignPath([this.propertyKey || this.getComputedKey(options), ...path], options);
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent } = BLANK) {
        const isCalleeOfDifferentParent = renderedParentType === NodeType.CallExpression && isCalleeOfRenderedParent;
        if (this.variable || this.replacement) {
            let replacement = this.variable ? this.variable.getName() : this.replacement;
            if (isCalleeOfDifferentParent)
                replacement = '0, ' + replacement;
            code.overwrite(this.start, this.end, replacement, {
                storeName: true,
                contentOnly: true
            });
        }
        else {
            if (isCalleeOfDifferentParent) {
                code.appendRight(this.start, '0, ');
            }
            super.render(code, options);
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (this.variable) {
            return this.variable.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
        }
        return this.object.someReturnExpressionWhenCalledAtPath([this.propertyKey || this.getComputedKey(options), ...path], callOptions, predicateFunction, options);
    }
    disallowNamespaceReassignment() {
        if (this.object instanceof Identifier &&
            this.scope.findVariable(this.object.name).isNamespace) {
            this.context.error({
                code: 'ILLEGAL_NAMESPACE_REASSIGNMENT',
                message: `Illegal reassignment to import '${this.object.name}'`
            }, this.start);
        }
    }
    getComputedKey(options) {
        const value = this.property.getLiteralValueAtPath(EMPTY_PATH, options);
        return value === UNKNOWN_VALUE ? UNKNOWN_KEY : String(value);
    }
    resolveNamespaceVariables(baseVariable, path) {
        if (path.length === 0)
            return baseVariable;
        if (!baseVariable.isNamespace)
            return null;
        const exportName = path[0].key;
        const variable = baseVariable.isExternal
            ? baseVariable.module.traceExport(exportName)
            : baseVariable.context.traceExport(exportName);
        if (!variable) {
            const fileName = baseVariable.isExternal
                ? baseVariable.module.id
                : baseVariable.context.fileName;
            this.context.warn({
                code: 'MISSING_EXPORT',
                missing: exportName,
                importer: relativeId(this.context.fileName),
                exporter: relativeId(fileName),
                message: `'${exportName}' is not exported by '${relativeId(fileName)}'`,
                url: `https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module`
            }, path[0].pos);
            return 'undefined';
        }
        return this.resolveNamespaceVariables(variable, path.slice(1));
    }
}
