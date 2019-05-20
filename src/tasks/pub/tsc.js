@adone.task.task("tsc")
export default class TSCompileTask extends adone.realm.TransformTask {
    transform(stream, params) {
        const transpileOptions = {
            cwd: adone.path.join(this.manager.cwd, adone.glob.parent(params.src)),
            sourceMap: true,
            compilerOptions: {
                target: "es6",
                lib: ["es5", "es6", "dom"],
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                moduleResolution: "node",
                module: "commonjs",
                ...params.compilerOptions
            },
            ...adone.util.omit(params, ["id", "original", "description", "src", "dst", "task", "realm", "cwd", "compilerOptions"])
        };
        return stream
            .sourcemapsInit()
            .tscompile(transpileOptions)
            .sourcemapsWrite(".", {
                addComment: false,
                destPath: params.dst
            });
    }
}
