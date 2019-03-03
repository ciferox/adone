const {
    fs,
    std
} = adone;

export const create = async (info) => {
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
