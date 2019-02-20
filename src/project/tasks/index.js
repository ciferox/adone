adone.lazify({
    Clean: "./clean",
    Copy: "./copy",
    Transpile: "./transpile",
    TranspileExe: "./transpile_exe",
    Watch: "./watch",
    IncreaseVersion: "./increase_version",
    Nbuild: "./nbuild",
    Nclean: "./nclean",

    // Generators
    Config: "./config",
    Eslint: "./eslint",
    Jsconfig: "./jsconfig",
    Npm: "./npm",
    EmptyProject: "./empty_project",
    Application: "./application",
    ApplicationProject: "./application_project",
    CliApplication: "./cli_application",
    CliApplicationProject: "./cli_application_project",
    CliCommand: "./cli_command",
    CliCommandProject: "./cli_command_project",
    OmnitronService: "./omnitron_service",
    OmnitronServiceProject: "./omnitron_service_project",
    Gloss: "./gloss",
    GlossProject: "./gloss_project",
    Git: "./git"
}, adone.asNamespace(exports), require);
