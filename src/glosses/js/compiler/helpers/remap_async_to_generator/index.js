/* @noflow */

import rewriteForAwait from "./for-await";

const {
    js: { compiler: { types: t } }
} = adone;

const awaitVisitor = {
    Function(path) {
        path.skip();
    },

    AwaitExpression(path, { wrapAwait }) {
        const argument = path.get("argument");

        if (path.parentPath.isYieldExpression()) {
            path.replaceWith(argument.node);
            return;
        }

        path.replaceWith(
            t.yieldExpression(
                wrapAwait
                    ? t.callExpression(wrapAwait, [argument.node])
                    : argument.node,
            ),
        );
    },

    ForOfStatement(path, { file, wrapAwait }) {
        const { node } = path;
        if (!node.await) {
            return;
        }

        const build = rewriteForAwait(path, {
            getAsyncIterator: file.addHelper("asyncIterator"),
            wrapAwait
        });

        const { declar, loop } = build;
        const block = loop.body;

        // ensure that it's a block so we can take all its statements
        path.ensureBlock();

        // add the value declaration to the new loop body
        if (declar) {
            block.body.push(declar);
        }

        // push the rest of the original loop body onto our new body
        block.body = block.body.concat(node.body.body);

        t.inherits(loop, node);
        t.inherits(loop.body, node.body);

        if (build.replaceParent) {
            path.parentPath.replaceWithMultiple(build.node);
        } else {
            path.replaceWithMultiple(build.node);
        }
    }
};

export default function (path, file: Object, helpers: Object) {
    path.traverse(awaitVisitor, {
        file,
        wrapAwait: helpers.wrapAwait
    });

    path.node.async = false;
    path.node.generator = true;

    adone.js.compiler.helper.wrapFunction(path, helpers.wrapAsync);
}
