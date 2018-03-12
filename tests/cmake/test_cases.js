const {
    fs,
    cmake: { BuildSystem },
    std: { path },
    lodash: _
} = adone;

export default {
    async buildPrototypeWithDirectoryOption(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype"))
        }, options);
        const buildSystem = new BuildSystem(options);
        await buildSystem.rebuild();
        assert.ok((await fs.stat(path.join(__dirname, "prototype/build/Release/addon.node"))).isFile());
    },
    async buildPrototype2WithCWD(options) {
        const cwd = process.cwd();
        process.chdir(path.resolve(path.join(__dirname, "./prototype2")));
        const buildSystem = new BuildSystem(options);
        try {
            await buildSystem.rebuild();
            assert.ok((await fs.stat(path.join(__dirname, "prototype2/build/Release/addon2.node"))).isFile());
        } finally {
            process.chdir(cwd);
        }
    },
    async shouldConfigurePreC11Properly(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype")),
            std: "c++98"
        }, options);
        const buildSystem = new BuildSystem(options);
        if (!/visual studio/i.test(buildSystem.toolset.generator)) {
            const command = await buildSystem.getConfigureCommand();
            assert.equal(command.indexOf("-std=c++11"), -1, "c++11 still forced");
        }
    },
    async configureWithCustomOptions(options) {
        options = _.extend({
            directory: path.resolve(path.join(__dirname, "./prototype")),
            cMakeOptions: {
                foo: "bar"
            }
        }, options);
        const buildSystem = new BuildSystem(options);

        const command = await buildSystem.getConfigureCommand();
        assert.notEqual(command.indexOf("-Dfoo=\"bar\""), -1, "custom options added");
    }
};
