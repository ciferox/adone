const {
    fs,
    std,
    project
} = adone;

export default class EslintConfigTask extends project.generator.task.Base {
    async run() {
        const eslintrcPath = std.path.join(adone.etcPath, "project", ".eslintrc.js");
        
        await fs.copy(eslintrcPath, this.context.project.cwd);
        const eslintConfig = adone.require(eslintrcPath);

        await this._runTask("npm", {
            cwd: this.context.project.cwd,
            devDependencies: eslintConfig.plugins.map((name) => `eslint-plugin-${name}`)
        });

        this.context.config.eslint = eslintConfig;
    }
}
