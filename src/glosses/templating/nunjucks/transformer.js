import * as nodes from "./nodes";

let sym = 0;
const gensym = () => `hole_${sym++}`;

const mapCOW = (arr, func) => {
    let res = null;

    for (let i = 0; i < arr.length; i++) {
        const item = func(arr[i]);

        if (item !== arr[i]) {
            if (!res) {
                res = arr.slice();
            }

            res[i] = item;
        }
    }

    return res || arr;
};

const walk = (ast, func, depthFirst) => {
    if (!(ast instanceof nodes.Node)) {
        return ast;
    }

    if (!depthFirst) {
        const astT = func(ast);

        if (astT && astT !== ast) {
            return astT;
        }
    }

    if (ast instanceof nodes.NodeList) {
        const children = mapCOW(ast.children, (node) => {
            return walk(node, func, depthFirst);
        });

        if (children !== ast.children) {
            ast = new nodes[ast.typename](ast.lineno, ast.colno, children);
        }
    } else if (ast instanceof nodes.CallExtension) {
        const args = walk(ast.args, func, depthFirst);

        const contentArgs = mapCOW(ast.contentArgs, (node) => walk(node, func, depthFirst));

        if (args !== ast.args || contentArgs !== ast.contentArgs) {
            ast = new nodes[ast.typename](ast.extName, ast.prop, args, contentArgs);
        }
    } else {
        const props = ast.fields.map((field) => ast[field]);

        const propsT = mapCOW(props, (prop) => walk(prop, func, depthFirst));

        if (propsT !== props) {
            ast = new nodes[ast.typename](ast.lineno, ast.colno);

            for (let i = 0; i < propsT.length; ++i) {
                ast[ast.fields[i]] = propsT[i];
            }
        }
    }

    return depthFirst ? (func(ast) || ast) : ast;
};

const depthWalk = (ast, func) => walk(ast, func, true);

const _liftFilters = (node, asyncFilters, prop) => {
    const children = [];

    const walked = depthWalk(prop ? node[prop] : node, (node) => {
        if (node instanceof nodes.Block) {
            return node;
        }
        if ((node instanceof nodes.Filter && asyncFilters.includes(node.name.value)) ||
            node instanceof nodes.CallExtensionAsync) {
            const symbol = new nodes.Symbol(node.lineno, node.colno, gensym());
            children.push(new nodes.FilterAsync(
                node.lineno,
                node.colno,
                node.name,
                node.args,
                symbol
            ));
            return symbol;
        }
    });

    if (prop) {
        node[prop] = walked;
    } else {
        node = walked;
    }

    if (children.length) {
        children.push(node);

        return new nodes.NodeList(
            node.lineno,
            node.colno,
            children
        );
    }

    return node;
};

const liftFilters = (ast, asyncFilters) => {
    return depthWalk(ast, (node) => {
        if (node instanceof nodes.Output) {
            return _liftFilters(node, asyncFilters);
        }

        if (node instanceof nodes.Set) {
            return _liftFilters(node, asyncFilters, "value");
        }

        if (node instanceof nodes.For) {
            return _liftFilters(node, asyncFilters, "arr");
        }

        if (node instanceof nodes.If) {
            return _liftFilters(node, asyncFilters, "cond");
        }

        if (node instanceof nodes.CallExtension) {
            return _liftFilters(node, asyncFilters, "args");
        }
    });
};

const liftSuper = (ast) => walk(ast, (blockNode) => {
    if (!(blockNode instanceof nodes.Block)) {
        return;
    }

    let hasSuper = false;
    const symbol = gensym();

    blockNode.body = walk(blockNode.body, (node) => {
        if (node instanceof nodes.FunCall &&
            node.name.value === "super") {
            hasSuper = true;
            return new nodes.Symbol(node.lineno, node.colno, symbol);
        }
    });

    if (hasSuper) {
        blockNode.body.children.unshift(new nodes.Super(
            0, 0, blockNode.name, new nodes.Symbol(0, 0, symbol)
        ));
    }
});

const convertStatements = (ast) => depthWalk(ast, (node) => {
    if (!(node instanceof nodes.If) &&
        !(node instanceof nodes.For)) {
        return;
    }

    let async = false;
    walk(node, (node) => {
        if (node instanceof nodes.FilterAsync ||
            node instanceof nodes.IfAsync ||
            node instanceof nodes.AsyncEach ||
            node instanceof nodes.AsyncAll ||
            node instanceof nodes.CallExtensionAsync) {
            async = true;
            // Stop iterating by returning the node
            return node;
        }
    });

    if (async) {
        if (node instanceof nodes.If) {
            return new nodes.IfAsync(
                node.lineno,
                node.colno,
                node.cond,
                node.body,
                node.else_
            );
        } else if (node instanceof nodes.For) {
            return new nodes.AsyncEach(
                node.lineno,
                node.colno,
                node.arr,
                node.name,
                node.body,
                node.else_
            );
        }
    }
});

const cps = (ast, asyncFilters) => convertStatements(liftSuper(liftFilters(ast, asyncFilters)));

export const transform = (ast, asyncFilters) => cps(ast, asyncFilters || []);
