const {
    is,
    fast
} = adone;

export default class TransformTask extends adone.project.task.Base {
    constructor() {
        super();
        this.stream = null;
    }

    initialize(params) {
        if (is.null(this.stream)) {
            this.stream = fast.src(params.$src, {
                cwd: this.manager.path
            });
        }

        this.stream = this.transform(this.stream, params);
        this.notify(this.stream, params);
        this.notifyError(this.stream, params);
    }

    main(params) {
        if (is.fastLocalStream(this.stream)) {
            return this.stream.dest(params.$dst);
        }
    }

    transform(stream) {
        return stream;
    }

    notify(stream, params) {
        if (is.fastLocalStream(stream)) {
            stream.notify({
                onLast: true,
                title: params.$dst,
                filter: null,
                message: "Done"
            });
        }
    }

    notifyError(stream, params) {
        if (is.fastLocalStream(stream)) {
            stream.on("error", fast.plugin.notify.onError({
                title: params.$dst,
                message: (error) => error.message
            }));
        }
    }
}
