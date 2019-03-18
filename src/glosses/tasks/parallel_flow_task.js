const {
    is,
    noop
} = adone;

/**
 * This flow run the tasks in parallel, without waiting until the previous task has completed.
 * If any of the task throw, the remaining tasks will continue to be performed, but in this case results of these tasks will be unavailable.
 * Once the tasks have completed, the results are passed as object where keys are names of the tasks and values are results.
 */
export default class ParallelFlowTask extends adone.task.FlowTask {
    async main() {
        const results = {};
        const promises = [];
        await this._iterate((observer) => {
            let result = observer.result;
            if (!is.promise(result)) {
                result = Promise.resolve(result);
            }
            
            result.then((result) => {
                results[observer.taskName] = result;
            }).catch(noop);
            promises.push(result);
        });

        await Promise.all(promises);

        return results;
    }

    /**
     * Cancel only cancelable tasks and await result of non-cancelable.
     */
    cancel(defer) {
        const promises = [];
        for (const observer of this.observers) {
            if (observer.cancelable) {
                promises.push(observer.cancel());
            } else {
                promises.push(observer.result);
            }
        }

        return Promise.all(promises).then(() => defer.resolve());

    }
}
