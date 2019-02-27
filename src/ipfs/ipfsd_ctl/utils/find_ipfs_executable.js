const {
    is,
    std: { fs, path }
} = adone;

module.exports = (type, rootPath) => {
    const execPath = {
        go: path.join("opt", "go-ipfs", is.windows ? "ipfs.exe" : "ipfs"),
        js: path.join("lib", "ipfs", "main", "cli", "bin.js")
    };

    let appRoot = rootPath ? rootPath : adone.ROOT_PATH;
    // If inside <appname>.asar try to load from .asar.unpacked
    // this only works if asar was built with
    // asar --unpack-dir=node_modules/go-ipfs-dep/* (not tested)
    // or
    // electron-packager ./ --asar.unpackDir=node_modules/go-ipfs-dep
    if (appRoot.includes(`.asar${path.sep}`)) {
        appRoot = appRoot.replace(`.asar${path.sep}`, `.asar.unpacked${path.sep}`);
    }
    const depPath = execPath[type];
    const optPath = path.join(appRoot, depPath);

    if (fs.existsSync(optPath)) {
        return optPath;
    }

    try {
        return require.resolve(depPath);
    } catch (error) {
        // ignore the error
    }

    throw new Error("Cannot find the IPFS executable");
};
