import { stripDir } from "./helpers";

const {
    is,
    archive: { zip: { unpack } },
    std: { fs: { Stats, constants: { S_IFMT, S_IFDIR, S_IFLNK } }, path }
} = adone;

const getType = (entry, mode) => ((mode & S_IFMT) === S_IFLNK)
    ? "link"
    : ((mode & S_IFMT) === S_IFDIR || ((entry.versionMadeBy >> 8) === 0 && entry.externalFileAttributes === 16))
        ? "dir"
        : "file";


export default () => ({
    name: "ZIP",
    supportBuffer: true,
    supportStream: false,
    async run(stream, file, { dirname, strip, ...options } = {}) {
        const contents = file.contents;
        const zipfile = await unpack.fromBuffer(contents, { ...options, lazyEntries: true });

        for (; ;) {
            const entry = await zipfile.readEntry(); // eslint-disable-line
            if (is.null(entry)) {
                break;
            }
            const entryFile = file.clone();
            entryFile.stat = new Stats();
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

            entryFile.path = path.resolve(dirname, stripDir(entry.fileName, strip));
            if (t === "dir") {
                entryFile.contents = null;
            } else if (t === "file") {
                entryFile.contents = await zipfile.openReadStream(entry); // eslint-disable-line
            } else {
                entryFile.contents = null;
                const s = await zipfile.openReadStream(entry); // eslint-disable-line
                entryFile.symlink = await s.pipe(adone.stream.concat.create("string")); // eslint-disable-line
            }
            stream.push(entryFile);
        }
        await zipfile.close();
    }
});
