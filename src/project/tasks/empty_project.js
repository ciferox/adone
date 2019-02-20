const {
    is,
    project
} = adone;

export default class extends project.BaseTask {
    async main(info) {
        this.manager.notify(this, "progress", {
            message: "initialize {bold}empty project{/bold}"
        });

        await this.runAnotherTask("config", "create", info);

        info = adone.lodash.defaults(info, {
            skipGit: false,
            skipNpm: false,
            skipJsconfig: false,
            skipEslint: false
        });
        
        if (!info.skipJsconfig) {
            await this.runAnotherTask("jsconfig", "create", info);
        }

        if (!info.skipEslint) {
            await this.runAnotherTask("eslint", "create", info);
        }

        if (!info.skipGit) {
            await this.runAnotherTask("git", "init", info);
        }
    }
}
