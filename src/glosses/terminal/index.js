const __ = adone.lazify({
    Terminfo: "./terminfo",
    Terminal: "./terminal",
    BasePrompt: "./prompt/base_prompt",
    Prompt: "./prompt",
    Separator: "./prompt/separator",
    Paginator: "./prompt/paginator",
    Choices: "./prompt/choices",
    Progress: "./progress",
    esc: "./esc",
    Chalk: "./chalk",
    chalk: () => __.Chalk(),
    chalkify: "./chalkify",
    ui: "./ui",
    gradient: "./gradient",
    chalk2: "./chalk2"
}, adone.asNamespace(exports), require);
