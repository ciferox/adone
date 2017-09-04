const {
    js: { compiler: { core } },
    std: { path }
} = adone;

describe.skip("addon resolution", () => {
    const base = path.join(__dirname, "fixtures", "resolution");

    beforeEach(function () {
        this.cwd = process.cwd();
        process.chdir(base);
    });

    afterEach(function () {
        process.chdir(this.cwd);
    });

    it("should find module: presets", () => {
        process.chdir("module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["module:preset"]
        });
    });

    it("should find module: plugins", () => {
        process.chdir("module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["module:plugin"]
        });
    });

    it("should find standard presets", () => {
        process.chdir("standard-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["mod"]
        });
    });

    it("should find standard plugins", () => {
        process.chdir("standard-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["mod"]
        });
    });

    it("should find standard presets with an existing prefix", () => {
        process.chdir("standard-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["babel-preset-mod"]
        });
    });

    it("should find standard plugins with an existing prefix", () => {
        process.chdir("standard-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["babel-plugin-mod"]
        });
    });

    it("should find @babel scoped presets", () => {
        process.chdir("babel-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["@babel/foo"]
        });
    });

    it("should find @babel scoped plugins", () => {
        process.chdir("babel-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["@babel/foo"]
        });
    });

    it("should find @babel scoped presets with an existing prefix", () => {
        process.chdir("babel-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["@babel/preset-foo"]
        });
    });

    it("should find @babel scoped plugins", () => {
        process.chdir("babel-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["@babel/plugin-foo"]
        });
    });

    it("should find @foo scoped presets", () => {
        process.chdir("foo-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["@foo/mod"]
        });
    });

    it("should find @foo scoped plugins", () => {
        process.chdir("foo-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["@foo/mod"]
        });
    });

    it("should find @foo scoped presets with an existing prefix", () => {
        process.chdir("foo-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["@foo/babel-preset-mod"]
        });
    });

    it("should find @foo scoped plugins with an existing prefix", () => {
        process.chdir("foo-org-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["@foo/babel-plugin-mod"]
        });
    });

    it("should find relative path presets", () => {
        process.chdir("relative-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["./dir/preset.js"]
        });
    });

    it("should find relative path plugins", () => {
        process.chdir("relative-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["./dir/plugin.js"]
        });
    });

    it("should find module file presets", () => {
        process.chdir("nested-module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["mod/preset"]
        });
    });

    it("should find module file plugins", () => {
        process.chdir("nested-module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["mod/plugin"]
        });
    });

    it("should find @foo scoped module file presets", () => {
        process.chdir("scoped-nested-module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["@foo/mod/preset"]
        });
    });

    it("should find @foo scoped module file plugins", () => {
        process.chdir("scoped-nested-module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["@foo/mod/plugin"]
        });
    });

    it("should find @babel scoped module file presets", () => {
        process.chdir("babel-scoped-nested-module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            presets: ["@babel/mod/preset"]
        });
    });

    it("should find @babel scoped module file plugins", () => {
        process.chdir("babel-scoped-nested-module-paths");

        core.transform("", {
            filename: "filename.js",
            babelrc: false,
            plugins: ["@babel/mod/plugin"]
        });
    });

    it("should throw about module: usage for presets", () => {
        process.chdir("throw-module-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                presets: ["foo"]
            });
            // eslint-disable-next-line max-len
        }, /Cannot find module 'babel-preset-foo'.*\n- If you want to resolve "foo", use "module:foo"/);
    });

    it("should throw about module: usage for plugins", () => {
        process.chdir("throw-module-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                plugins: ["foo"]
            });
            // eslint-disable-next-line max-len
        }, /Cannot find module 'babel-plugin-foo'.*\n- If you want to resolve "foo", use "module:foo"/);
    });

    it("should throw about @babel usage for presets", () => {
        process.chdir("throw-babel-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                presets: ["foo"]
            });
            // eslint-disable-next-line max-len
        }, /Cannot find module 'babel-preset-foo'.*\n- Did you mean "@babel\/foo"\?/);
    });

    it("should throw about @babel usage for plugins", () => {
        process.chdir("throw-babel-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                plugins: ["foo"]
            });
            // eslint-disable-next-line max-len
        }, /Cannot find module 'babel-plugin-foo'.*\n- Did you mean "@babel\/foo"\?/);
    });

    it("should throw about passing a preset as a plugin", () => {
        process.chdir("throw-opposite-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                presets: ["testplugin"]
            });
            // eslint-disable-next-line max-len
        }, /Cannot find module 'babel-preset-testplugin'.*\n- Did you accidentally pass a preset as a plugin\?/);
    });

    it("should throw about passing a plugin as a preset", () => {
        process.chdir("throw-opposite-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                plugins: ["testpreset"]
            });
            // eslint-disable-next-line max-len
        }, /Cannot find module 'babel-plugin-testpreset'.*\n- Did you accidentally pass a plugin as a preset\?/);
    });

    it("should throw about missing presets", () => {
        process.chdir("throw-missing-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                presets: ["foo"]
            });
        }, /Cannot find module 'babel-preset-foo'/);
    });

    it("should throw about missing plugins", () => {
        process.chdir("throw-missing-paths");

        assert.throws(() => {
            core.transform("", {
                filename: "filename.js",
                babelrc: false,
                plugins: ["foo"]
            });
        }, /Cannot find module 'babel-plugin-foo'/);
    });
});
