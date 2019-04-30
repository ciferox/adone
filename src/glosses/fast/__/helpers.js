const {
    is,
    fs,
    path: aPath,
    sourcemap
} = adone;

export const applySourceMap = (file, sourceMap) => {
    if (is.string(sourceMap)) {
        sourceMap = JSON.parse(sourceMap);
    }

    if (file.sourceMap && is.string(file.sourceMap)) {
        file.sourceMap = JSON.parse(file.sourceMap);
    }

    if (file.sourceMap && file.sourceMap.mappings !== "") {
        const generator = sourcemap.SourceMapGenerator.fromSourceMap(sourcemap.createConsumer(sourceMap));
        generator.applySourceMap(sourcemap.createConsumer(file.sourceMap));
        file.sourceMap = JSON.parse(generator.toString());
    } else {
        file.sourceMap = sourceMap;
    }
};

const getModeDiff = (fsMode, fileMode) => {
    let modeDiff = 0;

    if (is.number(fileMode)) {
        modeDiff = (fileMode ^ fsMode) & 0o7777;
    }

    return modeDiff;
};

const isValidDate = (str) => {
    return !is.nan(Date.parse(str));
};

const getTimesDiff = (fsStat, fileStat) => {

    if (!isValidDate(fileStat.mtime)) {
        return;
    }

    if (Number(fileStat.mtime) === Number(fsStat.mtime) && Number(fileStat.atime) === Number(fsStat.atime)) {
        return;
    }

    let atime;
    if (isValidDate(fileStat.atime)) {
        atime = fileStat.atime;
    } else {
        atime = fsStat.atime;
    }

    if (!isValidDate(atime)) {
        atime = undefined;
    }

    return { mtime: fileStat.mtime, atime };
};

const isValidUnixId = (id) => {
    if (!is.number(id)) {
        return false;
    }

    if (id < 0) {
        return false;
    }

    return true;
};

const getOwnerDiff = (fsStat, fileStat) => {
    if (!isValidUnixId(fileStat.uid) && !isValidUnixId(fileStat.gid)) {
        return;
    }

    if (
        (!isValidUnixId(fsStat.uid) && !isValidUnixId(fileStat.uid)) ||
        (!isValidUnixId(fsStat.gid) && !isValidUnixId(fileStat.gid))
    ) {
        return;
    }

    let uid = fsStat.uid; // Default to current uid.
    if (isValidUnixId(fileStat.uid)) {
        uid = fileStat.uid;
    }

    let gid = fsStat.gid; // Default to current gid.
    if (isValidUnixId(fileStat.gid)) {
        gid = fileStat.gid;
    }

    if (uid === fsStat.uid && gid === fsStat.gid) {
        return;
    }
    return { uid, gid };
};

const isOwner = (fsStat) => {
    const hasGetuid = is.function(process.getuid);
    const hasGeteuid = is.function(process.geteuid);

    // If we don't have either, assume we don't have permissions.
    // This should only happen on Windows.
    // Windows basically noops fchmod and errors on futimes called on directories.
    if (!hasGeteuid && !hasGetuid) {
        return false;
    }

    let uid;
    if (hasGeteuid) {
        uid = process.geteuid();
    } else {
        uid = process.getuid();
    }

    if (fsStat.uid !== uid && uid !== 0) {
        return false;
    }

    return true;
};

export const updateMetadata = async (fd, file, { originMode, originTimes, originOwner }) => {
    if (!originMode && !originTimes && !originOwner) {
        return;
    }

    const stat = await fs.fstat(fd);
    const modeDiff = getModeDiff(stat.mode, file.stat.mode);
    const timesDiff = getTimesDiff(stat, file.stat);
    const ownerDiff = getOwnerDiff(stat, file.stat);
    Object.assign(file.stat, stat);
    if (!modeDiff && !timesDiff && !ownerDiff) {
        return;
    }
    if (!isOwner(stat)) {
        return;
    }
    if (originMode && modeDiff) {
        const mode = stat.mode ^ modeDiff;
        await fs.fchmod(fd, mode);
        file.stat.mode = mode;

    }
    if (originTimes && timesDiff) {
        await fs.futimes(fd, timesDiff.atime, timesDiff.mtime);
        file.stat.atime = timesDiff.atime;
        file.stat.mtime = timesDiff.mtime;
    }
    if (originOwner && ownerDiff) {
        await fs.fchown(fd, ownerDiff.uid, ownerDiff.gid);
        file.stat.uid = ownerDiff.uid;
        file.stat.gid = ownerDiff.gid;
    }
};


export const resolveGlob = (glob, cwd) => {
    if (glob[0] === "!") {
        return `!${aPath.resolve(cwd, glob.slice(1))}`;
    }
    return aPath.resolve(cwd, glob);
};

export const globSource = (globs, { cwd = process.cwd(), base = null, dot = true, links = false } = {}) => {
    let globsParents;
    if (!base) {
        globsParents = globs.filter((glob) => !glob.startsWith("!")).map((x) => adone.glob.parent(x));
    }
    return adone.glob(globs, { dot, index: true }).through(async function fileWrapper({ path, index }) {
        const stat = await (links ? fs.lstat : fs.stat)(path);
        const _base = base || globsParents[index];
        this.push(new adone.fast.File({
            cwd,
            base: _base,
            path,
            contents: null,
            stat, // TODO, it should be handled by the glob
            symlink: stat.isSymbolicLink() ? await fs.readlink(path) : null
        }));
    });
};
