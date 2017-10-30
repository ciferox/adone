export default class SeriesFlow extends adone.task.Flow {
    async _run(...args) {
        const results = [];

        await this._iterate(args, async (name, observer) => {
            results.push(await observer.result);
        });

        return results;
    }
}
