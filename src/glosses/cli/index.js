const __ = adone.lazify({
    Terminfo: "./terminfo",
    Terminal: "./terminal",
    Progress: "./progress",
    prompt: "./prompt",
    esc: "./esc",
    Chalk: "./chalk",
    chalk: () => __.Chalk(),
    chalkify: "./chalkify",
    gradient: "./gradient",
    ui: "./ui",
    Kit: "./kit"
}, adone.asNamespace(exports), require);
