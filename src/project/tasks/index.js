adone.lazify({
    Base: "./base",
    Transform: "./transform",
    Clean: "./clean",
    Copy: "./copy",
    Transpile: "./transpile",
    TranspileExe: "./transpile_exe",
    Watch: "./watch",
    IncreaseVersion: "./increase_version",
    BuildNative: "./build_native"
}, adone.asNamespace(exports), require);
