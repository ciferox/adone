const {
    is,
    fs,
    std
} = adone;

export default async (srcPath, dstPath, { ignoreExisting = false, cwd = undefined } = {}) => {
    const baseSrcPath = adone.util.globParent(srcPath);
    if (is.string(cwd)) {
        if (!std.path.isAbsolute(dstPath)) {
            dstPath = std.path.resolve(cwd, dstPath);
        }
    }

    await fs.glob(srcPath, { cwd }).map(async (p) => {
        const relPath = std.path.relative(baseSrcPath, p);
        const dstFilePath = std.path.resolve(dstPath, relPath);

        if (ignoreExisting && await fs.exists(dstFilePath)) {
            return [dstFilePath, null];
        }

        const srcAbsPath = is.string(cwd) && !std.path.isAbsolute(p) ? std.path.resolve(cwd, p) : p;
        return [dstFilePath, await fs.readFile(srcAbsPath, { check: true })];
    }).map(async (fData) => {
        const content = fData[1];
        if (is.null(content)) {
            return;
        }
        const dstFilePath = fData[0];
        await fs.mkdirp(std.path.dirname(dstFilePath));
        return adone.fs.writeFile(dstFilePath, content);
    });
};
