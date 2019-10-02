const {
	acorn
} = adone;

const { Parser } = acorn;

export const parse = (source: string) => Parser.parse(source, {
	sourceType: 'module',
	// @ts-ignore TODO pending release of fixed types
	ecmaVersion: 11,
	preserveParens: true
});

export const parse_expression_at = (source: string, index: number) => Parser.parseExpressionAt(source, index, {
	// @ts-ignore TODO pending release of fixed types
	ecmaVersion: 11,
	preserveParens: true
});