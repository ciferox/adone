const {
    fs2,
    path
} = adone;
const { graceful: fs } = fs2;

export default (srcpath, dstpath) => {
    const destinationExists = fs.existsSync(dstpath);
    if (destinationExists) {
        return undefined;
    }

    try {
        fs.lstatSync(srcpath);
    } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
    }

    const dir = path.dirname(dstpath);
    const dirExists = fs.existsSync(dir);
    if (dirExists) {
        return fs.linkSync(srcpath, dstpath);
    }
    fs2.mkdirpSync(dir);

    return fs.linkSync(srcpath, dstpath);
};
