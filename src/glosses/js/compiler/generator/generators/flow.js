import { ExportAllDeclaration } from "./modules";

const {
    js: { compiler: { types: t } }
} = adone;

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

export const DeclareClass = function (node, parent) {
    if (!t.isDeclareExportDeclaration(parent)) {
        this.word("declare");
        this.space();
    }
    this.word("class");
    this.space();
    this._interfaceish(node);
};

export const DeclareFunction = function (node, parent) {
    if (!t.isDeclareExportDeclaration(parent)) {
        this.word("declare");
        this.space();
    }
    this.word("function");
    this.space();
    this.print(node.id, node);
    this.print(node.id.typeAnnotation.typeAnnotation, node);

    if (node.predicate) {
        this.space();
        this.print(node.predicate, node);
    }

    this.semicolon();
};

export const InferredPredicate = function (/*node*/) {
    this.token("%");
    this.word("checks");
};

export const DeclaredPredicate = function (node) {
    this.token("%");
    this.word("checks");
    this.token("(");
    this.print(node.value, node);
    this.token(")");
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

export const DeclareOpaqueType = function (node, parent) {
    if (!t.isDeclareExportDeclaration(parent)) {
        this.word("declare");
        this.space();
    }
    this.OpaqueType(node);
};

export const DeclareVariable = function (node, parent) {
    if (!t.isDeclareExportDeclaration(parent)) {
        this.word("declare");
        this.space();
    }
    this.word("var");
    this.space();
    this.print(node.id, node);
    this.print(node.id.typeAnnotation, node);
    this.semicolon();
};

const FlowExportDeclaration = function (node) {
    if (node.declaration) {
        const declar = node.declaration;
        this.print(declar, node);
        if (!t.isStatement(declar)) {
            this.semicolon();
        }
    } else {
        this.token("{");
        if (node.specifiers.length) {
            this.space();
            this.printList(node.specifiers, node);
            this.space();
        }
        this.token("}");

        if (node.source) {
            this.space();
            this.word("from");
            this.space();
            this.print(node.source, node);
        }

        this.semicolon();
    }
};

export const DeclareExportDeclaration = function (node) {
    this.word("declare");
    this.space();
    this.word("export");
    this.space();
    if (node.default) {
        this.word("default");
        this.space();
    }

    FlowExportDeclaration.apply(this, arguments);
};

export const DeclareExportAllDeclaration = function (/*node*/) {
    this.word("declare");
    this.space();
    ExportAllDeclaration.apply(this, arguments);
};

export const ExistsTypeAnnotation = function () {
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
    if (
        parent.type === "ObjectTypeCallProperty" ||
        parent.type === "DeclareFunction" ||
        (parent.type === "ObjectTypeProperty" && parent.method)
    ) {
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
    if (node.name) {
        this.token(":");
        this.space();
    }
    this.print(node.typeAnnotation, node);
};

export const InterfaceExtends = function (node) {
    this.print(node.id, node);
    this.print(node.typeParameters, node);
};

export {
    InterfaceExtends as ClassImplements,
    InterfaceExtends as GenericTypeAnnotation
};

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
    if (node.implements && node.implements.length) {
        this.space();
        this.word("implements");
        this.space();
        this.printList(node.implements, node);
    }
    this.space();
    this.print(node.body, node);
};

export const _variance = function (node) {
    if (node.variance) {
        if (node.variance.kind === "plus") {
            this.token("+");
        } else if (node.variance.kind === "minus") {
            this.token("-");
        }
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

export const InterfaceTypeAnnotation = function (node) {
    this.word("interface");
    if (node.extends && node.extends.length) {
        this.space();
        this.word("extends");
        this.space();
        this.printList(node.extends, node);
    }
    this.space();
    this.print(node.body, node);
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
    NumericLiteral as NumberLiteralTypeAnnotation,
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

export const TypeParameterInstantiation = function (node) {
    this.token("<");
    this.printList(node.params, node, {});
    this.token(">");
};

export { TypeParameterInstantiation as TypeParameterDeclaration };

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

export const OpaqueType = function (node) {
    this.word("opaque");
    this.space();
    this.word("type");
    this.space();
    this.print(node.id, node);
    this.print(node.typeParameters, node);
    if (node.supertype) {
        this.token(":");
        this.space();
        this.print(node.supertype, node);
    }
    if (node.impltype) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.impltype, node);
    }
    this.semicolon();
};

export const ObjectTypeAnnotation = function (node) {
    if (node.exact) {
        this.token("{|");
    } else {
        this.token("{");
    }

    // TODO: remove the array fallbacks and instead enforce the types to require an array
    const props = node.properties.concat(
        node.callProperties || [],
        node.indexers || [],
        node.internalSlots || [],
    );

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
                    this.token(",");
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

export const ObjectTypeInternalSlot = function (node) {
    if (node.static) {
        this.word("static");
        this.space();
    }
    this.token("[");
    this.token("[");
    this.print(node.id, node);
    this.token("]");
    this.token("]");
    if (node.optional) {
        this.token("?");
    }
    if (!node.method) {
        this.token(":");
        this.space();
    }
    this.print(node.value, node);
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
    if (node.id) {
        this.print(node.id, node);
        this.token(":");
        this.space();
    }
    this.print(node.key, node);
    this.token("]");
    this.token(":");
    this.space();
    this.print(node.value, node);
};

export const ObjectTypeProperty = function (node) {
    if (node.proto) {
        this.word("proto");
        this.space();
    }
    if (node.static) {
        this.word("static");
        this.space();
    }
    this._variance(node);
    this.print(node.key, node);
    if (node.optional) {
        this.token("?");
    }
    if (!node.method) {
        this.token(":");
        this.space();
    }
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

const orSeparator = function () {
    this.space();
    this.token("|");
    this.space();
};

export const UnionTypeAnnotation = function (node) {
    this.printJoin(node.types, node, { separator: orSeparator });
};

export const TypeCastExpression = function (node) {
    this.token("(");
    this.print(node.expression, node);
    this.print(node.typeAnnotation, node);
    this.token(")");
};

export const Variance = function (node) {
    if (node.kind === "plus") {
        this.token("+");
    } else {
        this.token("-");
    }
};

export const VoidTypeAnnotation = function () {
    this.word("void");
};
