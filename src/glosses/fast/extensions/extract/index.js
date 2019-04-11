const {
    is,
    std,
    error,
    util: { detectFileType }
} = adone;

const __ = adone.lazify({
    zip: "./zip"
}, null, require);

export default function plugin() {
    return function extract({ inRoot = true, dirname, ...extractorOptions } = {}) {
        return this.through(async function extracting(file) {
            const _dirname = inRoot
                ? file.dirname
                : dirname
                    ? dirname
                    : std.path.resolve(file.dirname, file.stem);

            if (file.isBuffer()) {
                const header = file.contents.slice(0, detectFileType.minimumBytes);
                const fileType = detectFileType(header);

                let handler;
                if (fileType.ext in __) {
                    handler = __[fileType.ext]();
                }

                if (file.isStream() && handler.supportStream) {
                    //
                } else if (file.isBuffer() && handler.supportBuffer) {
                    await handler.run(this, file, {
                        ...extractorOptions,
                        dirname: _dirname
                    });
                } else {
                    throw new error.NotSupportedException(`${handler.name} extractor not support such content type: ${adone.typeOf(file.contents)}`);
                }
            }
            // else if (file.isStream()) {

            // }
        });
    };
}
