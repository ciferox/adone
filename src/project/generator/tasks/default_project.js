const {
    project
} = adone;

export default class DefaultProjectTask extends project.generator.task.Base {
    async run({
        skipGit = this.context.flag.skipGit,
        skipEslint = this.context.flag.skipEslint,
        skipJsconfig = this.context.flag.skipJsconfig
    } = {}) {
        const tasks = ["initialize", "adoneConfig"];
        
        if (!skipJsconfig) {
            tasks.push("jsconfigConfig");
        }

        if (!skipEslint) {
            tasks.push("eslintConfig");
        }
        
        if (!skipGit) {
            tasks.push("git");
        }
        
        const observer = await this.manager.runInSeries(tasks);
        return observer.result;
    }
}
