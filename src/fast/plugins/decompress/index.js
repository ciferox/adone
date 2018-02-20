export default function plugin() {
    return function decompress(compressorName, options = {}) {
        if (!(compressorName in adone.compressor)) {
            throw new adone.error.InvalidArgument(`Unknown compressor: ${compressorName}`);
        }

        const { decompress, decompressStream } = adone.compressor[compressorName];

        return this.through(async function decompressing(file) {
            if (file.isStream()) {
                file.contents = file.contents.pipe(decompressStream(options));
            } else if (file.isBuffer()) {
                file.contents = await decompress(file.contents, options);
            }
            this.push(file);
        });
    };
}
