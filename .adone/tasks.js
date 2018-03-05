const {
    project,
    fast,
    std
} = adone;

const importAdoneReplacer = (replacer) => () => ({
    visitor: {
        ImportDeclaration(p, state) {
            if (p.node.source.value === "adone") {
                p.node.source.value = replacer(state.file.opts);
            }
        }
    }
});

class AdoneTranspileTask extends project.task.Transpile {
    plugins(params) {
        const plugins = super.plugins(params);
        return plugins.concat([
            importAdoneReplacer(({ filename }) => std.path.relative(std.path.dirname(filename), std.path.join(__dirname, "..", "lib")))
        ]);
    }
}

class AdoneTranspileExeTask extends project.task.TranspileExe {
    plugins(params) {
        const plugins = super.plugins(params);
        return plugins.concat([
            importAdoneReplacer(({ filename }) => std.path.relative(std.path.join(__dirname, "..", "bin"), std.path.join(__dirname, "..", "lib")))
        ]);
    }
}

adone.lazify({
    adoneTranspile: () => AdoneTranspileTask,
    adoneTranspileExe: () => AdoneTranspileExeTask,
    adoneDotCompiler: "./tasks/dot_compiler",
    realmInit: "./tasks/realm_init",
    realmClean: "./tasks/realm_clean"
}, exports, require);
