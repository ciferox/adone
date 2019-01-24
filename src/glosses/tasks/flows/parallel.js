const {
    is
} = adone;

/**
 * This flow run the tasks in parallel, without waiting until the previous task has completed.
 * If any of the task throw, the remaining tasks will continue to be performed, but in this case results of these tasks will be unavailable.
 * Once the tasks have completed, the results are passed as object where keys are names of the tasks and values are results.
 */
export default class ParallelFlow extends adone.task.Flow {
    async _run() {
        const results = {};
        const promises = [];
        await this._iterate((observer) => {
            let result = observer.result;
            if (!is.promise(result)) {
                result = Promise.resolve(result);
            }
            
            result.then((result) => {
                results[observer.taskName] = result;
            }).catch(adone.noop);
            promises.push(result);
        });

        await Promise.all(promises);

        return results;
    }

    isCancelable() {
        if (this.tasks.length !== this.observers.length) {
            return false;
        }

        for (const observer of this.observers) {
            if (!observer.isCancelable()) {
                return false;
            }
        }
        
        return true;
    }

    cancel(defer) {
        const promises = [];
        for (const observer of this.observers) {
            promises.push(observer.cancel());
        }

        return Promise.all(promises).then(() => defer.resolve());

    }
}
