// @flow


const { types } = adone.js.compiler;

export default function (
    ast: Object,
    comments?: Object[],
    tokens?: Object[],
) {
    if (ast) {
        if (ast.type === "Program") {
            return types.file(ast, comments || [], tokens || []);
        } else if (ast.type === "File") {
            return ast;
        }
    }

    throw new Error("Not a valid ast?");
}
