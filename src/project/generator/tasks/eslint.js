const {
    fs,
    std,
    project
} = adone;

export default class EslintTask extends project.generator.task.Base {
    async run() {
        const eslintrcPath = std.path.join(adone.etcPath, "project", ".eslintrc.js");
        
        await fs.copyTo(eslintrcPath, this.context.project.cwd);
        const eslintConfig = adone.require(eslintrcPath);

        await this.runTask("npm", {
            cwd: this.context.project.cwd,
            devDependencies: [
                "eslint",
                "babel-eslint",
                ...eslintConfig.plugins.map((name) => `eslint-plugin-${name}`)
            ]
        });

        this.context.config.eslint = eslintConfig;
    }
}
