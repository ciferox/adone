export default class extends adone.realm.TransformTask {
    transform(stream, params) {
        const transpileOptions = {
            sourceMap: true,
            plugins: this.plugins(params)
        };
        return stream.sourcemapsInit()
            .transpile(transpileOptions)
            .sourcemapsWrite(".", {
                destPath: params.dst
            });
    }

    plugins() {
        return [
            "transform.flowStripTypes",
            ["transform.decorators", {
                legacy: true
            }],
            ["transform.classProperties", { loose: true }],
            "transform.modulesCommonjs",
            "transform.functionBind",
            "transform.objectRestSpread",
            "transform.numericSeparator",
            "transform.exponentiationOperator"
        ];
    }
}
