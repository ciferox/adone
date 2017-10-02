adone.lazify({
    parse: ["./parser", (mod) => mod.parse],
    parseExpression: ["./parser", (mod) => mod.parseExpression],
    core: "./core",
    // jsTokens: "./js_tokens",
    // matchToToken: ["./js_tokens", (mod) => mod.matchToToken],
    esutils: "./esutils",
    codeFrame: ["./code_frame", (x) => x.codeFrame],
    codeFrameColumns: ["./code_frame", (x) => x.codeFrameColumns],
    types: "./types",
    helper: "./helpers",
    traverse: "./traverse",
    Printer: "./generator/printer",
    // Whitespace: "./generator/whitespace",
    generate: "./generator",
    CodeGenerator: ["./generator", (x) => x.CodeGenerator],
    template: "./template",
    
    plugin: "./plugins",
    // tools: () => adone.lazify({
    //     buildExternalHelpers: "./core/tools/build_external_helpers"
    // }, null, require),
    transformation: () => adone.lazify({
        file: () => adone.lazify({
            buildConfigChain: "./core/transformation/file/options/build_config_chain",
            OptionManager: "./core/transformation/file/options/option_manager",
            Logger: "./core/transformation/file/logger"
        }, null, require),
        Plugin: "./core/transformation/plugin"
    }, null, require)
}, exports, require);
