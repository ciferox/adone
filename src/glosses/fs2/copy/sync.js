/* eslint-disable func-style */
const {
    is,
    fs2,
    path
} = adone;
const { base } = fs2;

const utimesSync = require("../util/utimes.js").utimesMillisSync;

const notExist = Symbol("notExist");

function startCopy(destStat, src, dest, opts) {
    if (opts.filter && !opts.filter(src, dest)) {
        return;
    }
    return getStats(destStat, src, dest, opts);
}

function getStats(destStat, src, dest, opts) {
    const statSync = opts.dereference ? base.statSync : base.lstatSync;
    const srcStat = statSync(src);

    if (srcStat.isDirectory()) {
        return onDir(srcStat, destStat, src, dest, opts);
    } else if (srcStat.isFile() ||
        srcStat.isCharacterDevice() ||
        srcStat.isBlockDevice()) {
        return onFile(srcStat, destStat, src, dest, opts);
    } else if (srcStat.isSymbolicLink()) {
        return onLink(destStat, src, dest, opts);
    }
}

function onFile(srcStat, destStat, src, dest, opts) {
    if (destStat === notExist) {
        return copyFile(srcStat, src, dest, opts);
    }
    return mayCopyFile(srcStat, src, dest, opts);
}

function mayCopyFile(srcStat, src, dest, opts) {
    if (opts.overwrite) {
        base.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
    } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
    }
}

function copyFile(srcStat, src, dest, opts) {
    if (is.function(base.copyFileSync)) {
        base.copyFileSync(src, dest);
        base.chmodSync(dest, srcStat.mode);
        if (opts.preserveTimestamps) {
            return utimesSync(dest, srcStat.atime, srcStat.mtime);
        }
        return;
    }
    return copyFileFallback(srcStat, src, dest, opts);
}

function copyFileFallback(srcStat, src, dest, opts) {
    const BUF_LENGTH = 64 * 1024;
    const _buff = require("../util/buffer")(BUF_LENGTH);

    const fdr = base.openSync(src, "r");
    const fdw = base.openSync(dest, "w", srcStat.mode);
    let pos = 0;

    while (pos < srcStat.size) {
        const bytesRead = base.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
        base.writeSync(fdw, _buff, 0, bytesRead);
        pos += bytesRead;
    }

    if (opts.preserveTimestamps) {
        base.futimesSync(fdw, srcStat.atime, srcStat.mtime);
    }

    base.closeSync(fdr);
    base.closeSync(fdw);
}

function onDir(srcStat, destStat, src, dest, opts) {
    if (destStat === notExist) {
        return mkDirAndCopy(srcStat, src, dest, opts);
    }
    if (destStat && !destStat.isDirectory()) {
        throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    return copyDir(src, dest, opts);
}

function mkDirAndCopy(srcStat, src, dest, opts) {
    base.mkdirSync(dest);
    copyDir(src, dest, opts);
    return base.chmodSync(dest, srcStat.mode);
}

function copyDir(src, dest, opts) {
    base.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
}

function copyDirItem(item, src, dest, opts) {
    const srcItem = path.join(src, item);
    const destItem = path.join(dest, item);
    const destStat = checkPaths(srcItem, destItem);
    return startCopy(destStat, srcItem, destItem, opts);
}

function onLink(destStat, src, dest, opts) {
    let resolvedSrc = base.readlinkSync(src);

    if (opts.dereference) {
        resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
    }

    if (destStat === notExist) {
        return base.symlinkSync(resolvedSrc, dest);
    }
    let resolvedDest;
    try {
        resolvedDest = base.readlinkSync(dest);
    } catch (err) {
        // dest exists and is a regular file or directory,
        // Windows may throw UNKNOWN error. If dest already exists,
        // fs throws error anyway, so no need to guard against it here.
        if (err.code === "EINVAL" || err.code === "UNKNOWN") {
            return base.symlinkSync(resolvedSrc, dest);
        }
        throw err;
    }
    if (opts.dereference) {
        resolvedDest = path.resolve(process.cwd(), resolvedDest);
    }
    if (isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
    }

    // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (base.statSync(dest).isDirectory() && isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
    }
    return copyLink(resolvedSrc, dest);

}

function copyLink(resolvedSrc, dest) {
    base.unlinkSync(dest);
    return base.symlinkSync(resolvedSrc, dest);
}

// return true if dest is a subdir of src, otherwise false.
function isSrcSubdir(src, dest) {
    const srcArray = path.resolve(src).split(path.sep);
    const destArray = path.resolve(dest).split(path.sep);
    return srcArray.reduce((acc, current, i) => acc && destArray[i] === current, true);
}

function checkStats(src, dest) {
    const srcStat = base.statSync(src);
    let destStat;
    try {
        destStat = base.statSync(dest);
    } catch (err) {
        if (err.code === "ENOENT") {
            return { srcStat, destStat: notExist };
        }
        throw err;
    }
    return { srcStat, destStat };
}

function checkPaths(src, dest) {
    const { srcStat, destStat } = checkStats(src, dest);
    if (destStat.ino && destStat.ino === srcStat.ino) {
        throw new Error("Source and destination must not be the same.");
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(`Cannot copy '${src}' to a subdirectory of itself, '${dest}'.`);
    }
    return destStat;
}

export default (src, dest, opts) => {
    if (is.function(opts)) {
        opts = { filter: opts };
    }

    opts = opts || {};
    opts.clobber = "clobber" in opts ? Boolean(opts.clobber) : true; // default to true for now
    opts.overwrite = "overwrite" in opts ? Boolean(opts.overwrite) : opts.clobber; // overwrite falls back to clobber

    // Warn about using preserveTimestamps on 32-bit node
    if (opts.preserveTimestamps && process.arch === "ia32") {
        console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`);
    }

    const destStat = checkPaths(src, dest);

    if (opts.filter && !opts.filter(src, dest)) {
        return;
    }

    const destParent = path.dirname(dest);
    if (!base.existsSync(destParent)) {
        fs2.mkdirpSync(destParent);
    }
    return startCopy(destStat, src, dest, opts);
};
