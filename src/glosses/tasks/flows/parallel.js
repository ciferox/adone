const {
    is
} = adone;

export default class ParallelFlow extends adone.task.Flow {
    async _run(...args) {
        const results = {};
        const promises = [];
        await this._iterate(args, (name, observer) => {
            let result = observer.result;
            if (!is.promise(result)) {
                result = Promise.resolve(result);
            }
            
            result.then((result) => {
                results[name] = result;
            });
            promises.push(result);
        });

        await Promise.all(promises);

        return results;
    }
}
