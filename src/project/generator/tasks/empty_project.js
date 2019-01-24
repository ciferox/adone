const {
    is,
    project
} = adone;

export default class extends project.generator.task.Base {
    async run(info, context) {
        this.manager.notify(this, "progress", {
            message: "initialize {bold}empty project{/bold}"
        });

        const tasks = ["adoneConfig"];

        if (is.object(context)) {
            // Define initial context data
            context.cwd = info.cwd;
            
            context.flag = {
                skipGit: false,
                skipNpm: false,
                skipJsconfig: false,
                skipEslint: false,
                ...adone.util.pick(info, ["skipGit", "skipNpm", "skipJsconfig", "skipEslint"])
            };

            if (!context.flag.skipJsconfig) {
                tasks.push("jsconfig");
            }

            if (!context.flag.skipEslint) {
                tasks.push("eslint");
            }

            if (!context.flag.skipGit) {
                tasks.push("git");
            }
        }

        const observer = await this.manager.runInSeries(tasks, null, info, context);
        return observer.result;
    }
}
