const {
    project
} = adone;

export default class DefaultProjectTask extends project.generator.task.Base {
    async run({
        skipGit = this.context.flag.skipGit,
        skipEslint = this.context.flag.skipEslint,
        skipJsconfig = this.context.flag.skipJsconfig
    } = {}) {
        const tasks = ["adoneConfig"];
        
        if (!skipJsconfig) {
            tasks.push("jsconfig");
        }

        if (!skipEslint) {
            tasks.push("eslint");
        }
        
        if (!skipGit) {
            tasks.push("git");
        }
        
        const observer = await this.manager.runInSeries(tasks, null, {
            cwd: this.context.project.cwd
        });
        return observer.result;
    }
}
