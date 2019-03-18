/**
 * This flow run the tasks in parallel, and returns the result of first completed task or throw if task is rejected.
 */
export default class RaceFlow extends adone.task.FlowTask {
    async main() {
        const promises = [];
        
        await this._iterate((observer) => {
            promises.push(observer.result);
        });

        return Promise.race(promises);
    }
}
