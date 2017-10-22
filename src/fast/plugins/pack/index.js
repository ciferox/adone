export default function plugin() {
    const {
        is,
        std,
        x
    } = adone;

    return function pack(archiveType, packerOptions = {}) {
        if (!(archiveType in adone.archive)) {
            throw new x.InvalidArgument(`Unknown archive type: ${archiveType}`);
        }
        if (is.string(packerOptions)) {
            packerOptions = { filename: packerOptions };
        }
        if (!is.string(packerOptions.filename)) {
            throw new x.InvalidArgument("Filename is required");
        }
        const archive = adone.archive[archiveType];
        const stream = new archive.RawPackStream();
        const self = this;
        return this.through(async (file) => {
            if (file.isNull() && !file.isSymbolic()) {
                // ok? add an empty file?
                return;
            }
            const header = {
                name: file.relative,
                mode: file.stat && file.stat.mode,
                mtime: file.stat && file.stat.mtime,
                type: file.isSymbolic() ? "symlink" : "file"
            };
            if (file.isSymbolic()) {
                header.linkname = file.symlink;
                stream.entry(header);
                return;
            }
            if (file.isBuffer()) {
                stream.entry(header, file.contents);
            } else {
                // stream
                // ..
                let data = await file.contents.pipe(adone.stream.concat());
                if (data.length === 0) {
                    // nothing was written, empty file
                    data = Buffer.alloc(0);
                }
                stream.entry(header, data);
            }
        }, function flush() {
            stream.finalize();
            const cwd = packerOptions.cwd || self._cwd || process.cwd();
            const base = packerOptions.base || cwd;
            const file = new adone.fast.File({
                path: std.path.resolve(base, packerOptions.filename),
                cwd: packerOptions.cwd || this._cwd || process.cwd(),
                base: packerOptions.base || null,
                contents: stream
            });
            this.push(file);
        });
    };
}
