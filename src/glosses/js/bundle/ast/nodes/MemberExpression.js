import relativeId from "../../utils/relativeId";
import { NodeBase } from "./shared/Node";
import { isUnknownKey, UNKNOWN_KEY } from "../variables/VariableReassignmentTracker";
import { isLiteral } from "./Literal";
import { isIdentifier } from "./Identifier";
import { isNamespaceVariable } from "../variables/NamespaceVariable";
import { isExternalVariable } from "../variables/ExternalVariable";

const {
    is
} = adone;

const validProp = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

const getComputedPropertyKey = function (propertyKey) {
    if (isLiteral(propertyKey)) {
        const key = String(propertyKey.value);
        return validProp.test(key) ? key : UNKNOWN_KEY;
    }
    return UNKNOWN_KEY;
};

const getPropertyKey = function (memberExpression) {
    return memberExpression.computed
        ? getComputedPropertyKey(memberExpression.property)
        : memberExpression.property.name;
};

export const isMemberExpression = (node) => node.type === "MemberExpression";


const getPathIfNotComputed = function (memberExpression) {
    const nextPathKey = memberExpression.propertyKey;
    const object = memberExpression.object;
    if (isUnknownKey(nextPathKey)) {
        return null;
    }
    if (isIdentifier(object)) {
        return [
            { key: object.name, pos: object.start },
            { key: nextPathKey, pos: memberExpression.property.start }
        ];
    }
    if (isMemberExpression(object)) {
        const parentPath = getPathIfNotComputed(object);
        return parentPath
            && [...parentPath, { key: nextPathKey, pos: memberExpression.property.start }];
    }
    return null;
};

export default class MemberExpression extends NodeBase {
    bind() {
        const path = getPathIfNotComputed(this);
        const baseVariable = path && this.scope.findVariable(path[0].key);
        if (baseVariable && isNamespaceVariable(baseVariable)) {
            const resolvedVariable = this.resolveNamespaceVariables(baseVariable, path.slice(1));
            if (!resolvedVariable) {
                this.bindChildren();
            } else if (is.string(resolvedVariable)) {
                this.replacement = resolvedVariable;
            } else {
                if (isExternalVariable(resolvedVariable) && resolvedVariable.module) {
                    resolvedVariable.module.suggestName(path[0].key);
                }
                this.variable = resolvedVariable;
            }
        } else {
            this.bindChildren();
        }
        this.isBound = true;
    }

    resolveNamespaceVariables(baseVariable, path) {
        if (path.length === 0) {
            return baseVariable;
        }
        if (!isNamespaceVariable(baseVariable)) {
            return null;
        }
        const exportName = path[0].key;
        const variable = baseVariable.module.traceExport(exportName);
        if (!variable) {
            this.module.warn({
                code: "MISSING_EXPORT",
                missing: exportName,
                importer: relativeId(this.module.id),
                exporter: relativeId(baseVariable.module.id),
                message: `'${exportName}' is not exported by '${relativeId(baseVariable.module.id)}'`,
                url: "https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module"
            }, path[0].pos);
            return "undefined";
        }
        return this.resolveNamespaceVariables(variable, path.slice(1));
    }

    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        if (!this.isBound) {
            this.bind();
        }
        if (this.variable) {
            this.variable.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        } else {
            this.object.forEachReturnExpressionWhenCalledAtPath([this.propertyKey, ...path], callOptions, callback, options);
        }
    }

    hasEffects(options) {
        return (super.hasEffects(options) ||
            (this.arePropertyReadSideEffectsChecked &&
                this.object.hasEffectsWhenAccessedAtPath([this.propertyKey], options)));
    }

    hasEffectsWhenAccessedAtPath(path, options) {
        if (path.length === 0) {
            return false;
        }
        if (this.variable) {
            return this.variable.hasEffectsWhenAccessedAtPath(path, options);
        }
        return this.object.hasEffectsWhenAccessedAtPath([this.propertyKey, ...path], options);
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        if (this.variable) {
            return this.variable.hasEffectsWhenAssignedAtPath(path, options);
        }
        return this.object.hasEffectsWhenAssignedAtPath([this.propertyKey, ...path], options);
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (this.variable) {
            return this.variable.hasEffectsWhenCalledAtPath(path, callOptions, options);
        }
        return (this.propertyKey === UNKNOWN_KEY ||
            this.object.hasEffectsWhenCalledAtPath([this.propertyKey, ...path], callOptions, options));
    }

    includeInBundle() {
        let addedNewNodes = super.includeInBundle();
        if (this.variable && !this.variable.included) {
            this.variable.includeVariable();
            addedNewNodes = true;
        }
        return addedNewNodes;
    }

    initialiseNode() {
        this.propertyKey = getPropertyKey(this);
        this.arePropertyReadSideEffectsChecked =
            this.module.graph.treeshake &&
            this.module.graph.treeshakingOptions.propertyReadSideEffects;
    }

    reassignPath(path, options) {
        if (!this.isBound) {
            this.bind();
        }
        if (path.length === 0) {
            this.disallowNamespaceReassignment();
        }
        if (this.variable) {
            this.variable.reassignPath(path, options);
        } else {
            this.object.reassignPath([this.propertyKey, ...path], options);
        }
    }

    disallowNamespaceReassignment() {
        if (isIdentifier(this.object) && isNamespaceVariable(this.scope.findVariable(this.object.name))) {
            this.module.error({
                code: "ILLEGAL_NAMESPACE_REASSIGNMENT",
                message: `Illegal reassignment to import '${this.object.name}'`
            }, this.start);
        }
    }

    render(code, options) {
        if (this.variable) {
            code.overwrite(this.start, this.end, this.variable.getName(), {
                storeName: true,
                contentOnly: false
            });
        } else if (this.replacement) {
            code.overwrite(this.start, this.end, this.replacement, {
                storeName: true,
                contentOnly: false
            });
        }
        super.render(code, options);
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (this.variable) {
            return this.variable.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
        }
        return (getPropertyKey(this) === UNKNOWN_KEY ||
            this.object.someReturnExpressionWhenCalledAtPath([this.propertyKey, ...path], callOptions, predicateFunction, options));
    }
}
