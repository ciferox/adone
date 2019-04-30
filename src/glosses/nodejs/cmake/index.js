adone.lazify({
    configure: "./configure",
    build: "./build",
    clean: "./clean"
}, exports, require);

export const getBuildPath = (realm, ...args) => adone.path.join(realm.getPath("tmp"), "cmake_build", ...args);
