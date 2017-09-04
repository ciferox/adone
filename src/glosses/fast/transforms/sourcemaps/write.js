export default function write(destPath, options) {
    const { is, x, stream: { CoreStream: { Transform } }, util, fast: { transform: { sourcemaps: { __ } } } } = adone;

    if (is.undefined(options) && !is.string(destPath)) {
        options = destPath;
        destPath = undefined;
    }
    options = Object.assign({
        includeContent: true,
        addComment: true,
        charset: "utf8"
    }, options);

    const internals = __.write(destPath, options);

    return new Transform({
        transform(file) {
            if (file.isNull() || !file.sourceMap) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            // fix paths if Windows style paths
            file.sourceMap.file = util.unixifyPath(file.relative);

            internals.setSourceRoot(file);
            internals.loadContent(file);
            internals.mapSources(file);
            internals.mapDestPath(file, this);

            this.push(file);
        }
    });
}
