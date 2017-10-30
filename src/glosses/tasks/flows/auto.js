export default class AutoFlow extends adone.task.Flow {
    async run(tasks, ...args) {
        this._checkTasks(tasks);

        const results = {};
        const promises = [];
        for (const name of tasks) {
            const observer = await this.manager.run(name, ...args); // eslint-disable-line
            promises.push(observer.result.then((result) => {
                results[name] = result;
            }));
        }

        await Promise.all(promises);

        return results;
    }
}
