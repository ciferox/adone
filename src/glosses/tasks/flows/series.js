const {
    is
} = adone;

/**
 * This flow run the tasks in series, each one running once the previous task has completed.
 * If any task in the series throw, no more tasks are run.
 * If all tasks has finished, the result will be an array of all tasks results.
 */
export default class SeriesFlow extends adone.task.Flow {
    async _run() {
        const results = [];
        this._activeObserver = null;
        this._shouldStop = false;

        await this._iterate(async (observer) => {
            if (!this._shouldStop) {
                this._activeObserver = observer;
                results.push(await observer.result);
            }
        });

        return results;
    }

    isCancelable() {
        return !is.null(this._activeObserver) && this._activeObserver.isCancelable();
    }

    cancel(defer) {
        this._shouldStop = true;
        return this._activeObserver.cancel().then(() => defer.resolve());
    }
}
