export default class WaterfallFlow extends adone.task.Flow {
    async _run(...args) {
        let result = args;

        for (const task of this.tasks) {
            const [, observer] = await this._runTask(task, adone.util.arrify(result)); // eslint-disable-line
            result = await observer.result; // eslint-disable-line
        }

        return result;
    }
}
