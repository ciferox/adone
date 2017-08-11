const { js: { compiler: { helpers: { functionName } } } } = adone;

export default function () {
    return {
        visitor: {
            FunctionExpression: {
                exit(path) {
                    if (path.key !== "value" && !path.parentPath.isObjectProperty()) {
                        const replacement = functionName(path);
                        if (replacement) {
                            path.replaceWith(replacement);
                        }
                    }
                }
            },

            ObjectProperty(path) {
                const value = path.get("value");
                if (value.isFunction()) {
                    const newNode = functionName(value);
                    if (newNode) {
                        value.replaceWith(newNode);
                    }
                }
            }
        }
    };
}
