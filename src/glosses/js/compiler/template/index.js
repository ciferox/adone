const {
    vendor: { lodash: { cloneDeep } },
    js: { compiler: { types, traverse, parse } }
} = adone;

const FROM_TEMPLATE = "_fromTemplate"; //Symbol(); // todo: probably wont get copied over
const TEMPLATE_SKIP = Symbol();

const templateVisitor = {
    // 360
    noScope: true,

    enter(path, args) {
        let { node } = path;
        if (node[TEMPLATE_SKIP]) {
            return path.skip();
        }

        if (types.isExpressionStatement(node)) {
            node = node.expression;
        }

        let replacement;

        if (types.isIdentifier(node) && node[FROM_TEMPLATE]) {
            if (node.name in args[0]) {
                replacement = args[0][node.name];
            } else if (node.name[0] === "$") {
                const i = Number(node.name.slice(1));
                if (args[i]) {
                    replacement = args[i];
                }
            }
        }

        if (replacement === null) {
            path.remove();
        }

        if (replacement) {
            replacement[TEMPLATE_SKIP] = true;
            path.replaceInline(replacement);
        }
    },

    exit({ node }) {
        if (!node.loc) {
            traverse.clearNode(node);
        }
    }
};

const useTemplate = (ast, nodes) => {
    ast = cloneDeep(ast);
    const { program } = ast;

    if (nodes.length) {
        traverse(ast, templateVisitor, null, nodes);
    }

    if (program.body.length > 1) {
        return program.body;
    }
    return program.body[0];

};

export default function (code, opts) {
    // since we lazy parse the template, we get the current stack so we have the
    // original stack to append if it errors when parsing
    let stack;
    try {
        // error stack gets populated in IE only on throw (https://msdn.microsoft.com/en-us/library/hh699850(v=vs.94).aspx)
        throw new Error();
    } catch (error) {
        if (error.stack) {
            // error.stack does not exists in IE <= 9
            stack = error.stack.split("\n").slice(1).join("\n");
        }
    }

    opts = Object.assign({
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        pre0serveComments: false
    }, opts);

    let getAst = function () {
        let ast;

        try {
            ast = parse(code, opts);

            ast = traverse.removeProperties(ast, { preserveComments: opts.preserveComments });

            traverse.cheap(ast, (node) => {
                node[FROM_TEMPLATE] = true;
            });
        } catch (err) {
            err.stack = `${err.stack}from\n${stack}`;
            throw err;
        }

        getAst = function () {
            return ast;
        };

        return ast;
    };

    return function (...args) {
        return useTemplate(getAst(), args);
    };
}
