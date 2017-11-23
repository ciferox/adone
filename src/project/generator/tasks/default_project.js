const {
    project
} = adone;

export default class DefaultProjectTask extends project.generator.task.Base {
    async run(input, context) {
        // Define initial context data
        context.flag = {
            skipGit: false,
            skipNpm: false,
            skipJsconfig: false,
            skipEslint: false,
            ...adone.util.pick(input, ["skipGit", "skipNpm", "skipJsconfig", "skipEslint"])
        };
        context.project = adone.util.pick(input, ["name", "type", "description", "version", "author", "cwd"]);
        
        const tasks = ["adoneConfig"];

        if (!context.flag.skipJsconfig) {
            tasks.push("jsconfig");
        }

        if (!context.flag.skipEslint) {
            tasks.push("eslint");
        }

        if (!context.flag.skipGit) {
            tasks.push("git");
        }

        const observer = await this.manager.runInSeries(tasks, null, input, context);
        return observer.result;
    }
}
