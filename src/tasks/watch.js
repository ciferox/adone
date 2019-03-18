const {
    fast,
    is,
    std,
    realm: { BaseTask, TransformTask }
} = adone;

class WatchTask extends TransformTask {
    streamOptions() {
        return {
            ...super.streamOptions(),
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        };
    }

    initialize(params) {
        this.targetTask = this.manager.getTaskInstance(params.task);
        // const watcherOptions = {};

        // uses a lot of processor time...
        // if (!is.glob(params.src)) {
        //     watcherOptions.usePolling = true;
        //     watcherOptions.interval = 250;
        // }
        this.stream = fast.watch(params.src, {
            ...this.streamOptions(),
            // ...watcherOptions
        });

        return super.initialize(params);
    }

    main(params) {
        if (!is.null(this.stream)) {
            this.stream.dest(params.dst);
        }
    }

    transform(stream, params) {
        return this.targetTask.transform(stream, params);
    }

    notify(stream, params) {
        if (!is.null(stream)) {
            stream.notify({
                onLast: false,
                title: `${this.manager.package.name}.${params.id}`,
                filter: (file) => file.extname !== ".map",
                message: (file) => std.path.relative(process.cwd(), file.path),
                debounce: {
                    timeout: 500,
                    leading: true,
                    trailing: true
                }
            });
        }
    }

    cancel(defer) {
        !is.null(this.stream) && this.stream.destroy();
        defer.resolve();
    }

    isCancelable() {
        return true;
    }
}

export default class extends BaseTask {
    async main(path) {
        const observer = await adone.task.runParallel(this.manager, this.manager.getEntries({ path }).map((entry) => ({
            task: WatchTask,
            args: entry
        })));
        return observer.result;
    }
}
