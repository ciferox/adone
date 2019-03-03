export default class extends adone.realm.BaseTask {
    async main(path) {
        const observer = await this.manager.runInParallel(this.manager.getEntries({ path }).map((entry) => ({
            task: entry.task,
            args: entry
        })));
        return observer.result;
    }
}
