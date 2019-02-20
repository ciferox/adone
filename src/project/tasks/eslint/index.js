const {
    fs,
    std,
    project
} = adone;

export default class EslintTask extends project.BaseTask {
    async main(subCommand, info) {
        switch (subCommand) {
            case "create":
                return this._create(info);
        }
    }

    async _create(info) {
        this.manager.notify(this, "progress", {
            message: "creating {bold}.eslintrc.js{/bold}"
        });
        const eslintrcPath = std.path.join(__dirname, "eslintrc.js_");

        await fs.copy(eslintrcPath, std.path.join(info.cwd, ".eslintrc.js"));
        
        // const eslintConfig = adone.require(eslintrcPath);
        // await this.runTask("npm", info, "install", {
        //     devDependencies: [
        //         "eslint",
        //         "babel-eslint",
        //         ...eslintConfig.plugins.map((name) => `eslint-plugin-${name}`)
        //     ]
        // }, context);
    }
}
