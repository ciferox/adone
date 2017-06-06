import * as inferers from "./inferers";

const { js: { compiler: { types: t } } } = adone;

/**
 * Infer the type of the current `NodePath`.
 */
export const getTypeAnnotation = function () {
    if (this.typeAnnotation) {
        return this.typeAnnotation;
    }

    let type = this._getTypeAnnotation() || t.anyTypeAnnotation();
    if (t.isTypeAnnotation(type)) {
        type = type.typeAnnotation;
    }
    return this.typeAnnotation = type;
};

/**
 * todo: split up this method
 */

export const _getTypeAnnotation = function () {
    const node = this.node;

    if (!node) {
        // handle initializerless variables, add in checks for loop initializers too
        if (this.key === "init" && this.parentPath.isVariableDeclarator()) {
            const declar = this.parentPath.parentPath;
            const declarParent = declar.parentPath;

            // for (let NODE in bar) {}
            if (declar.key === "left" && declarParent.isForInStatement()) {
                return t.stringTypeAnnotation();
            }

            // for (let NODE of bar) {}
            if (declar.key === "left" && declarParent.isForOfStatement()) {
                return t.anyTypeAnnotation();
            }

            return t.voidTypeAnnotation();
        }
        return;

    }

    if (node.typeAnnotation) {
        return node.typeAnnotation;
    }

    let inferer = inferers[node.type];
    if (inferer) {
        return inferer.call(this, node);
    }

    inferer = inferers[this.parentPath.type];
    if (inferer && inferer.validParent) {
        return this.parentPath.getTypeAnnotation();
    }
};

const _isBaseType = function (baseName, type, soft) {
    if (baseName === "string") {
        return t.isStringTypeAnnotation(type);
    } else if (baseName === "number") {
        return t.isNumberTypeAnnotation(type);
    } else if (baseName === "boolean") {
        return t.isBooleanTypeAnnotation(type);
    } else if (baseName === "any") {
        return t.isAnyTypeAnnotation(type);
    } else if (baseName === "mixed") {
        return t.isMixedTypeAnnotation(type);
    } else if (baseName === "empty") {
        return t.isEmptyTypeAnnotation(type);
    } else if (baseName === "void") {
        return t.isVoidTypeAnnotation(type);
    }
    if (soft) {
        return false;
    }
    throw new Error(`Unknown base type ${baseName}`);


};

export const isBaseType = function (baseName, soft) {
    return _isBaseType(baseName, this.getTypeAnnotation(), soft);
};

export const couldBeBaseType = function (name) {
    const type = this.getTypeAnnotation();
    if (t.isAnyTypeAnnotation(type)) {
        return true;
    }

    if (t.isUnionTypeAnnotation(type)) {
        for (const type2 of type.types) {
            if (t.isAnyTypeAnnotation(type2) || _isBaseType(name, type2, true)) {
                return true;
            }
        }
        return false;
    }
    return _isBaseType(name, type, true);

};

export const baseTypeStrictlyMatches = function (right) {
    const left = this.getTypeAnnotation();
    right = right.getTypeAnnotation();

    if (!t.isAnyTypeAnnotation(left) && t.isFlowBaseAnnotation(left)) {
        return right.type === left.type;
    }
};

export const isGenericType = function (genericName) {
    const type = this.getTypeAnnotation();
    return t.isGenericTypeAnnotation(type) && t.isIdentifier(type.id, { name: genericName });
};
