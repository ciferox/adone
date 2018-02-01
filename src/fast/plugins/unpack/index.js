export default function plugin() {
    const {
        is,
        std,
        x
    } = adone;

    return function unpack(archiveType, { inRoot = false, dirname, ...extractorOptions } = {}) {
        if (!(archiveType in adone.archive)) {
            throw new exception.InvalidArgument(`Unknown archive type: ${archiveType}`);
        }
        const archive = adone.archive[archiveType];

        return this.through(async function extracting(file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }
            const _dirname = inRoot
                ? file.dirname
                : dirname
                    ? dirname
                    : std.path.resolve(file.dirname, file.stem)
            switch (archiveType) {
                case "tar": {
                    const isBuffer = file.isBuffer();
                    const stream = new archive.RawUnpackStream(extractorOptions);
                    const p = new Promise((resolve, reject) => {
                        stream.on("entry", (header, stream, next) => {
                            const entryFile = file.clone({ contents: false });
                            entryFile.contents = null;
                            entryFile.path = std.path.resolve(_dirname, header.name);
                            entryFile.stat = new std.fs.Stats();
                            entryFile.stat.mtime = header.mtime;
                            entryFile.stat.mode = header.mode;
                            entryFile.stat.mtimeMs = header.mtime.getTime();

                            switch (header.type) {
                                case "file": {
                                    entryFile.stat.mode |= std.fs.constants.S_IFREG;

                                    if (isBuffer) {
                                        stream.pipe(adone.stream.concat.create()).then((data) => {
                                            if (is.array(data)) {
                                                data = Buffer.alloc(0);
                                            }
                                            entryFile.contents = data;
                                            this.push(entryFile);
                                            next();
                                        }).catch((err) => {
                                            next(err); // will destroy the stream and emit the error
                                        });
                                    } else {
                                        entryFile.contents = stream;
                                        next();
                                    }
                                    break;
                                }
                                case "directory": {
                                    entryFile.stat.mode |= std.fs.constants.S_IFDIR;
                                    this.push(entryFile);
                                    next();
                                    break;
                                }
                                case "symlink": {
                                    // TODO: what if `links` is false ?
                                    entryFile.stat.mode |= std.fs.constants.S_IFLNK;
                                    entryFile.symlink = header.linkname;
                                    this.push(entryFile);
                                    next();
                                    break;
                                }
                                default: {
                                    // ignore?
                                    next();
                                }
                            }
                        });
                        stream.once("finish", resolve);
                        stream.once("error", (err) => {
                            if (!isBuffer) {
                                file.contents.close();
                            }
                            stream.destroy();
                            reject(err);
                        });
                    });
                    if (isBuffer) {
                        stream.end(file.contents);
                    } else {
                        file.contents.pipe(stream);
                    }
                    await p;
                    break;
                }
                case "zip": {
                    let contents;
                    if (file.isBuffer()) {
                        contents = file.contents;
                    } else if (file.isStream()) {
                        // TODO: how to handle large files?
                        contents = await file.contents.pipe(new adone.collection.BufferList());
                        file.contents = contents;
                    } else {
                        throw new exception.NotSupported("Zip unpacker support only streams and buffers");
                    }
                    const zipfile = await adone.archive.zip.unpack.fromBuffer(contents, { ...extractorOptions, lazyEntries: true });
                    for (; ;) {
                        const entry = await zipfile.readEntry(); // eslint-disable-line
                        if (is.null(entry)) {
                            break;
                        }
                        const entryFile = file.clone();
                        entryFile.stat = new std.fs.Stats();
                        entryFile.stat.mode = (entry.externalFileAttributes >> 16) >>> 0;
                        entryFile.stat.mtime = entry.getLastModDate().toDate();
                        entryFile.stat.mtimeMs = entryFile.stat.mtime.getTime();
                        if (entry.fileName.endsWith("/")) {
                            entryFile.stat.mode |= std.fs.constants.S_IFDIR;
                            entryFile.path = std.path.resolve(_dirname, entry.fileName.slice(0, -1));
                            entryFile.contents = null;
                        } else {
                            entryFile.path = std.path.resolve(_dirname, entry.fileName);
                            entryFile.stat.mode |= std.fs.constants.S_IFREG;
                            entryFile.contents = await zipfile.openReadStream(entry); // eslint-disable-line
                        }
                        this.push(entryFile);
                    }
                    await zipfile.close();
                    break;
                }
            }
        });
    };
}
