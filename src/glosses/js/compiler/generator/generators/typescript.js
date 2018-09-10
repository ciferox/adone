export const TSTypeAnnotation = function (node) {
    this.token(":");
    this.space();
    if (node.optional) {
        this.token("?");
    }
    this.print(node.typeAnnotation, node);
};

export const TSTypeParameterInstantiation = function (node): void {
    this.token("<");
    this.printList(node.params, node, {});
    this.token(">");
};

export { TSTypeParameterInstantiation as TSTypeParameterDeclaration };

export const TSTypeParameter = function (node) {
    this.word(node.name);

    if (node.constraint) {
        this.space();
        this.word("extends");
        this.space();
        this.print(node.constraint, node);
    }

    if (node.default) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.default, node);
    }
};

export const TSParameterProperty = function (node) {
    if (node.accessibility) {
        this.word(node.accessibility);
        this.space();
    }

    if (node.readonly) {
        this.word("readonly");
        this.space();
    }

    this._param(node.parameter);
};

export const TSDeclareFunction = function (node) {
    if (node.declare) {
        this.word("declare");
        this.space();
    }
    this._functionHead(node);
    this.token(";");
};

export const TSDeclareMethod = function (node) {
    this._classMethodHead(node);
    this.token(";");
};

export const TSQualifiedName = function (node) {
    this.print(node.left, node);
    this.token(".");
    this.print(node.right, node);
};

export const TSCallSignatureDeclaration = function (node) {
    this.tsPrintSignatureDeclarationBase(node);
};

export const TSConstructSignatureDeclaration = function (node) {
    this.word("new");
    this.space();
    this.tsPrintSignatureDeclarationBase(node);
};

export const TSPropertySignature = function (node) {
    const { readonly, initializer } = node;
    if (readonly) {
        this.word("readonly");
        this.space();
    }
    this.tsPrintPropertyOrMethodName(node);
    this.print(node.typeAnnotation, node);
    if (initializer) {
        this.space();
        this.token("=");
        this.space();
        this.print(initializer, node);
    }
    this.token(";");
};

export const tsPrintPropertyOrMethodName = function (node) {
    if (node.computed) {
        this.token("[");
    }
    this.print(node.key, node);
    if (node.computed) {
        this.token("]");
    }
    if (node.optional) {
        this.token("?");
    }
};

export const TSMethodSignature = function (node) {
    this.tsPrintPropertyOrMethodName(node);
    this.tsPrintSignatureDeclarationBase(node);
    this.token(";");
};

export const TSIndexSignature = function (node) {
    const { readonly } = node;
    if (readonly) {
        this.word("readonly");
        this.space();
    }
    this.token("[");
    this._parameters(node.parameters, node);
    this.token("]");
    this.print(node.typeAnnotation, node);
    this.token(";");
};

export const TSAnyKeyword = function () {
    this.word("any");
};
export const TSNumberKeyword = function () {
    this.word("number");
};
export const TSObjectKeyword = function () {
    this.word("object");
};
export const TSBooleanKeyword = function () {
    this.word("boolean");
};
export const TSStringKeyword = function () {
    this.word("string");
};
export const TSSymbolKeyword = function () {
    this.word("symbol");
};
export const TSVoidKeyword = function () {
    this.word("void");
};
export const TSUndefinedKeyword = function () {
    this.word("undefined");
};
export const TSNullKeyword = function () {
    this.word("null");
};
export const TSNeverKeyword = function () {
    this.word("never");
};

export const TSThisType = function () {
    this.word("this");
};

export const TSFunctionType = function (node) {
    this.tsPrintFunctionOrConstructorType(node);
};

export const TSConstructorType = function (node) {
    this.word("new");
    this.space();
    this.tsPrintFunctionOrConstructorType(node);
};

export const tsPrintFunctionOrConstructorType = function (node) {
    const { typeParameters, parameters } = node;
    this.print(typeParameters, node);
    this.token("(");
    this._parameters(parameters, node);
    this.token(")");
    this.space();
    this.token("=>");
    this.space();
    this.print(node.typeAnnotation.typeAnnotation, node);
};

export const TSTypeReference = function (node) {
    this.print(node.typeName, node);
    this.print(node.typeParameters, node);
};

export const TSTypePredicate = function (node) {
    this.print(node.parameterName);
    this.space();
    this.word("is");
    this.space();
    this.print(node.typeAnnotation.typeAnnotation);
};

export const TSTypeQuery = function (node) {
    this.word("typeof");
    this.space();
    this.print(node.exprName);
};

export const TSTypeLiteral = function (node) {
    this.tsPrintTypeLiteralOrInterfaceBody(node.members, node);
};

export const tsPrintTypeLiteralOrInterfaceBody = function (members, node) {
    this.tsPrintBraced(members, node);
};

export const tsPrintBraced = function (members, node) {
    this.token("{");
    if (members.length) {
        this.indent();
        this.newline();
        for (const member of members) {
            this.print(member, node);
            //this.token(sep);
            this.newline();
        }
        this.dedent();
        this.rightBrace();
    } else {
        this.token("}");
    }
};

export const TSArrayType = function (node) {
    this.print(node.elementType);
    this.token("[]");
};

export const TSTupleType = function (node) {
    this.token("[");
    this.printList(node.elementTypes, node);
    this.token("]");
};

export const TSUnionType = function (node) {
    this.tsPrintUnionOrIntersectionType(node, "|");
};

export const TSIntersectionType = function (node) {
    this.tsPrintUnionOrIntersectionType(node, "&");
};

