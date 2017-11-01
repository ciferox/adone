const {
    project
} = adone;

export default class DefaultProjectTask extends project.GeneratorTask {
    async run({ skipGit = false, skipEslint = false, skipJsconfig = false, ...input } = {}) {
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
        
        const observer = await this.manager.runInSeries(tasks, null, input);
        return observer.result;
    }
}
