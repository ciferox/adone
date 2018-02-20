const {
    is,
    fast
} = adone;

export default class TransformTask extends adone.project.task.Base {
    constructor() {
        super();
        this.stream = null;
    }

    /**
     * This method in which you can define the options that will be used in the fast stream
     */
    streamOptions() {
        return {
            cwd: this.manager.cwd
        };
    }

    initialize(params) {
        if (is.null(this.stream)) {
            this.stream = fast.src(params.src, this.streamOptions());
        }

        this.stream = this.transform(this.stream, params);
        if (!this.manager.silent) {
            this.notify(this.stream, params);
            this.notifyError(this.stream, params);
        }
    }

    main(params) {
        if (is.fastLocalStream(this.stream)) {
            return this.stream.dest(params.dst);
        }
    }

    transform(stream) {
        return stream;
    }

    notify(stream, params) {
        if (is.fastLocalStream(stream)) {
            stream.notify({
                onLast: true,
                title: params.id,
                filter: null,
                message: params.task
            });
        }
    }

    notifyError(stream, params) {
        if (is.fastLocalStream(stream)) {
            const notify = fast.plugin.notify.onError({
                title: params.id,
                message: (error) => error.message
            });
            stream.on("error", (err) => {
                try {
                    notify(err);
                } catch (notifyErr) {
                    adone.logWarn(`Could not notify about an error due to: ${notifyErr.message}`);
                    adone.logError(err.stack || err.message);
                }
            });
        }
    }
}
