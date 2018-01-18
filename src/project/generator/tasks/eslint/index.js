const {
    fs,
    std,
    project
} = adone;

export default class EslintTask extends project.generator.task.Base {
    async run(input, context) {
        const eslintrcPath = std.path.join(__dirname, "eslintrc.js_");

        await fs.copy(eslintrcPath, std.path.join(input.cwd, ".eslintrc.js"));
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
