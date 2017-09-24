export default function plugin() {
    const {
        is,
        std,
        x
    } = adone;

    return function extract(archiveType, extractorOptions = {}) {
        if (!(archiveType in adone.archive)) {
            throw new x.InvalidArgument(`Unknown archive type: ${archiveType}`);
        }
        const archive = adone.archive[archiveType];

        return this.through(async function extracting(file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }
            const isBuffer = file.isBuffer();
            const stream = new archive.RawUnpackStream(extractorOptions);
            const p = new Promise((resolve, reject) => {
                stream.on("entry", (header, stream, next) => {
                    if (header.type !== "file") {
                        // just ignore
                        return next();
                    }
                    const entryFile = file.clone();
                    entryFile.path = std.path.resolve(entryFile.base, header.name);
                    entryFile.stat = entryFile.stat || new std.fs.Stats();
                    entryFile.stat.mtime = header.mtime;
                    entryFile.stat.mode = header.mode;

                    if (isBuffer) {
                        stream.pipe(adone.stream.concat()).then((data) => {
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
        });
    };
}
