const {
    fs2,
    path
} = adone;
const { base } = fs2;

export default (srcpath, dstpath) => {
    const destinationExists = base.existsSync(dstpath);
    if (destinationExists) {
        return undefined;
    }

    try {
        base.lstatSync(srcpath);
    } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
    }

    const dir = path.dirname(dstpath);
    const dirExists = base.existsSync(dir);
    if (dirExists) {
        return base.linkSync(srcpath, dstpath);
    }
    fs2.mkdirpSync(dir);

    return base.linkSync(srcpath, dstpath);
};
