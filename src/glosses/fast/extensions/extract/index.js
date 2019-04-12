const {
    is,
    std,
    error,
    util: { detectFileType }
} = adone;

const __ = adone.lazify({
    zip: "./zip",
    tar: "./tar",
    gz: "./gz",
    xz: "./xz",
    br: "./br"
}, null, require);

export default function plugin() {
    return function extract(options) {
        return this.through(async function (file) {
            let handler = null;
            if (file.isBuffer()) {
                const header = file.contents.slice(0, detectFileType.minimumBytes);
                const fileType = detectFileType(header);

                if (is.null(fileType)) {
                    // try interpret by ext
                    switch (file.extname) {
                        case ".br":
                            handler = __.br();
                            break;
                        default:
                            throw new error.NotSupportedException(`Unsupported file format: ${file.extname}`);
                    }
                } else if (fileType.ext in __) {
                    handler = __[fileType.ext]();
                }
            }

            if (!is.null(handler)) {
                if (file.isStream() && handler.supportStream) {
                    //
                } else if (file.isBuffer() && handler.supportBuffer) {
                    await handler.run(this, file, {
                        ...options,
                        dirname: file.dirname
                    });
                } else {
                    throw new error.NotSupportedException(`${handler.name} extractor not support such content type: ${adone.typeOf(file.contents)}`);
                }
            } else {
                throw new error.NotSupportedException(`Unsupported file format: ${file.extname}`);
            }
        });
    };
}
