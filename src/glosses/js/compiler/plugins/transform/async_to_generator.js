const {
    js: { compiler: { types: t, helper: { moduleImports, remapAsyncToGenerator, pluginUtils } } }
} = adone;

export default pluginUtils.declare((api, options) => {
    api.assertVersion(7);

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

                    remapAsyncToGenerator(path, { wrapAsync });
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

                remapAsyncToGenerator(path, {
                    wrapAsync: state.addHelper("asyncToGenerator")
                });
            }
        }
    };
});
