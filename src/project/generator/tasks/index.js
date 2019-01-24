// Type of projects:
// - `application`: adone application
// - `cli.command`: subcommand for adone cli
// - `omnitron.service`: omnitron service
// - ``

adone.lazify({
    Base: "./base",
    AdoneConfig: "./adone_config",
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
