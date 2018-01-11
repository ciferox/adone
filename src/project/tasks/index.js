adone.lazify({
    Base: "./base",
    Transform: "./transform",
    Clean: "./clean",
    Copy: "./copy",
    Transpile: "./transpile",
    TranspileExe: "./transpile_exe",
    Watch: "./watch",
    IncreaseVersion: "./increase_version",
    NBuild: "./nbuild",
    NClean: "./nclean"
}, adone.asNamespace(exports), require);
