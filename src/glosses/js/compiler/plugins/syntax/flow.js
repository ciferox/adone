const {
    is
} = adone;

export default adone.js.compiler.helper.pluginUtils.declare((api, options) => {
    api.assertVersion(7);

    // When enabled and plugins includes flow, all files should be parsed as if
    // the @flow pragma was provided.
    const { all } = options;

    if (!is.boolean(all) && !is.undefined(all)) {
        throw new Error(".all must be a boolean, or undefined");
    }

    return {
        name: "syntax-flow",

        manipulateOptions(opts, parserOpts) {
            // If the file has already enabled TS, assume that this is not a
            // valid Flowtype file.
            if (
                parserOpts.plugins.some(
                    (p) => (is.array(p) ? p[0] : p) === "typescript",
                )
            ) {
                return;
            }

            parserOpts.plugins.push(["flow", { all }]);
        }
    };
});
