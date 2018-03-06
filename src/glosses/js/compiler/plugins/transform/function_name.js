const {
    js: { compiler: { helper: { functionName: nameFunction, pluginUtils } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        visitor: {
            FunctionExpression: {
                exit(path) {
                    if (path.key !== "value" && !path.parentPath.isObjectProperty()) {
                        const replacement = nameFunction(path);
                        if (replacement) {
                            path.replaceWith(replacement);
                        }
                    }
                }
            },

            ObjectProperty(path) {
                const value = path.get("value");
                if (value.isFunction()) {
                    const newNode = nameFunction(value);
                    if (newNode) {
                        value.replaceWith(newNode);
                    }
                }
            }
        }
    };
});
