const {
    fast,
    is,
    std
} = adone;

export default class WatchTask extends adone.project.task.Transform {
    initialize(params) {
        this.targetTask = this.manager.getTaskInstance(params.$task);
        this.stream = fast.watch(params.$src, {
            cwd: this.manager.path,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });
        
        return super.initialize(params);
    }

    main(params) {
        if (!is.null(this.stream)) {
            this.stream.dest(params.$dst);
        }
    }

    transform(stream, params) {
        return this.targetTask.transform(stream, params);
    }

    notify(stream, params) {
        if (!is.null(stream)) {
            stream.notify({
                onLast: false,
                title: params.$dst,
                filter: (file) => file.extname !== ".map",
                message: (file) => std.path.relative(process.cwd(), file.path)
            });
        }
    }
}
