import { types as tt } from "../tokenizer/types";
import { types as ct } from "../tokenizer/context";

const {
    is
} = adone;

const nonNull = function (x) {
    if (is.nil(x)) {
        // $FlowIgnore
        throw new Error(`Unexpected ${x} value.`);
    }
    return x;
};

const assert = function (x) {
    if (!x) {
        throw new Error("Assert fail");
    }
};

// Doesn't handle "void" or "null" because those are keywords, not identifiers.
const keywordTypeFromName = function (value) {
    switch (value) {
        case "any":
            return "TSAnyKeyword";
        case "boolean":
            return "TSBooleanKeyword";
        case "never":
            return "TSNeverKeyword";
        case "number":
            return "TSNumberKeyword";
        case "object":
            return "TSObjectKeyword";
        case "string":
            return "TSStringKeyword";
        case "symbol":
            return "TSSymbolKeyword";
        case "undefined":
            return "TSUndefinedKeyword";
        default:
            return undefined;
    }
};

export default (superClass) =>
    class extends superClass {
        tsIsIdentifier() {
            // TODO: actually a bit more complex in TypeScript, but shouldn't matter.
            // See https://github.com/Microsoft/TypeScript/issues/15008
            return this.match(tt.name);
        }

        tsNextTokenCanFollowModifier() {
            // Note: TypeScript's implementation is much more complicated because
            // more things are considered modifiers there.
            // This implementation only handles modifiers not handled by @babel/parser itself. And "static".
            // TODO: Would be nice to avoid lookahead. Want a hasLineBreakUpNext() method...
            this.next();
            return (
                !this.hasPrecedingLineBreak() &&
                !this.match(tt.parenL) &&
                !this.match(tt.parenR) &&
                !this.match(tt.colon) &&
                !this.match(tt.eq) &&
                !this.match(tt.question)
            );
        }

        /**
         *  Parses a modifier matching one the given modifier names.
         */
        tsParseModifier(allowedModifiers) {
            if (!this.match(tt.name)) {
                return undefined;
            }

            const modifier = this.state.value;
            if (
                allowedModifiers.includes(modifier) &&
                this.tsTryParse(this.tsNextTokenCanFollowModifier.bind(this))
            ) {
                return modifier;
            }
            return undefined;
        }

        tsIsListTerminator(kind) {
            switch (kind) {
                case "EnumMembers":
                case "TypeMembers":
                    return this.match(tt.braceR);
                case "HeritageClauseElement":
                    return this.match(tt.braceL);
                case "TupleElementTypes":
                    return this.match(tt.bracketR);
                case "TypeParametersOrArguments":
                    return this.isRelational(">");
            }

            throw new Error("Unreachable");
        }

        tsParseList(kind, parseElement) {
            const result = [];
            while (!this.tsIsListTerminator(kind)) {
                // Skipping "parseListElement" from the TS source since that's just for error handling.
                result.push(parseElement());
            }
            return result;
        }

        tsParseDelimitedList(kind, parseElement) {
            return nonNull(
                this.tsParseDelimitedListWorker(
                    kind,
                    parseElement,
                    /* expectSuccess */ true,
                ),
            );
        }

        tsTryParseDelimitedList(kind, parseElement) {
            return this.tsParseDelimitedListWorker(
                kind,
                parseElement,
                /* expectSuccess */ false,
            );
        }

        /**
         * If !expectSuccess, returns undefined instead of failing to parse.
         * If expectSuccess, parseElement should always return a defined value.
         */
        tsParseDelimitedListWorker(kind, parseElement, expectSuccess) {
            const result = [];

            while (true) {
                if (this.tsIsListTerminator(kind)) {
                    break;
                }

                const element = parseElement();
                if (is.nil(element)) {
                    return undefined;
                }
                result.push(element);

                if (this.eat(tt.comma)) {
                    continue;
                }

                if (this.tsIsListTerminator(kind)) {
                    break;
                }

                if (expectSuccess) {
                    // This will fail with an error about a missing comma
                    this.expect(tt.comma);
                }
                return undefined;
            }

            return result;
        }

        tsParseBracketedList(
            kind,
            parseElement,
            bracket,
            skipFirstToken,
        ) {
            if (!skipFirstToken) {
                if (bracket) {
                    this.expect(tt.bracketL);
                } else {
                    this.expectRelational("<");
                }
            }

            const result = this.tsParseDelimitedList(kind, parseElement);

            if (bracket) {
                this.expect(tt.bracketR);
            } else {
                this.expectRelational(">");
            }

            return result;
        }

        tsParseEntityName(allowReservedWords) {
            let entity = this.parseIdentifier();
            while (this.eat(tt.dot)) {
                const node = this.startNodeAtNode(entity);
                node.left = entity;
                node.right = this.parseIdentifier(allowReservedWords);
                entity = this.finishNode(node, "TSQualifiedName");
            }
            return entity;
        }

        tsParseTypeReference() {
            const node = this.startNode();
            node.typeName = this.tsParseEntityName(/* allowReservedWords */ false);
            if (!this.hasPrecedingLineBreak() && this.isRelational("<")) {
                node.typeParameters = this.tsParseTypeArguments();
            }
            return this.finishNode(node, "TSTypeReference");
        }

        tsParseThisTypePredicate(lhs) {
            this.next();
            const node = this.startNode();
            node.parameterName = lhs;
            node.typeAnnotation = this.tsParseTypeAnnotation(/* eatColon */ false);
            return this.finishNode(node, "TSTypePredicate");
        }

        tsParseThisTypeNode() {
            const node = this.startNode();
            this.next();
            return this.finishNode(node, "TSThisType");
        }

        tsParseTypeQuery() {
            const node = this.startNode();
            this.expect(tt._typeof);
            node.exprName = this.tsParseEntityName(/* allowReservedWords */ true);
            return this.finishNode(node, "TSTypeQuery");
        }

        tsParseTypeParameter() {
            const node = this.startNode();
            node.name = this.parseIdentifierName(node.start);
            node.constraint = this.tsEatThenParseType(tt._extends);
            node.default = this.tsEatThenParseType(tt.eq);
            return this.finishNode(node, "TSTypeParameter");
        }

        tsTryParseTypeParameters() {
            if (this.isRelational("<")) {
                return this.tsParseTypeParameters();
            }
        }

        tsParseTypeParameters() {
            const node = this.startNode();

            if (this.isRelational("<") || this.match(tt.jsxTagStart)) {
                this.next();
            } else {
                this.unexpected();
            }

            node.params = this.tsParseBracketedList(
                "TypeParametersOrArguments",
                this.tsParseTypeParameter.bind(this),
                /* bracket */ false,
                /* skipFirstToken */ true,
            );
            return this.finishNode(node, "TSTypeParameterDeclaration");
        }

        // Note: In TypeScript implementation we must provide `yieldContext` and `awaitContext`,
        // but here it's always false, because this is only used for types.
        tsFillSignature(
            returnToken,
            signature,
        ) {
            // Arrow fns *must* have return token (`=>`). Normal functions can omit it.
            const returnTokenRequired = returnToken === tt.arrow;
            signature.typeParameters = this.tsTryParseTypeParameters();
            this.expect(tt.parenL);
            signature.parameters = this.tsParseBindingListForSignature();
            if (returnTokenRequired) {
                signature.typeAnnotation = this.tsParseTypeOrTypePredicateAnnotation(
                    returnToken,
                );
            } else if (this.match(returnToken)) {
                signature.typeAnnotation = this.tsParseTypeOrTypePredicateAnnotation(
                    returnToken,
                );
            }
        }

        tsParseBindingListForSignature() {
            return this.parseBindingList(tt.parenR).map((pattern) => {
                if (pattern.type !== "Identifier" && pattern.type !== "RestElement") {
                    throw this.unexpected(
                        pattern.start,
                        "Name in a signature must be an Identifier.",
                    );
                }
                return pattern;
            });
        }

        tsParseTypeMemberSemicolon() {
            if (!this.eat(tt.comma)) {
                this.semicolon();
            }
        }

        tsParseSignatureMember(kind) {
            const node = this.startNode();
            if (kind === "TSConstructSignatureDeclaration") {
                this.expect(tt._new);
            }
            this.tsFillSignature(tt.colon, node);
            this.tsParseTypeMemberSemicolon();
            return this.finishNode(node, kind);
        }

        tsIsUnambiguouslyIndexSignature() {
            this.next(); // Skip '{'
            return this.eat(tt.name) && this.match(tt.colon);
        }

        tsTryParseIndexSignature(node) {
            if (
                !(
                    this.match(tt.bracketL) &&
                    this.tsLookAhead(this.tsIsUnambiguouslyIndexSignature.bind(this))
                )
            ) {
                return undefined;
            }

            this.expect(tt.bracketL);
            const id = this.parseIdentifier();
            this.expect(tt.colon);
            id.typeAnnotation = this.tsParseTypeAnnotation(/* eatColon */ false);
            this.expect(tt.bracketR);
            node.parameters = [id];

            const type = this.tsTryParseTypeAnnotation();
            if (type) {
                node.typeAnnotation = type;
            }
            this.tsParseTypeMemberSemicolon();
            return this.finishNode(node, "TSIndexSignature");
        }

        tsParsePropertyOrMethodSignature(node, readonly) {
            this.parsePropertyName(node);
            if (this.eat(tt.question)) {
                node.optional = true;
            }
            const nodeAny = node;

            if (!readonly && (this.match(tt.parenL) || this.isRelational("<"))) {
                const method = nodeAny;
                this.tsFillSignature(tt.colon, method);
                this.tsParseTypeMemberSemicolon();
                return this.finishNode(method, "TSMethodSignature");
            }
            const property = nodeAny;
            if (readonly) {
                property.readonly = true;
            }
            const type = this.tsTryParseTypeAnnotation();
            if (type) {
                property.typeAnnotation = type;
            }
            this.tsParseTypeMemberSemicolon();
            return this.finishNode(property, "TSPropertySignature");

        }

        tsParseTypeMember() {
            if (this.match(tt.parenL) || this.isRelational("<")) {
                return this.tsParseSignatureMember("TSCallSignatureDeclaration");
            }
            if (
                this.match(tt._new) &&
                this.tsLookAhead(this.tsIsStartOfConstructSignature.bind(this))
            ) {
                return this.tsParseSignatureMember("TSConstructSignatureDeclaration");
            }
            // Instead of fullStart, we create a node here.
            const node = this.startNode();
            const readonly = Boolean(this.tsParseModifier(["readonly"]));

            const idx = this.tsTryParseIndexSignature(node);
            if (idx) {
                if (readonly) {
                    node.readonly = true;
                }
                return idx;
            }
            return this.tsParsePropertyOrMethodSignature(node, readonly);
        }

        tsIsStartOfConstructSignature() {
            this.next();
            return this.match(tt.parenL) || this.isRelational("<");
        }

        tsParseTypeLiteral() {
            const node = this.startNode();
            node.members = this.tsParseObjectTypeMembers();
            return this.finishNode(node, "TSTypeLiteral");
        }

        tsParseObjectTypeMembers() {
            this.expect(tt.braceL);
            const members = this.tsParseList(
                "TypeMembers",
                this.tsParseTypeMember.bind(this),
            );
            this.expect(tt.braceR);
            return members;
        }

        tsIsStartOfMappedType() {
            this.next();
            if (this.eat(tt.plusMin)) {
                return this.isContextual("readonly");
            }
            if (this.isContextual("readonly")) {
                this.next();
            }
            if (!this.match(tt.bracketL)) {
                return false;
            }
            this.next();
            if (!this.tsIsIdentifier()) {
                return false;
            }
            this.next();
            return this.match(tt._in);
        }

        tsParseMappedTypeParameter() {
            const node = this.startNode();
            node.name = this.parseIdentifierName(node.start);
            node.constraint = this.tsExpectThenParseType(tt._in);
            return this.finishNode(node, "TSTypeParameter");
        }

        tsParseMappedType() {
            const node = this.startNode();

            this.expect(tt.braceL);

            if (this.match(tt.plusMin)) {
                node.readonly = this.state.value;
                this.next();
                this.expectContextual("readonly");
            } else if (this.eatContextual("readonly")) {
                node.readonly = true;
            }

            this.expect(tt.bracketL);
            node.typeParameter = this.tsParseMappedTypeParameter();
            this.expect(tt.bracketR);

            if (this.match(tt.plusMin)) {
                node.optional = this.state.value;
                this.next();
                this.expect(tt.question);
            } else if (this.eat(tt.question)) {
                node.optional = true;
            }

            node.typeAnnotation = this.tsTryParseType();
            this.semicolon();
            this.expect(tt.braceR);

            return this.finishNode(node, "TSMappedType");
        }

        tsParseTupleType() {
            const node = this.startNode();
            node.elementTypes = this.tsParseBracketedList(
                "TupleElementTypes",
                this.tsParseType.bind(this),
                /* bracket */ true,
                /* skipFirstToken */ false,
            );
            return this.finishNode(node, "TSTupleType");
        }

        tsParseParenthesizedType() {
            const node = this.startNode();
            this.expect(tt.parenL);
            node.typeAnnotation = this.tsParseType();
            this.expect(tt.parenR);
            return this.finishNode(node, "TSParenthesizedType");
        }

        tsParseFunctionOrConstructorType(
            type,
        ) {
            const node = this.startNode();
            if (type === "TSConstructorType") {
                this.expect(tt._new);
            }
            this.tsFillSignature(tt.arrow, node);
            return this.finishNode(node, type);
        }

        tsParseLiteralTypeNode() {
            const node = this.startNode();
            node.literal = (() => {
                switch (this.state.type) {
                    case tt.num:
                        return this.parseLiteral(this.state.value, "NumericLiteral");
                    case tt.string:
                        return this.parseLiteral(this.state.value, "StringLiteral");
                    case tt._true:
                    case tt._false:
                        return this.parseBooleanLiteral();
                    default:
                        throw this.unexpected();
                }
            })();
            return this.finishNode(node, "TSLiteralType");
        }

        tsParseNonArrayType() {
            switch (this.state.type) {
                case tt.name:
                case tt._void:
                case tt._null: {
                    const type = this.match(tt._void)
                        ? "TSVoidKeyword"
                        : this.match(tt._null)
                            ? "TSNullKeyword"
                            : keywordTypeFromName(this.state.value);
                    if (!is.undefined(type) && this.lookahead().type !== tt.dot) {
                        const node = this.startNode();
                        this.next();
                        return this.finishNode(node, type);
                    }
                    return this.tsParseTypeReference();
                }
                case tt.string:
                case tt.num:
                case tt._true:
                case tt._false:
                    return this.tsParseLiteralTypeNode();
                case tt.plusMin:
                    if (this.state.value === "-") {
                        const node = this.startNode();
                        this.next();
                        if (!this.match(tt.num)) {
                            throw this.unexpected();
                        }
                        node.literal = this.parseLiteral(
                            -this.state.value,
                            "NumericLiteral",
                            node.start,
                            node.loc.start,
                        );
                        return this.finishNode(node, "TSLiteralType");
                    }
                    break;
                case tt._this: {
                    const thisKeyword = this.tsParseThisTypeNode();
                    if (this.isContextual("is") && !this.hasPrecedingLineBreak()) {
                        return this.tsParseThisTypePredicate(thisKeyword);
                    }
                    return thisKeyword;

                }
                case tt._typeof:
                    return this.tsParseTypeQuery();
                case tt.braceL:
                    return this.tsLookAhead(this.tsIsStartOfMappedType.bind(this))
                        ? this.tsParseMappedType()
                        : this.tsParseTypeLiteral();
                case tt.bracketL:
                    return this.tsParseTupleType();
                case tt.parenL:
                    return this.tsParseParenthesizedType();
            }

            throw this.unexpected();
        }

        tsParseArrayTypeOrHigher() {
            let type = this.tsParseNonArrayType();
            while (!this.hasPrecedingLineBreak() && this.eat(tt.bracketL)) {
                if (this.match(tt.bracketR)) {
                    const node = this.startNodeAtNode(type);
                    node.elementType = type;
                    this.expect(tt.bracketR);
                    type = this.finishNode(node, "TSArrayType");
                } else {
                    const node = this.startNodeAtNode(type);
                    node.objectType = type;
                    node.indexType = this.tsParseType();
                    this.expect(tt.bracketR);
                    type = this.finishNode(node, "TSIndexedAccessType");
                }
            }
            return type;
        }

        tsParseTypeOperator(operator) {
            const node = this.startNode();
            this.expectContextual(operator);
            node.operator = operator;
            node.typeAnnotation = this.tsParseTypeOperatorOrHigher();
            return this.finishNode(node, "TSTypeOperator");
        }

        tsParseInferType() {
            const node = this.startNode();
            this.expectContextual("infer");
            const typeParameter = this.startNode();
            typeParameter.name = this.parseIdentifierName(typeParameter.start);
            node.typeParameter = this.finishNode(typeParameter, "TSTypeParameter");
            return this.finishNode(node, "TSInferType");
        }

        tsParseTypeOperatorOrHigher() {
            const operator = ["keyof", "unique"].find((kw) => this.isContextual(kw));
            return operator
                ? this.tsParseTypeOperator(operator)
                : this.isContextual("infer")
                    ? this.tsParseInferType()
                    : this.tsParseArrayTypeOrHigher();
        }

        tsParseUnionOrIntersectionType(
            kind,
            parseConstituentType,
            operator,
        ) {
            this.eat(operator);
            let type = parseConstituentType();
            if (this.match(operator)) {
                const types = [type];
                while (this.eat(operator)) {
                    types.push(parseConstituentType());
                }
                const node = this.startNodeAtNode(
                    type,
                );
                node.types = types;
                type = this.finishNode(node, kind);
            }
            return type;
        }

        tsParseIntersectionTypeOrHigher() {
            return this.tsParseUnionOrIntersectionType(
                "TSIntersectionType",
                this.tsParseTypeOperatorOrHigher.bind(this),
                tt.bitwiseAND,
            );
        }

        tsParseUnionTypeOrHigher() {
            return this.tsParseUnionOrIntersectionType(
                "TSUnionType",
                this.tsParseIntersectionTypeOrHigher.bind(this),
                tt.bitwiseOR,
            );
        }

        tsIsStartOfFunctionType() {
            if (this.isRelational("<")) {
                return true;
            }
            return (
                this.match(tt.parenL) &&
                this.tsLookAhead(this.tsIsUnambiguouslyStartOfFunctionType.bind(this))
            );
        }

        tsSkipParameterStart() {
            if (this.match(tt.name) || this.match(tt._this)) {
                this.next();
                return true;
            }
            return false;
        }

        tsIsUnambiguouslyStartOfFunctionType() {
            this.next();
            if (this.match(tt.parenR) || this.match(tt.ellipsis)) {
                // ( )
                // ( ...
                return true;
            }
            if (this.tsSkipParameterStart()) {
                if (
                    this.match(tt.colon) ||
                    this.match(tt.comma) ||
                    this.match(tt.question) ||
                    this.match(tt.eq)
                ) {
                    // ( xxx :
                    // ( xxx ,
                    // ( xxx ?
                    // ( xxx =
                    return true;
                }
                if (this.match(tt.parenR)) {
                    this.next();
                    if (this.match(tt.arrow)) {
                        // ( xxx ) =>
                        return true;
                    }
                }
            }
            return false;
        }

        tsParseTypeOrTypePredicateAnnotation(
            returnToken,
        ) {
            return this.tsInType(() => {
                const t = this.startNode();
                this.expect(returnToken);

                const typePredicateVariable =
                    this.tsIsIdentifier() &&
                    this.tsTryParse(this.tsParseTypePredicatePrefix.bind(this));

                if (!typePredicateVariable) {
                    return this.tsParseTypeAnnotation(/* eatColon */ false, t);
                }

                const type = this.tsParseTypeAnnotation(/* eatColon */ false);

                const node = this.startNodeAtNode(
                    typePredicateVariable,
                );
                node.parameterName = typePredicateVariable;
                node.typeAnnotation = type;
                t.typeAnnotation = this.finishNode(node, "TSTypePredicate");
                return this.finishNode(t, "TSTypeAnnotation");
            });
        }

        tsTryParseTypeOrTypePredicateAnnotation() {
            return this.match(tt.colon)
                ? this.tsParseTypeOrTypePredicateAnnotation(tt.colon)
                : undefined;
        }

        tsTryParseTypeAnnotation() {
            return this.match(tt.colon) ? this.tsParseTypeAnnotation() : undefined;
        }

        tsTryParseType() {
            return this.tsEatThenParseType(tt.colon);
        }

        tsParseTypePredicatePrefix() {
            const id = this.parseIdentifier();
            if (this.isContextual("is") && !this.hasPrecedingLineBreak()) {
                this.next();
                return id;
            }
        }

        tsParseTypeAnnotation(
            eatColon = true,
            t = this.startNode(),
        ) {
            this.tsInType(() => {
                if (eatColon) {
                    this.expect(tt.colon);
                }
                t.typeAnnotation = this.tsParseType();
            });
            return this.finishNode(t, "TSTypeAnnotation");
        }

        /**
         *  Be sure to be in a type context before calling this, using `tsInType`.
         */
        tsParseType() {
            // Need to set `state.inType` so that we don't parse JSX in a type context.
            assert(this.state.inType);
            const type = this.tsParseNonConditionalType();
            if (this.hasPrecedingLineBreak() || !this.eat(tt._extends)) {
                return type;
            }
            const node = this.startNodeAtNode(type);
            node.checkType = type;
            node.extendsType = this.tsParseNonConditionalType();
            this.expect(tt.question);
            node.trueType = this.tsParseType();
            this.expect(tt.colon);
            node.falseType = this.tsParseType();
            return this.finishNode(node, "TSConditionalType");
        }

        tsParseNonConditionalType() {
            if (this.tsIsStartOfFunctionType()) {
                return this.tsParseFunctionOrConstructorType("TSFunctionType");
            }
            if (this.match(tt._new)) {
                // As in `new () => Date`
                return this.tsParseFunctionOrConstructorType("TSConstructorType");
            }
            return this.tsParseUnionTypeOrHigher();
        }

        tsParseTypeAssertion() {
            const node = this.startNode();
            // Not actually necessary to set state.inType because we never reach here if JSX plugin is enabled,
            // but need `tsInType` to satisfy the assertion in `tsParseType`.
            node.typeAnnotation = this.tsInType(() => this.tsParseType());
            this.expectRelational(">");
            node.expression = this.parseMaybeUnary();
            return this.finishNode(node, "TSTypeAssertion");
        }

        tsParseHeritageClause() {
            return this.tsParseDelimitedList(
                "HeritageClauseElement",
                this.tsParseExpressionWithTypeArguments.bind(this),
            );
        }

        tsParseExpressionWithTypeArguments() {
            const node = this.startNode();
            // Note: TS uses parseLeftHandSideExpressionOrHigher,
            // then has grammar errors later if it's not an EntityName.
            node.expression = this.tsParseEntityName(/* allowReservedWords */ false);
            if (this.isRelational("<")) {
                node.typeParameters = this.tsParseTypeArguments();
            }

            return this.finishNode(node, "TSExpressionWithTypeArguments");
        }

        tsParseInterfaceDeclaration(node) {
            node.id = this.parseIdentifier();
            node.typeParameters = this.tsTryParseTypeParameters();
            if (this.eat(tt._extends)) {
                node.extends = this.tsParseHeritageClause();
            }
            const body = this.startNode();
            body.body = this.tsParseObjectTypeMembers();
            node.body = this.finishNode(body, "TSInterfaceBody");
            return this.finishNode(node, "TSInterfaceDeclaration");
        }

        tsParseTypeAliasDeclaration(
            node,
        ) {
            node.id = this.parseIdentifier();
            node.typeParameters = this.tsTryParseTypeParameters();
            node.typeAnnotation = this.tsExpectThenParseType(tt.eq);
            this.semicolon();
            return this.finishNode(node, "TSTypeAliasDeclaration");
        }

        tsInNoContext(cb) {
            const oldContext = this.state.context;
            this.state.context = [oldContext[0]];
            try {
                return cb();
            } finally {
                this.state.context = oldContext;
            }
        }

        /**
         * Runs `cb` in a type context.
         * This should be called one token *before* the first type token,
         * so that the call to `next()` is run in type context.
         */
        tsInType(cb) {
            const oldInType = this.state.inType;
            this.state.inType = true;
            try {
                return cb();
            } finally {
                this.state.inType = oldInType;
            }
        }

        tsEatThenParseType(token) {
            return !this.match(token) ? undefined : this.tsNextThenParseType();
        }

        tsExpectThenParseType(token) {
            return this.tsDoThenParseType(() => this.expect(token));
        }

        tsNextThenParseType() {
            return this.tsDoThenParseType(() => this.next());
        }

        tsDoThenParseType(cb) {
            return this.tsInType(() => {
                cb();
                return this.tsParseType();
            });
        }

        tsParseEnumMember() {
            const node = this.startNode();
            // Computed property names are grammar errors in an enum, so accept just string literal or identifier.
            node.id = this.match(tt.string)
                ? this.parseLiteral(this.state.value, "StringLiteral")
                : this.parseIdentifier(/* liberal */ true);
            if (this.eat(tt.eq)) {
                node.initializer = this.parseMaybeAssign();
            }
            return this.finishNode(node, "TSEnumMember");
        }

        tsParseEnumDeclaration(
            node,
            isConst,
        ) {
            if (isConst) {
                node.const = true;
            }
            node.id = this.parseIdentifier();
            this.expect(tt.braceL);
            node.members = this.tsParseDelimitedList(
                "EnumMembers",
                this.tsParseEnumMember.bind(this),
            );
            this.expect(tt.braceR);
            return this.finishNode(node, "TSEnumDeclaration");
        }

        tsParseModuleBlock() {
            const node = this.startNode();
            this.expect(tt.braceL);
            // Inside of a module block is considered "top-level", meaning it can have imports and exports.
            this.parseBlockOrModuleBlockBody(
                (node.body = []),
                /* directives */ undefined,
                /* topLevel */ true,
                /* end */ tt.braceR,
            );
            return this.finishNode(node, "TSModuleBlock");
        }

        tsParseModuleOrNamespaceDeclaration(
            node,
        ) {
            node.id = this.parseIdentifier();
            if (this.eat(tt.dot)) {
                const inner = this.startNode();
                this.tsParseModuleOrNamespaceDeclaration(inner);
                node.body = inner;
            } else {
                node.body = this.tsParseModuleBlock();
            }
            return this.finishNode(node, "TSModuleDeclaration");
        }

        tsParseAmbientExternalModuleDeclaration(
            node,
        ) {
            if (this.isContextual("global")) {
                node.global = true;
                node.id = this.parseIdentifier();
            } else if (this.match(tt.string)) {
                node.id = this.parseExprAtom();
            } else {
                this.unexpected();
            }

            if (this.match(tt.braceL)) {
                node.body = this.tsParseModuleBlock();
            } else {
                this.semicolon();
            }

            return this.finishNode(node, "TSModuleDeclaration");
        }

        tsParseImportEqualsDeclaration(
            node,
            isExport,
        ) {
            node.isExport = isExport || false;
            node.id = this.parseIdentifier();
            this.expect(tt.eq);
            node.moduleReference = this.tsParseModuleReference();
            this.semicolon();
            return this.finishNode(node, "TSImportEqualsDeclaration");
        }

        tsIsExternalModuleReference() {
            return (
                this.isContextual("require") && this.lookahead().type === tt.parenL
            );
        }

        tsParseModuleReference() {
            return this.tsIsExternalModuleReference()
                ? this.tsParseExternalModuleReference()
                : this.tsParseEntityName(/* allowReservedWords */ false);
        }

        tsParseExternalModuleReference() {
            const node = this.startNode();
            this.expectContextual("require");
            this.expect(tt.parenL);
            if (!this.match(tt.string)) {
                throw this.unexpected();
            }
            node.expression = this.parseLiteral(this.state.value, "StringLiteral");
            this.expect(tt.parenR);
            return this.finishNode(node, "TSExternalModuleReference");
        }

        // Utilities

        tsLookAhead(f) {
            const state = this.state.clone();
            const res = f();
            this.state = state;
            return res;
        }

        tsTryParseAndCatch(f) {
            const state = this.state.clone();
            try {
                return f();
            } catch (e) {
                if (e instanceof SyntaxError) {
                    this.state = state;
                    return undefined;
                }
                throw e;
            }
        }

        tsTryParse(f) {
            const state = this.state.clone();
            const result = f();
            if (!is.undefined(result) && result !== false) {
                return result;
            }
            this.state = state;
            return undefined;

        }

        nodeWithSamePosition(original, type) {
            const node = this.startNodeAtNode(original);
            node.type = type;
            node.end = original.end;
            node.loc.end = original.loc.end;

            if (original.leadingComments) {
                node.leadingComments = original.leadingComments;
            }
            if (original.trailingComments) {
                node.trailingComments = original.trailingComments;
            }
            if (original.innerComments) {
                node.innerComments = original.innerComments;
            }

            return node;
        }

        tsTryParseDeclare(nany) {
            switch (this.state.type) {
                case tt._function:
                    this.next();
                    return this.parseFunction(nany, /* isStatement */ true);
                case tt._class:
                    return this.parseClass(
                        nany,
                        /* isStatement */ true,
                        /* optionalId */ false,
                    );
                case tt._const:
                    if (this.match(tt._const) && this.isLookaheadContextual("enum")) {
                        // `const enum = 0;` not allowed because "enum" is a strict mode reserved word.
                        this.expect(tt._const);
                        this.expectContextual("enum");
                        return this.tsParseEnumDeclaration(nany, /* isConst */ true);
                    }
                // falls through
                case tt._var:
                case tt._let:
                    return this.parseVarStatement(nany, this.state.type);
                case tt.name: {
                    const value = this.state.value;
                    if (value === "global") {
                        return this.tsParseAmbientExternalModuleDeclaration(nany);
                    }
                    return this.tsParseDeclaration(nany, value, /* next */ true);

                }
            }
        }

        // Note: this won't be called unless the keyword is allowed in `shouldParseExportDeclaration`.
        tsTryParseExportDeclaration() {
            return this.tsParseDeclaration(
                this.startNode(),
                this.state.value,
                /* next */ true,
            );
        }

        tsParseExpressionStatement(node, expr) {
            switch (expr.name) {
                case "declare": {
                    const declaration = this.tsTryParseDeclare(node);
                    if (declaration) {
                        declaration.declare = true;
                        return declaration;
                    }
                    break;
                }
                case "global":
                    // `global { }` (with no `declare`) may appear inside an ambient module declaration.
                    // Would like to use tsParseAmbientExternalModuleDeclaration here, but already ran past "global".
                    if (this.match(tt.braceL)) {
                        const mod = node;
                        mod.global = true;
                        mod.id = expr;
                        mod.body = this.tsParseModuleBlock();
                        return this.finishNode(mod, "TSModuleDeclaration");
                    }
                    break;

                default:
                    return this.tsParseDeclaration(node, expr.name, /* next */ false);
            }
        }

        // Common to tsTryParseDeclare, tsTryParseExportDeclaration, and tsParseExpressionStatement.
        tsParseDeclaration(
            node,
            value,
            next,
        ) {
            switch (value) {
                case "abstract":
                    if (next || this.match(tt._class)) {
                        const cls = node;
                        cls.abstract = true;
                        if (next) {
                            this.next();
                        }
                        return this.parseClass(
                            cls,
                            /* isStatement */ true,
                            /* optionalId */ false,
                        );
                    }
                    break;

                case "enum":
                    if (next || this.match(tt.name)) {
                        if (next) {
                            this.next();
                        }
                        return this.tsParseEnumDeclaration(node, /* isConst */ false);
                    }
                    break;

                case "interface":
                    if (next || this.match(tt.name)) {
                        if (next) {
                            this.next();
                        }
                        return this.tsParseInterfaceDeclaration(node);
                    }
                    break;

                case "module":
                    if (next) {
                        this.next();
                    }
                    if (this.match(tt.string)) {
                        return this.tsParseAmbientExternalModuleDeclaration(node);
                    } else if (next || this.match(tt.name)) {
                        return this.tsParseModuleOrNamespaceDeclaration(node);
                    }
                    break;

                case "namespace":
                    if (next || this.match(tt.name)) {
                        if (next) {
                            this.next();
                        }
                        return this.tsParseModuleOrNamespaceDeclaration(node);
                    }
                    break;

                case "type":
                    if (next || this.match(tt.name)) {
                        if (next) {
                            this.next();
                        }
                        return this.tsParseTypeAliasDeclaration(node);
                    }
                    break;
            }
        }

        tsTryParseGenericAsyncArrowFunction(
            startPos,
            startLoc,
        ) {
            const res = this.tsTryParseAndCatch(() => {
                const node = this.startNodeAt(
                    startPos,
                    startLoc,
                );
                node.typeParameters = this.tsParseTypeParameters();
                // Don't use overloaded parseFunctionParams which would look for "<" again.
                super.parseFunctionParams(node);
                node.returnType = this.tsTryParseTypeOrTypePredicateAnnotation();
                this.expect(tt.arrow);
                return node;
            });

            if (!res) {
                return undefined;
            }

            res.id = null;
            res.generator = false;
            res.expression = true; // May be set again by parseFunctionBody.
            res.async = true;
            this.parseFunctionBody(res, true);
            return this.finishNode(res, "ArrowFunctionExpression");
        }

        tsParseTypeArguments() {
            const node = this.startNode();
            node.params = this.tsInType(() =>
                // Temporarily remove a JSX parsing context, which makes us scan different tokens.
                this.tsInNoContext(() => {
                    this.expectRelational("<");
                    return this.tsParseDelimitedList(
                        "TypeParametersOrArguments",
                        this.tsParseType.bind(this),
                    );
                }),
            );
            // This reads the next token after the `>` too, so do this in the enclosing context.
            // But be sure not to parse a regex in the jsx expression `<C<number> />`, so set exprAllowed = false
            this.state.exprAllowed = false;
            this.expectRelational(">");
            return this.finishNode(node, "TSTypeParameterInstantiation");
        }

        tsIsDeclarationStart() {
            if (this.match(tt.name)) {
                switch (this.state.value) {
                    case "abstract":
                    case "declare":
                    case "enum":
                    case "interface":
                    case "module":
                    case "namespace":
                    case "type":
                        return true;
                }
            }

            return false;
        }

        // ======================================================
        // OVERRIDES
        // ======================================================

        isExportDefaultSpecifier() {
            if (this.tsIsDeclarationStart()) {
                return false;
            }
            return super.isExportDefaultSpecifier();
        }

        parseAssignableListItem(
            allowModifiers,
            decorators,
        ) {
            let accessibility;
            let readonly = false;
            if (allowModifiers) {
                accessibility = this.parseAccessModifier();
                readonly = Boolean(this.tsParseModifier(["readonly"]));
            }

            const left = this.parseMaybeDefault();
            this.parseAssignableListItemTypes(left);
            const elt = this.parseMaybeDefault(left.start, left.loc.start, left);
            if (accessibility || readonly) {
                const pp = this.startNodeAtNode(elt);
                if (decorators.length) {
                    pp.decorators = decorators;
                }
                if (accessibility) {
                    pp.accessibility = accessibility;
                }
                if (readonly) {
                    pp.readonly = readonly;
                }
                if (elt.type !== "Identifier" && elt.type !== "AssignmentPattern") {
                    throw this.raise(
                        pp.start,
                        "A parameter property may not be declared using a binding pattern.",
                    );
                }
                pp.parameter = elt;
                return this.finishNode(pp, "TSParameterProperty");
            }
            if (decorators.length) {
                left.decorators = decorators;
            }
            return elt;

        }

        parseFunctionBodyAndFinish(
            node,
            type,
            allowExpressionBody,
        ) {
            // For arrow functions, `parseArrow` handles the return type itself.
            if (!allowExpressionBody && this.match(tt.colon)) {
                node.returnType = this.tsParseTypeOrTypePredicateAnnotation(tt.colon);
            }

            const bodilessType =
                type === "FunctionDeclaration"
                    ? "TSDeclareFunction"
                    : type === "ClassMethod"
                        ? "TSDeclareMethod"
                        : undefined;
            if (bodilessType && !this.match(tt.braceL) && this.isLineTerminator()) {
                this.finishNode(node, bodilessType);
                return;
            }

            super.parseFunctionBodyAndFinish(node, type, allowExpressionBody);
        }

        parseSubscript(
            base,
            startPos,
            startLoc,
            noCalls,
            state,
        ) {
            if (!this.hasPrecedingLineBreak() && this.match(tt.bang)) {
                this.state.exprAllowed = false;
                this.next();

                const nonNullExpression = this.startNodeAt(
                    startPos,
                    startLoc,
                );
                nonNullExpression.expression = base;
                return this.finishNode(nonNullExpression, "TSNonNullExpression");
            }

            // There are number of things we are going to "maybe" parse, like type arguments on
            // tagged template expressions. If any of them fail, walk it back and continue.
            const result = this.tsTryParseAndCatch(() => {
                if (this.isRelational("<")) {
                    if (!noCalls && this.atPossibleAsync(base)) {
                        // Almost certainly this is a generic async function `async () => ...
                        // But it might be a call with a type argument `async();`
                        const asyncArrowFn = this.tsTryParseGenericAsyncArrowFunction(
                            startPos,
                            startLoc,
                        );
                        if (asyncArrowFn) {
                            return asyncArrowFn;
                        }
                    }

                    const node = this.startNodeAt(startPos, startLoc);
                    node.callee = base;

                    const typeArguments = this.tsParseTypeArguments();

                    if (typeArguments) {
                        if (!noCalls && this.eat(tt.parenL)) {
                            // possibleAsync always false here, because we would have handled it above.
                            // $FlowIgnore (won't be any undefined arguments)
                            node.arguments = this.parseCallExpressionArguments(
                                tt.parenR,
                                /* possibleAsync */ false,
                            );
                            node.typeParameters = typeArguments;
                            return this.finishCallExpression(node);
                        } else if (this.match(tt.backQuote)) {
                            return this.parseTaggedTemplateExpression(
                                startPos,
                                startLoc,
                                base,
                                state,
                                typeArguments,
                            );
                        }
                    }
                }

                this.unexpected();
            });

            if (result) {
                return result;
            }

            return super.parseSubscript(base, startPos, startLoc, noCalls, state);
        }

        parseNewArguments(node) {
            if (this.isRelational("<")) {
                // tsTryParseAndCatch is expensive, so avoid if not necessary.
                // 99% certain this is `new C();`. But may be `new C < T;`, which is also legal.
                const typeParameters = this.tsTryParseAndCatch(() => {
                    const args = this.tsParseTypeArguments();
                    if (!this.match(tt.parenL)) {
                        this.unexpected();
                    }
                    return args;
                });
                if (typeParameters) {
                    node.typeParameters = typeParameters;
                }
            }

            super.parseNewArguments(node);
        }

        parseExprOp(
            left,
            leftStartPos,
            leftStartLoc,
            minPrec,
            noIn,
        ) {
            if (
                nonNull(tt._in.binop) > minPrec &&
                !this.hasPrecedingLineBreak() &&
                this.isContextual("as")
            ) {
                const node = this.startNodeAt(
                    leftStartPos,
                    leftStartLoc,
                );
                node.expression = left;
                node.typeAnnotation = this.tsNextThenParseType();
                this.finishNode(node, "TSAsExpression");
                return this.parseExprOp(
                    node,
                    leftStartPos,
                    leftStartLoc,
                    minPrec,
                    noIn,
                );
            }

            return super.parseExprOp(left, leftStartPos, leftStartLoc, minPrec, noIn);
        }

        checkReservedWord(
            word, // eslint-disable-line no-unused-vars
            startLoc, // eslint-disable-line no-unused-vars
            checkKeywords, // eslint-disable-line no-unused-vars
            // eslint-disable-next-line no-unused-vars
            isBinding,
        ) {
            // Don't bother checking for TypeScript code.
            // Strict mode words may be allowed as in `declare namespace N { const static; }`.
            // And we have a type checker anyway, so don't bother having the parser do it.
        }

        /**
         * Don't bother doing this check in TypeScript code because:
         * 1. We may have a nested export statement with the same name:
         * export const x = 0;
         * export namespace N {
         * export const x = 1;
         * }
         * 2. We have a type checker to warn us about this sort of thing.
         */
        checkDuplicateExports() { }

        parseImport(node) {
            if (this.match(tt.name) && this.lookahead().type === tt.eq) {
                return this.tsParseImportEqualsDeclaration(node);
            }
            return super.parseImport(node);
        }

        parseExport(node) {
            if (this.match(tt._import)) {
                // `export import A = B;`
                this.expect(tt._import);
                return this.tsParseImportEqualsDeclaration(node, /* isExport */ true);
            } else if (this.eat(tt.eq)) {
                // `export = x;`
                const assign = node;
                assign.expression = this.parseExpression();
                this.semicolon();
                return this.finishNode(assign, "TSExportAssignment");
            } else if (this.eatContextual("as")) {
                // `export as namespace A;`
                const decl = node;
                // See `parseNamespaceExportDeclaration` in TypeScript's own parser
                this.expectContextual("namespace");
                decl.id = this.parseIdentifier();
                this.semicolon();
                return this.finishNode(decl, "TSNamespaceExportDeclaration");
            }
            return super.parseExport(node);

        }

        isAbstractClass() {
            return (
                this.isContextual("abstract") && this.lookahead().type === tt._class
            );
        }

        parseExportDefaultExpression() {
            if (this.isAbstractClass()) {
                const cls = this.startNode();
                this.next(); // Skip "abstract"
                this.parseClass(cls, true, true);
                cls.abstract = true;
                return cls;
            }

            // export default interface allowed in:
            // https://github.com/Microsoft/TypeScript/pull/16040
            if (this.state.value === "interface") {
                const result = this.tsParseDeclaration(
                    this.startNode(),
                    this.state.value,
                    true,
                );

                if (result) {
                    return result;
                }
            }

            return super.parseExportDefaultExpression();
        }

        parseStatementContent(
            declaration,
            topLevel,
        ) {
            if (this.state.type === tt._const) {
                const ahead = this.lookahead();
                if (ahead.type === tt.name && ahead.value === "enum") {
                    const node = this.startNode();
                    this.expect(tt._const);
                    this.expectContextual("enum");
                    return this.tsParseEnumDeclaration(node, /* isConst */ true);
                }
            }
            return super.parseStatementContent(declaration, topLevel);
        }

        parseAccessModifier() {
            return this.tsParseModifier(["public", "protected", "private"]);
        }

        parseClassMember(classBody, member, state) {
            const accessibility = this.parseAccessModifier();
            if (accessibility) {
                member.accessibility = accessibility;
            }

            super.parseClassMember(classBody, member, state);
        }

        parseClassMemberWithIsStatic(classBody, member, state, isStatic) {
            const methodOrProp = member;
            const prop = member;
            const propOrIdx = member;

            let abstract = false;


            let readonly = false;

            const mod = this.tsParseModifier(["abstract", "readonly"]);
            switch (mod) {
                case "readonly":
                    readonly = true;
                    abstract = Boolean(this.tsParseModifier(["abstract"]));
                    break;
                case "abstract":
                    abstract = true;
                    readonly = Boolean(this.tsParseModifier(["readonly"]));
                    break;
            }

            if (abstract) {
                methodOrProp.abstract = true;
            }
            if (readonly) {
                propOrIdx.readonly = true;
            }

            if (!abstract && !isStatic && !methodOrProp.accessibility) {
                const idx = this.tsTryParseIndexSignature(member);
                if (idx) {
                    classBody.body.push(idx);
                    return;
                }
            }

            if (readonly) {
                // Must be a property (if not an index signature).
                methodOrProp.static = isStatic;
                this.parseClassPropertyName(prop);
                this.parsePostMemberNameModifiers(methodOrProp);
                this.pushClassProperty(classBody, prop);
                return;
            }

            super.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
        }

        parsePostMemberNameModifiers(
            methodOrProp,
        ) {
            const optional = this.eat(tt.question);
            if (optional) {
                methodOrProp.optional = true;
            }
        }

        // Note: The reason we do this in `parseExpressionStatement` and not `parseStatement`
        // is that e.g. `type()` is valid JS, so we must try parsing that first.
        // If it's really a type, we will parse `type` as the statement, and can correct it here
        // by parsing the rest.
        parseExpressionStatement(
            node,
            expr,
        ) {
            const decl =
                expr.type === "Identifier"
                    ? this.tsParseExpressionStatement(node, expr)
                    : undefined;
            return decl || super.parseExpressionStatement(node, expr);
        }

        // export type
        // Should be true for anything parsed by `tsTryParseExportDeclaration`.
        shouldParseExportDeclaration() {
            if (this.tsIsDeclarationStart()) {
                return true;
            }
            return super.shouldParseExportDeclaration();
        }

        // An apparent conditional expression could actually be an optional parameter in an arrow function.
        parseConditional(
            expr,
            noIn,
            startPos,
            startLoc,
            refNeedsArrowPos,
        ) {
            // only do the expensive clone if there is a question mark
            // and if we come from inside parens
            if (!refNeedsArrowPos || !this.match(tt.question)) {
                return super.parseConditional(
                    expr,
                    noIn,
                    startPos,
                    startLoc,
                    refNeedsArrowPos,
                );
            }

            const state = this.state.clone();
            try {
                return super.parseConditional(expr, noIn, startPos, startLoc);
            } catch (err) {
                if (!(err instanceof SyntaxError)) {
                    // istanbul ignore next: no such error is expected
                    throw err;
                }

                this.state = state;
                refNeedsArrowPos.start = err.pos || this.state.start;
                return expr;
            }
        }

        // Note: These "type casts" are *not* valid TS expressions.
        // But we parse them here and change them when completing the arrow function.
        parseParenItem(
            node,
            startPos,
            startLoc,
        ) {
            node = super.parseParenItem(node, startPos, startLoc);
            if (this.eat(tt.question)) {
                node.optional = true;
            }

            if (this.match(tt.colon)) {
                const typeCastNode = this.startNodeAt(
                    startPos,
                    startLoc,
                );
                typeCastNode.expression = node;
                typeCastNode.typeAnnotation = this.tsParseTypeAnnotation();

                return this.finishNode(typeCastNode, "TSTypeCastExpression");
            }

            return node;
        }

        parseExportDeclaration(node) {
            // "export declare" is equivalent to just "export".
            const isDeclare = this.eatContextual("declare");

            let declaration;
            if (this.match(tt.name)) {
                declaration = this.tsTryParseExportDeclaration();
            }
            if (!declaration) {
                declaration = super.parseExportDeclaration(node);
            }

            if (declaration && isDeclare) {
                declaration.declare = true;
            }

            return declaration;
        }

        parseClassId(
            node,
            isStatement,
            optionalId,
        ) {
            if ((!isStatement || optionalId) && this.isContextual("implements")) {
                return;
            }

            super.parseClassId(...arguments);
            const typeParameters = this.tsTryParseTypeParameters();
            if (typeParameters) {
                node.typeParameters = typeParameters;
            }
        }

        parseClassProperty(node) {
            if (!node.optional && this.eat(tt.bang)) {
                node.definite = true;
            }

            const type = this.tsTryParseTypeAnnotation();
            if (type) {
                node.typeAnnotation = type;
            }
            return super.parseClassProperty(node);
        }

        pushClassMethod(
            classBody,
            method,
            isGenerator,
            isAsync,
            isConstructor,
        ) {
            const typeParameters = this.tsTryParseTypeParameters();
            if (typeParameters) {
                method.typeParameters = typeParameters;
            }
            super.pushClassMethod(
                classBody,
                method,
                isGenerator,
                isAsync,
                isConstructor,
            );
        }

        pushClassPrivateMethod(
            classBody,
            method,
            isGenerator,
            isAsync,
        ) {
            const typeParameters = this.tsTryParseTypeParameters();
            if (typeParameters) {
                method.typeParameters = typeParameters;
            }
            super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
        }

        parseClassSuper(node) {
            super.parseClassSuper(node);
            if (node.superClass && this.isRelational("<")) {
                node.superTypeParameters = this.tsParseTypeArguments();
            }
            if (this.eatContextual("implements")) {
                node.implements = this.tsParseHeritageClause();
            }
        }

        parseObjPropValue(prop, ...args) {
            if (this.isRelational("<")) {
                throw new Error("TODO");
            }

            super.parseObjPropValue(prop, ...args);
        }

        parseFunctionParams(node, allowModifiers) {
            const typeParameters = this.tsTryParseTypeParameters();
            if (typeParameters) {
                node.typeParameters = typeParameters;
            }
            super.parseFunctionParams(node, allowModifiers);
        }

        // `let x;`
        parseVarHead(decl) {
            super.parseVarHead(decl);
            if (decl.id.type === "Identifier" && this.eat(tt.bang)) {
                decl.definite = true;
            }

            const type = this.tsTryParseTypeAnnotation();
            if (type) {
                decl.id.typeAnnotation = type;
                this.finishNode(decl.id, decl.id.type); // set end position to end of type
            }
        }

        // parse the return type of an async arrow function - let foo = (async () => {});
        parseAsyncArrowFromCallExpression(
            node,
            call,
        ) {
            if (this.match(tt.colon)) {
                node.returnType = this.tsParseTypeAnnotation();
            }
            return super.parseAsyncArrowFromCallExpression(node, call);
        }

        parseMaybeAssign(...args) {
            // Note: When the JSX plugin is on, type assertions (` x`) aren't valid syntax.

            let jsxError;

            if (this.match(tt.jsxTagStart)) {
                const context = this.curContext();
                assert(context === ct.j_oTag);
                // Only time j_oTag is pushed is right after j_expr.
                assert(this.state.context[this.state.context.length - 2] === ct.j_expr);

                // Prefer to parse JSX if possible. But may be an arrow fn.
                const state = this.state.clone();
                try {
                    return super.parseMaybeAssign(...args);
                } catch (err) {
                    if (!(err instanceof SyntaxError)) {
                        // istanbul ignore next: no such error is expected
                        throw err;
                    }

                    this.state = state;
                    // Pop the context added by the jsxTagStart.
                    assert(this.curContext() === ct.j_oTag);
                    this.state.context.pop();
                    assert(this.curContext() === ct.j_expr);
                    this.state.context.pop();
                    jsxError = err;
                }
            }

            if (is.undefined(jsxError) && !this.isRelational("<")) {
                return super.parseMaybeAssign(...args);
            }

            // Either way, we're looking at a '<': tt.jsxTagStart or relational.

            let arrowExpression;
            let typeParameters;
            const state = this.state.clone();
            try {
                // This is similar to TypeScript's `tryParseParenthesizedArrowFunctionExpression`.
                typeParameters = this.tsParseTypeParameters();
                arrowExpression = super.parseMaybeAssign(...args);
                if (arrowExpression.type !== "ArrowFunctionExpression") {
                    this.unexpected(); // Go to the catch block (needs a SyntaxError).
                }
            } catch (err) {
                if (!(err instanceof SyntaxError)) {
                    // istanbul ignore next: no such error is expected
                    throw err;
                }

                if (jsxError) {
                    throw jsxError;
                }

                // Try parsing a type cast instead of an arrow function.
                // This will never happen outside of JSX.
                // (Because in JSX the '<' should be a jsxTagStart and not a relational.
                assert(!this.hasPlugin("jsx"));
                // Parsing an arrow function failed, so try a type cast.
                this.state = state;
                // This will start with a type assertion (via parseMaybeUnary).
                // But don't directly call `this.tsParseTypeAssertion` because we want to handle any binary after it.
                return super.parseMaybeAssign(...args);
            }

            // Correct TypeScript code should have at least 1 type parameter, but don't crash on bad code.
            if (typeParameters && typeParameters.params.length !== 0) {
                this.resetStartLocationFromNode(
                    arrowExpression,
                    typeParameters.params[0],
                );
            }
            arrowExpression.typeParameters = typeParameters;
            return arrowExpression;
        }

        // Handle type assertions
        parseMaybeUnary(refShorthandDefaultPos) {
            if (!this.hasPlugin("jsx") && this.eatRelational("<")) {
                return this.tsParseTypeAssertion();
            }
            return super.parseMaybeUnary(refShorthandDefaultPos);

        }

        parseArrow(node) {
            if (this.match(tt.colon)) {
                // This is different from how the TS parser does it.
                // TS uses lookahead. The Babel Parser parses it as a parenthesized expression and converts.
                const state = this.state.clone();
                try {
                    const returnType = this.tsParseTypeOrTypePredicateAnnotation(
                        tt.colon,
                    );
                    if (this.canInsertSemicolon()) {
                        this.unexpected();
                    }
                    if (!this.match(tt.arrow)) {
                        this.unexpected();
                    }
                    node.returnType = returnType;
                } catch (err) {
                    if (err instanceof SyntaxError) {
                        this.state = state;
                    } else {
                        // istanbul ignore next: no such error is expected
                        throw err;
                    }
                }
            }

            return super.parseArrow(node);
        }

        // Allow type annotations inside of a parameter list.
        parseAssignableListItemTypes(param) {
            if (this.eat(tt.question)) {
                if (param.type !== "Identifier") {
                    throw this.raise(
                        param.start,
                        "A binding pattern parameter cannot be optional in an implementation signature.",
                    );
                }

                param.optional = true;
            }
            const type = this.tsTryParseTypeAnnotation();
            if (type) {
                param.typeAnnotation = type;
            }
            return this.finishNode(param, param.type);
        }

        toAssignable(node, isBinding, contextDescription) {
            switch (node.type) {
                case "TSTypeCastExpression":
                    return super.toAssignable(
                        this.typeCastToParameter(node),
                        isBinding,
                        contextDescription,
                    );
                case "TSParameterProperty":
                    return super.toAssignable(node, isBinding, contextDescription);
                case "TSAsExpression":
                case "TSNonNullExpression":
                case "TSTypeAssertion":
                    node.expression = this.toAssignable(
                        node.expression,
                        isBinding,
                        contextDescription,
                    );
                    return node;
                default:
                    return super.toAssignable(node, isBinding, contextDescription);
            }
        }

        checkLVal(expr, isBinding, checkClashes, contextDescription) {
            switch (expr.type) {
                case "TSTypeCastExpression":
                    // Allow "typecasts" to appear on the left of assignment expressions,
                    // because it may be in an arrow function.
                    // e.g. `const f = (foo = 0) => foo;`
                    return;
                case "TSParameterProperty":
                    this.checkLVal(
                        expr.parameter,
                        isBinding,
                        checkClashes,
                        "parameter property",
                    );
                    return;
                case "TSAsExpression":
                case "TSNonNullExpression":
                case "TSTypeAssertion":
                    this.checkLVal(
                        expr.expression,
                        isBinding,
                        checkClashes,
                        contextDescription,
                    );
                    return;
                default:
                    super.checkLVal(expr, isBinding, checkClashes, contextDescription);

            }
        }

        parseBindingAtom() {
            switch (this.state.type) {
                case tt._this:
                    // "this" may be the name of a parameter, so allow it.
                    return this.parseIdentifier(/* liberal */ true);
                default:
                    return super.parseBindingAtom();
            }
        }

        // === === === === === === === === === === === === === === === ===
        // Note: All below methods are duplicates of something in flow.js.
        // Not sure what the best way to combine these is.
        // === === === === === === === === === === === === === === === ===

        isClassMethod() {
            return this.isRelational("<") || super.isClassMethod();
        }

        isClassProperty() {
            return (
                this.match(tt.bang) || this.match(tt.colon) || super.isClassProperty()
            );
        }

        parseMaybeDefault(...args) {
            const node = super.parseMaybeDefault(...args);

            if (
                node.type === "AssignmentPattern" &&
                node.typeAnnotation &&
                node.right.start < node.typeAnnotation.start
            ) {
                this.raise(
                    node.typeAnnotation.start,
                    "Type annotations must come before default assignments, " +
                    "e.g. instead of `age = 25` use `age = 25`",
                );
            }

            return node;
        }

        // ensure that inside types, we bypass the jsx parser plugin
        readToken(code) {
            if (this.state.inType && (code === 62 || code === 60)) {
                return this.finishOp(tt.relational, 1);
            }
            return super.readToken(code);

        }

        toAssignableList(
            exprList,
            isBinding,
            contextDescription,
        ) {
            for (let i = 0; i < exprList.length; i++) {
                const expr = exprList[i];
                if (expr && expr.type === "TSTypeCastExpression") {
                    exprList[i] = this.typeCastToParameter(expr);
                }
            }
            return super.toAssignableList(exprList, isBinding, contextDescription);
        }

        typeCastToParameter(node) {
            node.expression.typeAnnotation = node.typeAnnotation;

            return this.finishNodeAt(
                node.expression,
                node.expression.type,
                node.typeAnnotation.end,
                node.typeAnnotation.loc.end,
            );
        }

        toReferencedList(exprList) {
            for (let i = 0; i < exprList.length; i++) {
                const expr = exprList[i];
                if (
                    expr &&
                    expr._exprListItem &&
                    expr.type === "TsTypeCastExpression"
                ) {
                    this.raise(expr.start, "Did not expect a type annotation here.");
                }
            }

            return exprList;
        }

        shouldParseArrow() {
            return this.match(tt.colon) || super.shouldParseArrow();
        }

        shouldParseAsyncArrow() {
            return this.match(tt.colon) || super.shouldParseAsyncArrow();
        }

        canHaveLeadingDecorator() {
            // Avoid unnecessary lookahead in checking for abstract class unless needed!
            return super.canHaveLeadingDecorator() || this.isAbstractClass();
        }

        jsxParseOpeningElementAfterName(node) {
            const typeArguments = this.tsTryParseAndCatch(() =>
                this.tsParseTypeArguments(),
            );
            if (typeArguments) {
                node.typeParameters = typeArguments;
            }
            return super.jsxParseOpeningElementAfterName(node);
        }
    };
