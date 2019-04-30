import BuildSystem from "./build_system";

const {
    fs,
    path
} = adone;

export default async ({ realm, path: addonPath, nodePath, debug } = {}) => {
    const version = process.version.slice(1);
    const out = adone.nodejs.cmake.getBuildPath(realm, addonPath);

    await fs.mkdirp(out);

    const buildSystem = new BuildSystem({
        arch: adone.std.os.arch(),
        version,
        debug,
        out,
        directory: path.join(realm.getPath(), addonPath),
        // nodePath
    });
    return buildSystem.build();
};
