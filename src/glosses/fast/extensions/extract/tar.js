import { stripDir } from "./helpers";

const {
    is,
    archive: { tar },
    std: { fs: { Stats, constants: { S_IFDIR, S_IFLNK, S_IFREG } }, path }
} = adone;

export default () => ({
    name: "TAR",
    supportBuffer: true,
    supportStream: true,
    async run(stream, file, { dirname, strip, ...options } = {}) {
        const isBuffer = file.isBuffer();
        const unpackStream = new tar.RawUnpackStream(options);
        const p = new Promise((resolve, reject) => {
            unpackStream.on("entry", (header, entryStream, next) => {
                const entryFile = file.clone({ contents: false });
                entryFile.contents = null;
                entryFile.path = path.resolve(dirname, stripDir(header.name, strip));
                entryFile.stat = new Stats();
                entryFile.stat.mtime = header.mtime;
                entryFile.stat.mode = header.mode;
                entryFile.stat.mtimeMs = header.mtime.getTime();

                switch (header.type) {
                    case "file": {
                        entryFile.stat.mode |= S_IFREG;
                        entryStream.pipe(adone.stream.concat.create()).then((data) => {
                            if (is.array(data)) {
                                data = Buffer.from(data);
                            }
                            entryFile.contents = data;
                            stream.push(entryFile);
                            next();
                        });

                        return;
                    }
                    case "directory": {
                        entryFile.stat.mode |= S_IFDIR;
                        break;
                    }
                    case "symlink":
                    case "link": {
                        entryFile.stat.mode |= S_IFLNK;
                        entryFile.symlink = header.linkname;
                        break;
                    }
                }
                stream.push(entryFile);
                next();
            });
            unpackStream.once("finish", resolve);
            unpackStream.once("error", (err) => {
                if (!isBuffer) {
                    file.contents.close();
                }
                unpackStream.destroy();
                reject(err);
            });
        });
        if (isBuffer) {
            unpackStream.end(file.contents);
        } else {
            file.contents.pipe(unpackStream);
        }
        await p;
    }
});
