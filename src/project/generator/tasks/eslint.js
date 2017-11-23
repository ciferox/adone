const {
    fs,
    std,
    project
} = adone;

export default class EslintTask extends project.generator.task.Base {
    async run(input, context) {
        const eslintrcPath = std.path.join(adone.etcPath, "project", ".eslintrc.js");

        await fs.copyTo(eslintrcPath, input.cwd);
        const eslintConfig = adone.require(eslintrcPath);

        await this.runTask("npm", {
            cwd: input.cwd,
            devDependencies: [
                "eslint",
                "babel-eslint",
                ...eslintConfig.plugins.map((name) => `eslint-plugin-${name}`)
            ]
        }, context);
    }
}
