@adone.task.task("build")
export default class extends adone.realm.BaseTask {
    async main({ path } = {}) {
        const observer = await adone.task.runParallel(this.manager, this.manager.devConfig.getUnits(path).map((unit) => ({
            task: unit.task,
            args: unit
        })));
        return observer.result;
    }
}
