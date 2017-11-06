export default function () {
    return {
        visitor: {
            FunctionExpression: {
                exit(path) {
                    if (path.key !== "value" && !path.parentPath.isObjectProperty()) {
                        const replacement = adone.js.compiler.helper.functionName(path);
                        if (replacement) { 
                            path.replaceWith(replacement); 
                        }
                    }
                }
            },

            ObjectProperty(path) {
                const value = path.get("value");
                if (value.isFunction()) {
                    const newNode = adone.js.compiler.helper.functionName(value);
                    if (newNode) { 
                        value.replaceWith(newNode); 
                    }
                }
            }
        }
    };
}
