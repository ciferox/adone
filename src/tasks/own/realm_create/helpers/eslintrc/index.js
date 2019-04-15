const {
    fs,
    std
} = adone;

export const create = async ({ cwd, npmConfig } = {}) => {
    const eslintrcPath = std.path.join(__dirname, "eslintrc.js_");

    await fs.copy(eslintrcPath, std.path.join(cwd, ".eslintrc.js"));

    const eslintConfig = adone.require(eslintrcPath);
    const plugins = eslintConfig.plugins.map((name) => `eslint-plugin-${name}`);
    const extra = {};
    for (const plugin of plugins) {
        extra[plugin] = "latest";
    }

    npmConfig.merge({
        devDependencies: {
            eslint: "latest",
            "babel-eslint": "latest",
            ...extra
        }
    });
    await npmConfig.save();
};
