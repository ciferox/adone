const { js: { compiler: { types } } } = adone;

export default function (ast, comments, tokens) {
    if (ast) {
        if (ast.type === "Program") {
            return types.file(ast, comments || [], tokens || []);
        } else if (ast.type === "File") {
            return ast;
        }
    }

    throw new Error("Not a valid ast?");
}
