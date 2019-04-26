adone.lazify({
    core: "./core",
    codeFrame: "./code_frame",
    codeFrameColumns: ["./code_frame", (x) => x.codeFrameColumns, true],
    types: "./types",
    helper: "./helpers",
    traverse: "./traverse",
    Printer: "./generator/printer",
    generate: "./generator",
    CodeGenerator: ["./generator", (x) => x.CodeGenerator, true],
    template: "./template",
    
    plugin: "./plugins",
    transformation: () => adone.lazify({
        file: () => adone.lazify({
            buildConfigChain: "./core/transformation/file/options/build_config_chain",
            OptionManager: "./core/transformation/file/options/option_manager",
            Logger: "./core/transformation/file/logger"
        }, null, require),
        Plugin: "./core/transformation/plugin"
    }, null, require)
}, exports, require);
