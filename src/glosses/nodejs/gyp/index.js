adone.lazify({
    configure: "./configure",
    clean: "./clean",
    build: "./build",
    rebuild: "./rebuild"
}, exports, require);

export const getBuildPath = (realm, ...args) => adone.path.join(realm.getPath("tmp"), "gyp_build", ...args);

// arch: String, // 'configure'
// cafile: String, // 'install'
// debug: Boolean, // 'build'
// directory: String, // bin
// make: String, // 'build'
// msvs_version: String, // 'configure'
// ensure: Boolean, // 'install'
// solution: String, // 'build' (windows only)
// proxy: String, // 'install'
// devdir: String, // everywhere
// nodedir: String, // 'configure'
// loglevel: String, // everywhere
// python: String, // 'configure'
// "dist-url": String, // 'install'
// tarball: String, // 'install'
// jobs: String, // 'build'
// thin: String // 'configure'
