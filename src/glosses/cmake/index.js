adone.lazify({
    BuildSystem: "./build_system",
    CMLog: "./cm_log",
    environment: "./environment",
    TargetOptions: "./target_options",
    Dist: "./dist",
    CMake: "./cmake",
    Downloader: "./downloader",
    Toolset: "./toolset",
    // processHelpers: "./processHelpers",
    locateNAN: () => {
        return adone.std.path.join(adone.rootPath, "nan");
    }
}, adone.asNamespace(exports), require);
