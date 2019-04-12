import tar from "./tar";

const {
    compressor: { xz: { decompress, decompressStream } }
} = adone;

const extract = tar();

export default () => ({
    name: "XZ",
    supportBuffer: true,
    supportStream: true,
    async run(stream, file, { dirname, ...options } = {}) {
        if (file.isStream()) {
            file.contents = file.contents.pipe(decompressStream(options));
        } else if (file.isBuffer()) {
            file.contents = await decompress(file.contents, options);
            if (file.extname === ".xz") {
                file.extname = "";
            }
        }

        return extract.run(stream, file, {
            ...options,
            dirname
        });
    }
});
