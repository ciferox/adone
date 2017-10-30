export default class TryFlow extends adone.task.Flow {
    async _run(...args) {
        let result;

        await this._iterate(args, async (name, observer) => {
            try {
                result = await observer.result;
                return true;
            } catch (err) {
                //
            }
        });

        return result;
    }
}
