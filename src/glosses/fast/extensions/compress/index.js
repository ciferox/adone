export default function plugin() {
    return function compress(compressorType, options = {}) {
        if (!(compressorType in adone.compressor)) {
            throw new adone.error.InvalidArgumentException(`Unknown compressor: ${compressorType}`);
        }

        const { compress, compressStream } = adone.compressor[compressorType];
        const extname = {
            lzma: "lzma",
            gz: "gz",
            xz: "xz",
            bz2: "bz2",
            brotli: "br",
            deflate: "zz"
        }[compressorType];

        return this.through(async function compressor(file) {
            if (file.isStream()) {
                file.contents = file.contents.pipe(compressStream(options));
            } else if (file.isBuffer()) {
                file.contents = await compress(file.contents, options);
            }
            if (options.rename !== false) {
                file.extname = `${file.extname}.${extname}`;
            }
            this.push(file);
        });
    };
}
