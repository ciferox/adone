
const { is, x, identity, fs } = adone;

export default class Storage {
    static async ensureFileDoesntExist(file) {
        if (await fs.exists(file)) {
            await adone.fs.unlink(file);
        }
    }

    static async flushToStorage(options) {
        let filename;
        let flags;

        if (is.string(options)) {
            filename = options;
            flags = "r+";
        } else {
            filename = options.filename;
            flags = options.isDir ? "r" : "r+";
        }

        // Windows can't fsync (FlushFileBuffers) directories. We can live with this as it cannot cause 100% dataloss
        // except in the very rare event of the first time database is loaded and a crash happens
        if (flags === "r" && (process.platform === "win32" || process.platform === "win64")) {
            return;
        }

        const fd = await adone.fs.fd.open(filename, flags);
        const syncError = await adone.fs.fd.sync(fd).then(() => null, identity);
        const closeError = await adone.fs.fd.close(fd).then(() => null, identity);

        if (syncError || closeError) {
            const e = new x.Exception("Failed to flush to storage");
            e.errorOnFsync = syncError;
            e.errorOnClose = closeError;
            return Promise.reject(e);
        }
    }

    // Fully write or rewrite the datafile, immune to crashes during the write operation (data will not be lost)
    static async crashSafeWriteFile(filename, data) {

        await Storage.flushToStorage({
            filename: adone.std.path.dirname(filename),
            isDir: true
        });

        if (await fs.exists(filename)) {
            await Storage.flushToStorage(filename);
        }

        const tempFilename = `${filename}~`;

        await adone.fs.writeFile(tempFilename, data);

        await Storage.flushToStorage(tempFilename);

        await adone.fs.rename(tempFilename, filename);

        await Storage.flushToStorage({
            filename: adone.std.path.dirname(filename),
            isDir: true
        });
    }

    static async ensureDatafileIntegrity(filename) {

        if (await fs.exists(filename)) {
            return;
        }

        const tempFilename = `${filename}~`;
        if (await fs.exists(tempFilename)) {
            return fs.rename(tempFilename, filename);
        }
        return fs.writeFile(filename, "", { encoding: "utf-8" });
    }
}
