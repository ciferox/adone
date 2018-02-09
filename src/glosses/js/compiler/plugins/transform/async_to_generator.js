const {
    js: { compiler: { types: t, helper: { moduleImports } } }
} = adone;

export default function (api, options) {
    const { method, module } = options;

    if (method && module) {
        return {
            visitor: {
                Function(path, state) {
                    if (!path.node.async || path.node.generator) {
                        return;
                    }

                    let wrapAsync = state.methodWrapper;
                    if (wrapAsync) {
                        wrapAsync = t.cloneNode(wrapAsync);
                    } else {
                        wrapAsync = state.methodWrapper = moduleImports.addNamed(path, method, module);
                    }

                    adone.js.compiler.helper.remapAsyncToGenerator(path, state.file, {
                        wrapAsync
                    });
                }
            }
        };
    }

    return {
        visitor: {
            Function(path, state) {
                if (!path.node.async || path.node.generator) {
                    return;
                }

                adone.js.compiler.helper.remapAsyncToGenerator(path, state.file, {
                    wrapAsync: state.addHelper("asyncToGenerator")
                });
            }
        }
    };
}
