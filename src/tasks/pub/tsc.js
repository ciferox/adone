@adone.task.task("tsc")
export default class TSCompileTask extends adone.realm.TransformTask {
    transform(stream, params) {
        const transpileOptions = {
            cwd: this.manager.cwd,
            sourceMap: true
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
