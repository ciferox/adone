const {
    js: { compiler: { types: t, helper: { pluginUtils } } }
} = adone;

export default pluginUtils.declare((api) => {
    api.assertVersion(7);

    return {
        visitor: {
            Program(path) {
                const { node } = path;

                for (const directive of (node.directives)) {
                    if (directive.value.value === "use strict") {
                        return;
                    }
                }

                path.unshiftContainer(
                    "directives",
                    t.directive(t.directiveLiteral("use strict")),
                );
            }
        }
    };
});
