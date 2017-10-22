export default class TranspileTask extends adone.project.task.Transform {
    transform(stream, params) {
        const transpileOptions = {
            sourceMap: true,
            plugins: this.plugins(params)
        };
        return stream.sourcemapsInit()
            .transpile(transpileOptions)
            .sourcemapsWrite(".", {
                destPath: params.$dst
            });
    }

    plugins() {
        return [
            "transform.flowStripTypes",
            "transform.decorators",
            ["transform.classProperties", { loose: true }],
            "transform.es2015ModulesCommonjs",
            "transform.functionBind",
            "transform.objectRestSpread",
            "transform.numericSeparator",
            "transform.exponentiationOperator"
        ];
    }
}
