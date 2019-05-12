const {
    is
} = adone;

@adone.task.task("build")
export default class extends adone.realm.BaseTask {
    async main({ path } = {}) {
        const { platform } = process;
        const observer = await adone.task.runParallel(this.manager, this.manager.devConfig.getUnits(path).filter((unit) => {
            const { platform: p } = unit;
            if (is.undefined(p)) {
                return true;
            }
            const pparts = p.split(",");
            return pparts.includes(platform);
        }).map((unit) => ({
            task: unit.task,
            args: unit
        })));
        return observer.result;
    }
}
