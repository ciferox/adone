const {
    event: { EventEmitter },
    util
} = adone;

export default class ChangesHandler extends EventEmitter {
    constructor() {
        super();
        this._listeners = {};
    }

    addListener(dbName, id, db, opts) {
        /* istanbul ignore if */
        if (this._listeners[id]) {
            return;
        }
        const self = this;
        let inprogress = false;
        const eventFunction = () => {
            /* istanbul ignore if */
            if (!self._listeners[id]) {
                return;
            }
            if (inprogress) {
                inprogress = "waiting";
                return;
            }
            inprogress = true;
            const changesOpts = util.pick(opts, [
                "style", "include_docs", "attachments", "conflicts", "filter",
                "doc_ids", "view", "since", "query_params", "binary"
            ]);

            /* istanbul ignore next */
            const onError = () => {
                inprogress = false;
            };

            db.changes(changesOpts).on("change", (c) => {
                if (c.seq > opts.since && !opts.cancelled) {
                    opts.since = c.seq;
                    opts.onChange(c);
                }
            }).on("complete", () => {
                if (inprogress === "waiting") {
                    process.nextTick(eventFunction);
                }
                inprogress = false;
            }).on("error", onError);
        };
        this._listeners[id] = eventFunction;
        this.on(dbName, eventFunction);
    }

    removeListener(dbName, id) {
        /* istanbul ignore if */
        if (!(id in this._listeners)) {
            return;
        }
        EventEmitter.prototype.removeListener.call(this, dbName,
            this._listeners[id]);
        delete this._listeners[id];
    }

    notify(dbName) {
        this.emit(dbName);
    }
}
