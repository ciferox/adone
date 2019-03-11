const {
    std
} = adone;

adone.lazify({
    // Common realm tasks
    createRealm: "./create_realm",
    forkRealm: "./fork_realm",
    install: "./install",
    uninstall: "./uninstall",
    mount: "./mount",
    unmount: "./unmount",
    list: "./list",
    listByType: "./list_by_type",
    validateRealm: "./validate_realm",

    // Common tasks for building
    clean: "./clean",
    build: "./build",
    copy: "./copy",
    transpile: "./transpile",
    transpileExe: "./transpile_exe",
    adoneTranspile: "./adone_transpile",
    adoneTranspileExe: "./adone_transpile_exe",
    adoneDotCompiler: "./dot_compiler",
    watch: "./watch",
    increaseVersion: "./increase_version",
    nbuild: "./nbuild",
    nclean: "./nclean",

    // Generators
    // npm: "./npm",
    // emptyProject: "./empty_project",
    // application: "./application",
    // applicationProject: "./application_project",
    // cliApplication: "./cli_application",
    // cliApplicationProject: "./cli_application_project",
    // cliCommand: "./cli_command",
    // cliCommandProject: "./cli_command_project",
    // omnitronService: "./omnitron_service",
    // omnitronServiceProject: "./omnitron_service_project",
    // gloss: "./gloss",
    // glossProject: "./gloss_project"
}, exports, require);
