
export const AnyTypeAnnotation = function () {
    this.word("any");
};

export const ArrayTypeAnnotation = function (node) {
    this.print(node.elementType, node);
    this.token("[");
    this.token("]");
};

export const BooleanTypeAnnotation = function () {
    this.word("boolean");
};

export const BooleanLiteralTypeAnnotation = function (node) {
    this.word(node.value ? "true" : "false");
};

export const NullLiteralTypeAnnotation = function () {
    this.word("null");
};

export const DeclareClass = function (node) {
    this.word("declare");
    this.space();
    this.word("class");
    this.space();
    this._interfaceish(node);
};

export const DeclareFunction = function (node) {
    this.word("declare");
    this.space();
    this.word("function");
    this.space();
    this.print(node.id, node);
    this.print(node.id.typeAnnotation.typeAnnotation, node);
    this.semicolon();
};

export const DeclareInterface = function (node) {
    this.word("declare");
    this.space();
    this.InterfaceDeclaration(node);
};

export const DeclareModule = function (node) {
    this.word("declare");
    this.space();
    this.word("module");
    this.space();
    this.print(node.id, node);
    this.space();
    this.print(node.body, node);
};

export const DeclareModuleExports = function (node) {
    this.word("declare");
    this.space();
    this.word("module");
    this.token(".");
    this.word("exports");
    this.print(node.typeAnnotation, node);
};

export const DeclareTypeAlias = function (node) {
    this.word("declare");
    this.space();
    this.TypeAlias(node);
};

export const DeclareVariable = function (node) {
    this.word("declare");
    this.space();
    this.word("var");
    this.space();
    this.print(node.id, node);
    this.print(node.id.typeAnnotation, node);
    this.semicolon();
};

export const ExistentialTypeParam = function () {
    this.token("*");
};

export const FunctionTypeAnnotation = function (node, parent) {
    this.print(node.typeParameters, node);
    this.token("(");
    this.printList(node.params, node);

    if (node.rest) {
        if (node.params.length) {
            this.token(",");
            this.space();
        }
        this.token("...");
        this.print(node.rest, node);
    }

    this.token(")");

    // this node type is overloaded, not sure why but it makes it EXTREMELY annoying
    if (parent.type === "ObjectTypeCallProperty" || parent.type === "DeclareFunction") {
        this.token(":");
    } else {
        this.space();
        this.token("=>");
    }

    this.space();
    this.print(node.returnType, node);
};

export const FunctionTypeParam = function (node) {
    this.print(node.name, node);
    if (node.optional) {
        this.token("?");
    }
    this.token(":");
    this.space();
    this.print(node.typeAnnotation, node);
};

export const InterfaceExtends = function (node) {
    this.print(node.id, node);
    this.print(node.typeParameters, node);
};

export { InterfaceExtends as ClassImplements, InterfaceExtends as GenericTypeAnnotation };

export const _interfaceish = function (node) {
    this.print(node.id, node);
    this.print(node.typeParameters, node);
    if (node.extends.length) {
        this.space();
        this.word("extends");
        this.space();
        this.printList(node.extends, node);
    }
    if (node.mixins && node.mixins.length) {
        this.space();
        this.word("mixins");
        this.space();
        this.printList(node.mixins, node);
    }
    this.space();
    this.print(node.body, node);
};

export const _variance = function (node) {
    if (node.variance === "plus") {
        this.token("+");
    } else if (node.variance === "minus") {
        this.token("-");
    }
};

export const InterfaceDeclaration = function (node) {
    this.word("interface");
    this.space();
    this._interfaceish(node);
};

const andSeparator = function () {
    this.space();
    this.token("&");
    this.space();
};

export const IntersectionTypeAnnotation = function (node) {
    this.printJoin(node.types, node, { separator: andSeparator });
};

export const MixedTypeAnnotation = function () {
    this.word("mixed");
};

