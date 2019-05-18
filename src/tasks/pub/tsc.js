@adone.task.task("tsc")
export default class TSCompileTask extends adone.realm.TransformTask {
    transform(stream, params) {
        const transpileOptions = {
            cwd: adone.path.join(this.manager.cwd, adone.glob.parent(params.src)),
            sourceMap: true,
            ...adone.util.omit(params, ["original", "description", "src", "dst", "task"])
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
