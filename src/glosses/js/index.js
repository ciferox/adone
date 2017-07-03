adone.lazify({
    compiler: () => adone.lazify({
        parse: ["./compiler/parser", (mod) => mod.parse],
        parseExpression: ["./compiler/parser", (mod) => mod.parseExpression],
        jsTokens: "./compiler/js_tokens",
        matchToToken: ["./compiler/js_tokens", (mod) => mod.matchToToken],
        esutils: "./compiler/esutils",
        codeFrame: "./compiler/code_frame",
        messages: "./compiler/messages",
        types: "./compiler/types",
        helpers: "./compiler/helpers",
        traverse: "./compiler/traverse",
        Printer: "./compiler/generator/printer",
        Whitespace: "./compiler/generator/whitespace",
        generate: "./compiler/generator",
        template: "./compiler/template",
        core: "./compiler/core",
        plugin: "./compiler/plugins",
        tools: () => adone.lazify({
            buildExternalHelpers: "./compiler/core/tools/build_external_helpers"
        }, null, require),
        transformation: () => adone.lazify({
            file: () => adone.lazify({
                buildConfigChain: "./compiler/core/transformation/file/options/build_config_chain",
                OptionManager: "./compiler/core/transformation/file/options/option_manager",
                Logger: "./compiler/core/transformation/file/logger"
            }, null, require),
            Plugin: "./compiler/core/transformation/plugin"
        }, null, require)
    }, null, require),
    coverage: "./coverage",
    Module: "./module"
}, exports, require);