export const EmptyTypeAnnotation = function () {
    this.word("empty");
};

export const NullableTypeAnnotation = function (node) {
    this.token("?");
    this.print(node.typeAnnotation, node);
};

export {
    NumericLiteral as NumericLiteralTypeAnnotation,
    StringLiteral as StringLiteralTypeAnnotation
} from "./types";

export const NumberTypeAnnotation = function () {
    this.word("number");
};

export const StringTypeAnnotation = function () {
    this.word("string");
};

export const ThisTypeAnnotation = function () {
    this.word("this");
};

export const TupleTypeAnnotation = function (node) {
    this.token("[");
    this.printList(node.types, node);
    this.token("]");
};

export const TypeofTypeAnnotation = function (node) {
    this.word("typeof");
    this.space();
    this.print(node.argument, node);
};

export const TypeAlias = function (node) {
    this.word("type");
    this.space();
    this.print(node.id, node);
    this.print(node.typeParameters, node);
    this.space();
    this.token("=");
    this.space();
    this.print(node.right, node);
    this.semicolon();
};

export const TypeAnnotation = function (node) {
    this.token(":");
    this.space();
    if (node.optional) {
        this.token("?");
    }
    this.print(node.typeAnnotation, node);
};

export const TypeParameter = function (node) {
    this._variance(node);

    this.word(node.name);

    if (node.bound) {
        this.print(node.bound, node);
    }

    if (node.default) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.default, node);
    }
};

export const TypeParameterInstantiation = function (node) {
    this.token("<");
    this.printList(node.params, node, {});
    this.token(">");
};

export { TypeParameterInstantiation as TypeParameterDeclaration };

export const ObjectTypeAnnotation = function (node) {
    if (node.exact) {
        this.token("{|");
    } else {
        this.token("{");
    }

    const props = node.properties.concat(node.callProperties, node.indexers);

    if (props.length) {
        this.space();

        this.printJoin(props, node, {
            addNewlines(leading) {
                if (leading && !props[0]) {
                    return 1;
                }
            },
            indent: true,
            statement: true,
            iterator: () => {
                if (props.length !== 1) {
                    if (this.format.flowCommaSeparator) {
                        this.token(",");
                    } else {
                        this.semicolon();
                    }
                    this.space();
                }
            }
        });

        this.space();
    }

    if (node.exact) {
        this.token("|}");
    } else {
        this.token("}");
    }
};

export const ObjectTypeCallProperty = function (node) {
    if (node.static) {
        this.word("static");
        this.space();
    }
    this.print(node.value, node);
};

export const ObjectTypeIndexer = function (node) {
    if (node.static) {
        this.word("static");
        this.space();
    }
    this._variance(node);
    this.token("[");
    this.print(node.id, node);
    this.token(":");
    this.space();
    this.print(node.key, node);
    this.token("]");
    this.token(":");
    this.space();
    this.print(node.value, node);
};

export const ObjectTypeProperty = function (node) {
    if (node.static) {
        this.word("static");
        this.space();
    }
    this._variance(node);
    this.print(node.key, node);
    if (node.optional) {
        this.token("?");
    }
    this.token(":");
    this.space();
    this.print(node.value, node);
};

export const ObjectTypeSpreadProperty = function (node) {
    this.token("...");
    this.print(node.argument, node);
};

export const QualifiedTypeIdentifier = function (node) {
    this.print(node.qualification, node);
    this.token(".");
    this.print(node.id, node);
};

function orSeparator() {
    this.space();
    this.token("|");
    this.space();
}

export const UnionTypeAnnotation = function (node) {
    this.printJoin(node.types, node, { separator: orSeparator });
};

export const TypeCastExpression = function (node) {
    this.token("(");
    this.print(node.expression, node);
    this.print(node.typeAnnotation, node);
    this.token(")");
};

export const VoidTypeAnnotation = function () {
    this.word("void");
};
