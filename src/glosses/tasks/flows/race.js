export default class RaceFlow extends adone.task.Flow {
    async _run(...args) {
        const promises = [];
        
        await this._iterate(args, (name, observer) => {
            promises.push(observer.result);
        });

        return Promise.race(promises);
    }
}
