const {
    is,
    archive: { zip: { unpack } },
    std
} = adone;

const IFMT = std.fs.constants.S_IFMT;
const IFDIR = std.fs.constants.S_IFDIR;
const IFLNK = std.fs.constants.S_IFLNK;

const getType = (entry, mode) => ((mode & IFMT) === IFLNK)
    ? "link"
    : ((mode & IFMT) === IFDIR || ((entry.versionMadeBy >> 8) === 0 && entry.externalFileAttributes === 16))
        ? "dir"
        : "file";


export default () => ({
    name: "Zip",
    supportBuffer: true,
    supportStream: false,
    async run(stream, file, { dirname, ...options } = {}) {
        const contents = file.contents;
        const zipfile = await unpack.fromBuffer(contents, { ...options, lazyEntries: true });

        for (; ;) {
            const entry = await zipfile.readEntry(); // eslint-disable-line
            if (is.null(entry)) {
                break;
            }
            const entryFile = file.clone();
            entryFile.stat = new std.fs.Stats();
            const mode = entryFile.stat.mode = (entry.externalFileAttributes >> 16) & 0xFFFF;
            entryFile.stat.mtime = entry.getLastModDate().toDate();
            entryFile.stat.mtimeMs = entryFile.stat.mtime.getTime();

            const t = getType(entry, mode);

            if (mode === 0 && t === "dir") {
                entryFile.stat.mode = 493;
            }

            if (entryFile.stat.mode === 0) {
                entryFile.stat.mode = 420;
            }

            if (t === "dir") {
                entryFile.path = std.path.resolve(dirname, entry.fileName.slice(0, -1));
                entryFile.contents = null;
            } else if (t === "file") {
                entryFile.path = std.path.resolve(dirname, entry.fileName);
                entryFile.contents = await zipfile.openReadStream(entry); // eslint-disable-line
            } else {
                entryFile.symlink = await zipfile.openReadStream(entry); // eslint-disable-line
            }
            stream.push(entryFile);
        }
        await zipfile.close();
    }
});
