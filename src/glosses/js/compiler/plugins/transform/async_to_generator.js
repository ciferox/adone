export default function () {
    return {
        inherits: adone.js.compiler.plugin.syntax.asyncFunctions,

        visitor: {
            Function(path, state) {
                if (!path.node.async || path.node.generator) {
                    return;
                }

                adone.js.compiler.helper.remapAsyncToGenerator(path, state.file, {
                    wrapAsync: state.addHelper("asyncToGenerator"),
                });
            },
        },
    };
}
