import __ from ".";

export default function writeInternals(destPath, options) {
    const { is, util, std: { path, fs } } = adone;

    const setSourceRoot = (file) => {
        const { sourceMap } = file;
        if (is.function(options.sourceRoot)) {
            sourceMap.sourceRoot = options.sourceRoot(file);
        } else {
            sourceMap.sourceRoot = options.sourceRoot;
        }
        if (is.null(sourceMap.sourceRoot)) {
            sourceMap.sourceRoot = undefined;
        }
    };

    const mapSources = (file) => {
        //NOTE: make sure source mapping happens after content has been loaded
        if (options.mapSources && is.function(options.mapSources)) {
            file.sourceMap.sources = file.sourceMap.sources.map((path) => options.mapSources(path, file));
            return;
        }

        file.sourceMap.sources = file.sourceMap.sources.map((filePath) => {
            // keep the references files like ../node_modules within the sourceRoot
            if (options.mapSourcesAbsolute === true) {
                if (!file.dirname) {
                    filePath = path.join(file.base, filePath).replace(file.cwd, "");
                } else {
                    filePath = path.resolve(file.dirname, filePath).replace(file.cwd, "");
                }
            }
            return util.unixifyPath(filePath);
        });
    };

    const loadContent = (file) => {
        const sourceMap = file.sourceMap;
        if (options.includeContent) {
            sourceMap.sourcesContent = sourceMap.sourcesContent || [];

            // load missing source content
            for (let i = 0; i < sourceMap.sources.length; i++) {
                if (!sourceMap.sourcesContent[i]) {
                    const sourcePath = path.resolve(file.base, sourceMap.sources[i]);
                    try {
                        sourceMap.sourcesContent[i] = util.stripBom(fs.readFileSync(sourcePath, "utf8"));
                    } catch (e) {
                        //
                    }
                }
            }
        } else {
            delete sourceMap.sourcesContent;
        }
    };

    const mapDestPath = (file, stream) => {
        const sourceMap = file.sourceMap;

        let comment;
        const commentFormatter = __.util.getCommentFormatter(file);

        if (is.nil(destPath)) {
            // encode source map into comment
            const base64Map = Buffer.from(JSON.stringify(sourceMap)).toString("base64");
            comment = commentFormatter(`data:application/json;charset=${options.charset};base64,${base64Map}`);
        } else {
            let mapFile = `${path.join(destPath, file.relative)}.map`;
            // custom map file name
            if (options.mapFile && is.function(options.mapFile)) {
                mapFile = options.mapFile(mapFile);
            }

            const sourceMapPath = path.join(file.base, mapFile);

            // if explicit destination path is set
            if (options.destPath) {
                const destSourceMapPath = path.join(file.cwd, options.destPath, mapFile);
                const destFilePath = path.join(file.cwd, options.destPath, file.relative);
                sourceMap.file = util.unixifyPath(path.relative(path.dirname(destSourceMapPath), destFilePath));
                if (is.undefined(sourceMap.sourceRoot)) {
                    sourceMap.sourceRoot = util.unixifyPath(path.relative(path.dirname(destSourceMapPath), file.base));
                } else if (sourceMap.sourceRoot === "" || (sourceMap.sourceRoot && sourceMap.sourceRoot[0] === ".")) {
                    sourceMap.sourceRoot = util.unixifyPath(
                        path.join(
                            path.relative(path.dirname(destSourceMapPath), file.base),
                            sourceMap.sourceRoot
                        )
                    );
                }
            } else {
                // best effort, can be incorrect if options.destPath not set
                sourceMap.file = util.unixifyPath(path.relative(path.dirname(sourceMapPath), file.path));
                if (sourceMap.sourceRoot === "" || (sourceMap.sourceRoot && sourceMap.sourceRoot[0] === ".")) {
                    sourceMap.sourceRoot = util.unixifyPath(
                        path.join(
                            path.relative(path.dirname(sourceMapPath), file.base),
                            sourceMap.sourceRoot
                        )
                    );
                }
            }

            const sourceMapFile = file.clone(options.clone || { deep: false, contents: false });
            sourceMapFile.path = sourceMapPath;
            sourceMapFile.contents = Buffer.from(JSON.stringify(sourceMap));
            sourceMapFile.stat = {
                isFile: () => true,
                isDirectory: () => false,
                isBlockDevice: () => false,
                isCharacterDevice: () => false,
                isSymbolicLink: () => false,
                isFIFO: () => false,
                isSocket: () => false
            };
            stream.push(sourceMapFile);

            let sourceMapPathRelative = path.relative(path.dirname(file.path), sourceMapPath);

            if (options.sourceMappingURLPrefix) {
                let prefix = "";
                if (is.function(options.sourceMappingURLPrefix)) {
                    prefix = options.sourceMappingURLPrefix(file);
                } else {
                    prefix = options.sourceMappingURLPrefix;
                }
                sourceMapPathRelative = `${prefix}${path.join("/", sourceMapPathRelative)}`;
            }
            comment = commentFormatter(sourceMapPathRelative.split("\\").join("/"));

            if (options.sourceMappingURL && is.function(options.sourceMappingURL)) {
                comment = commentFormatter(options.sourceMappingURL(file));
            }
        }

        // append source map comment
        if (options.addComment) {
            file.contents = Buffer.concat([file.contents, Buffer.from(comment)]);
        }
    };

    return { setSourceRoot, loadContent, mapSources, mapDestPath };
}
