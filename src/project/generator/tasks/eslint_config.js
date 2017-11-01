const {
    fs,
    std,
    project
} = adone;

export default class EslintConfigTask extends project.generator.task.Base {
    async run(input) {
        const eslintrcPath = std.path.join(adone.etcPath, "project", ".eslintrc.js");
        
        await fs.copy(eslintrcPath, input.cwd);
        const eslintConfig = adone.require(eslintrcPath);
        const npmInput = {
            devDependencies: []
        };
        for (const name of eslintConfig.plugins) {
            npmInput.devDependencies.push(`eslint-plugin-${name}`);
        }

        const observer = await this.manager.run("npmConfig", {
            cwd: input.cwd,
            ...npmInput
        });
        await observer.result;

        this.context.eslintConfig = eslintConfig;
    }
}
