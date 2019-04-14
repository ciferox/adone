const {
    module: { resolve }
} = adone;

const keys = require("object-keys");

describe("core modules", () => {
    it("isCore()", () => {
        assert.ok(resolve.isCore("fs"));
        assert.ok(resolve.isCore("net"));
        assert.ok(resolve.isCore("http"));

        assert.ok(!resolve.isCore("seq"));
        assert.ok(!resolve.isCore("../"));
    });

    it("core list", () => {
        const cores = keys(resolve.core);
        for (let i = 0; i < cores.length; ++i) {
            const mod = cores[i];
            if (resolve.core[mod]) {
                require(mod);
            } else {
                assert.throws(() => require(mod));
            }
        }
    });

    it("core via repl module", { skip: !resolve.core.repl }, () => {
        const libs = require("repl")._builtinLibs; // eslint-disable-line no-underscore-dangle
        if (!libs) {
            return;
        }
        for (let i = 0; i < libs.length; ++i) {
            const mod = libs[i];
            assert.ok(resolve.core[mod], `${mod} is a core module`);
            require(mod);
        }
    });

    it("core via builtinModules list", { skip: !resolve.core.module }, () => {
        const libs = require("module").builtinModules;
        if (!libs) {
            return;
        }
        const blacklist = [
            "_debug_agent",
            "v8/tools/tickprocessor-driver",
            "v8/tools/SourceMap",
            "v8/tools/tickprocessor",
            "v8/tools/profile"
        ];
        for (let i = 0; i < libs.length; ++i) {
            const mod = libs[i];
            if (!blacklist.includes(mod)) {
                assert.ok(resolve.core[mod], `${mod} is a core module`);
                require(mod);
            }
        }
    });
});