export const tsPrintUnionOrIntersectionType = function (node, sep) {
    this.printJoin(node.types, node, {
        separator() {
            this.space();
            this.token(sep);
            this.space();
        }
    });
};

export const TSConditionalType = function (node) {
    this.print(node.checkType);
    this.space();
    this.word("extends");
    this.space();
    this.print(node.extendsType);
    this.space();
    this.token("?");
    this.space();
    this.print(node.trueType);
    this.space();
    this.token(":");
    this.space();
    this.print(node.falseType);
};

export const TSInferType = function (node) {
    this.token("infer");
    this.space();
    this.print(node.typeParameter);
};

export const TSParenthesizedType = function (node) {
    this.token("(");
    this.print(node.typeAnnotation, node);
    this.token(")");
};

export const TSTypeOperator = function (node) {
    this.token(node.operator);
    this.space();
    this.print(node.typeAnnotation, node);
};

export const TSIndexedAccessType = function (node) {
    this.print(node.objectType, node);
    this.token("[");
    this.print(node.indexType, node);
    this.token("]");
};

const tokenIfPlusMinus = function (self, tok) {
    if (tok !== true) {
        self.token(tok);
    }
};

export const TSMappedType = function (node) {
    const { readonly, typeParameter, optional } = node;
    this.token("{");
    this.space();
    if (readonly) {
        tokenIfPlusMinus(this, readonly);
        this.word("readonly");
        this.space();
    }

    this.token("[");
    this.word(typeParameter.name);
    this.space();
    this.word("in");
    this.space();
    this.print(typeParameter.constraint, typeParameter);
    this.token("]");

    if (optional) {
        tokenIfPlusMinus(this, optional);
        this.token("?");
    }
    this.token(":");
    this.space();
    this.print(node.typeAnnotation, node);
    this.space();
    this.token("}");
};

export const TSLiteralType = function (node) {
    this.print(node.literal, node);
};

export const TSExpressionWithTypeArguments = function (node) {
    this.print(node.expression, node);
    this.print(node.typeParameters, node);
};

export const TSInterfaceDeclaration = function (node) {
    const { declare, id, typeParameters, extends: extendz, body } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    this.word("interface");
    this.space();
    this.print(id, node);
    this.print(typeParameters, node);
    if (extendz) {
        this.space();
        this.word("extends");
        this.space();
        this.printList(extendz, node);
    }
    this.space();
    this.print(body, node);
};

export const TSInterfaceBody = function (node) {
    this.tsPrintTypeLiteralOrInterfaceBody(node.body, node);
};

export const TSTypeAliasDeclaration = function (node) {
    const { declare, id, typeParameters, typeAnnotation } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    this.word("type");
    this.space();
    this.print(id, node);
    this.print(typeParameters, node);
    this.space();
    this.token("=");
    this.space();
    this.print(typeAnnotation, node);
    this.token(";");
};

export const TSAsExpression = function (node) {
    const { expression, typeAnnotation } = node;
    this.print(expression, node);
    this.space();
    this.word("as");
    this.space();
    this.print(typeAnnotation, node);
};

export const TSTypeAssertion = function (node) {
    const { typeAnnotation, expression } = node;
    this.token("<");
    this.print(typeAnnotation, node);
    this.token(">");
    this.space();
    this.print(expression, node);
};

export const TSEnumDeclaration = function (node) {
    const { declare, const: isConst, id, members } = node;
    if (declare) {
        this.word("declare");
        this.space();
    }
    if (isConst) {
        this.word("const");
        this.space();
    }
    this.word("enum");
    this.space();
    this.print(id, node);
    this.space();
    this.tsPrintBraced(members, node);
};

export const TSEnumMember = function (node) {
    const { id, initializer } = node;
    this.print(id, node);
    if (initializer) {
        this.space();
        this.token("=");
        this.space();
        this.print(initializer, node);
    }
    this.token(",");
};

export const TSModuleDeclaration = function (node) {
    const { declare, id } = node;

    if (declare) {
        this.word("declare");
        this.space();
    }

    if (!node.global) {
        this.word(id.type === "Identifier" ? "namespace" : "module");
        this.space();
    }
    this.print(id, node);

    if (!node.body) {
        this.token(";");
        return;
    }

    let body = node.body;
    while (body.type === "TSModuleDeclaration") {
        this.token(".");
        this.print(body.id, body);
        body = body.body;
    }

    this.space();
    this.print(body, node);
};

export const TSModuleBlock = function (node) {
    this.tsPrintBraced(node.body, node);
};

export const TSImportEqualsDeclaration = function (node) {
    const { isExport, id, moduleReference } = node;
    if (isExport) {
        this.word("export");
        this.space();
    }
    this.word("import");
    this.space();
    this.print(id, node);
    this.space();
    this.token("=");
    this.space();
    this.print(moduleReference, node);
    this.token(";");
};

export const TSExternalModuleReference = function (node) {
    this.token("require(");
    this.print(node.expression, node);
    this.token(")");
};

export const TSNonNullExpression = function (node) {
    this.print(node.expression, node);
    this.token("!");
};

export const TSExportAssignment = function (node) {
    this.word("export");
    this.space();
    this.token("=");
    this.space();
    this.print(node.expression, node);
    this.token(";");
};

export const TSNamespaceExportDeclaration = function (node) {
    this.word("export");
    this.space();
    this.word("as");
    this.space();
    this.word("namespace");
    this.space();
    this.print(node.id, node);
};

export const tsPrintSignatureDeclarationBase = function (node) {
    const { typeParameters, parameters } = node;
    this.print(typeParameters, node);
    this.token("(");
    this._parameters(parameters, node);
    this.token(")");
    this.print(node.typeAnnotation, node);
};
