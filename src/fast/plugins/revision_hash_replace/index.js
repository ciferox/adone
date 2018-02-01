export default function plugin() {
    const {
        exception,
        std: { path }
    } = adone;

    return function revisionHashReplace(options = {}) {
        let renames = [];
        const cache = [];

        if (!options.canonicalUris) {
            options.canonicalUris = true;
        }

        options.prefix = options.prefix || "";

        options.replaceInExtensions = options.replaceInExtensions || [".js", ".css", ".html", ".hbs"];

        const canonicalizeUri = (filePath) => {
            if (path.sep !== "/" && options.canonicalUris) {
                filePath = filePath.split(path.sep).join("/");
            }
            return filePath;
        };

        const fmtPath = (base, filePath) => {
            const newPath = path.relative(base, filePath);
            return canonicalizeUri(newPath);
        };

        return this.throughSync(function (file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                this.emit("error", new exception.NotSupported("Streaming is not supported"));
                return;
            }
            // Collect renames from reved files.
            if (file.revOrigPath) {
                renames.push({
                    unreved: fmtPath(file.revOrigBase, file.revOrigPath),
                    reved: options.prefix + fmtPath(file.base, file.path)
                });
            }

            if (options.replaceInExtensions.indexOf(file.extname) > -1) {
                // file should be searched for replaces
                cache.push(file);
            } else {
                // nothing to do with this file
                this.push(file);
            }
        }, async function () {
            if (options.manifest) {
                // Read manifest file for the list of renames
                const files = await options.manifest;
                for (const file of files) {
                    const manifest = JSON.parse(file.contents.toString());
                    for (const srcFile of Object.keys(manifest)) {
                        renames.push({
                            unreved: canonicalizeUri(srcFile),
                            reved: options.prefix + canonicalizeUri(manifest[srcFile])
                        });
                    }
                }
            }
            renames = renames.sort((a, b) => b.unreved.length - a.unreved.length);

            // Once we have a full list of renames, search/replace in the cached
            // files and push them through.
            for (const file of cache) {
                let contents = file.contents.toString();

                for (const rename of renames) {
                    const unreved = options.modifyUnreved ? options.modifyUnreved(rename.unreved) : rename.unreved;
                    const reved = options.modifyReved ? options.modifyReved(rename.reved) : rename.reved;
                    contents = contents.split(unreved).join(reved);
                    if (options.prefix) {
                        contents = contents.split(`/${options.prefix}`).join(`${options.prefix}/`);
                    }
                }

                file.contents = Buffer.from(contents);
                this.push(file);
            }
        });
    };
}
