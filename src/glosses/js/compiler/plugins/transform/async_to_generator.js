export default function () {
    return {
        inherits: adone.js.compiler.plugin.syntax.asyncFunctions,

        visitor: {
            Function(path, state) {
                if (!path.node.async || path.node.generator) {
                    return;
                }

                // Ensure any Promise bindings at the Program level are renamed
                // so the asyncToGenerator helper only sees the native Promise
                const programScope = path.scope.getProgramParent();
                if (programScope.hasBinding("Promise", true)) {
                    programScope.rename("Promise");
                }

                adone.js.compiler.helper.remapAsyncToGenerator(path, state.file, {
                    wrapAsync: state.addHelper("asyncToGenerator"),
                });
            },
        },
    };
}
