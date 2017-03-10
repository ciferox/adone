
import * as util from "../util";

const { is } = adone;

export default function (destPath, options) {
    function setSourceRoot(file) {
        const sourceMap = file.sourceMap;
        if (is.function(options.sourceRoot)) {
            sourceMap.sourceRoot = options.sourceRoot(file);
        } else {
            sourceMap.sourceRoot = options.sourceRoot;
        }
        if (is.null(sourceMap.sourceRoot)) {
            sourceMap.sourceRoot = undefined;
        }
    }

    function mapSources(file) {
        //NOTE: make sure source mapping happens after content has been loaded
        if (options.mapSources && is.function(options.mapSources)) {
            file.sourceMap.sources = file.sourceMap.sources.map(options.mapSources);
            return;
        }

        file.sourceMap.sources = file.sourceMap.sources.map(function (filePath) {
            // keep the references files like ../node_modules within the sourceRoot
            if (options.mapSourcesAbsolute === true) {
                if (!file.dirname) {
                    filePath = adone.std.path.join(file.base, filePath).replace(file.cwd, "");
                } else {
                    filePath = adone.std.path.resolve(file.dirname, filePath).replace(file.cwd, "");
                }
            }
            return adone.util.unixifyPath(filePath);
        });
    }

    function loadContent(file) {
        const sourceMap = file.sourceMap;
        if (options.includeContent) {
            sourceMap.sourcesContent = sourceMap.sourcesContent || [];

            // load missing source content
            for (let i = 0; i < sourceMap.sources.length; i++) {
                if (!sourceMap.sourcesContent[i]) {
                    const sourcePath = adone.std.path.resolve(file.base, sourceMap.sources[i]);
                    try {
                        sourceMap.sourcesContent[i] = adone.util.stripBom(adone.std.fs.readFileSync(sourcePath, "utf8"));
                    } catch (e) {
                        //
                    }
                }
            }
        } else {
            delete sourceMap.sourcesContent;
        }
    }

    function mapDestPath(file, stream) {
        const sourceMap = file.sourceMap;

        let comment;
        const commentFormatter = util.getCommentFormatter(file);

        if (is.undefined(destPath) || is.null(destPath)) {
            // encode source map into comment
            const base64Map = Buffer.from(JSON.stringify(sourceMap)).toString("base64");
            comment = commentFormatter(`data:application/json;charset=${options.charset};base64,${base64Map}`);
        } else {
            let mapFile = `${adone.std.path.join(destPath, file.relative)}.map`;
            // custom map file name
            if (options.mapFile && is.function(options.mapFile)) {
                mapFile = options.mapFile(mapFile);
            }

            const sourceMapPath = adone.std.path.join(file.base, mapFile);

            // if explicit destination path is set
            if (options.destPath) {
                const destSourceMapPath = adone.std.path.join(file.cwd, options.destPath, mapFile);
                const destFilePath = adone.std.path.join(file.cwd, options.destPath, file.relative);
                sourceMap.file = adone.util.unixifyPath(adone.std.path.relative(adone.std.path.dirname(destSourceMapPath), destFilePath));
                if (is.undefined(sourceMap.sourceRoot)) {
                    sourceMap.sourceRoot = adone.util.unixifyPath(adone.std.path.relative(adone.std.path.dirname(destSourceMapPath), file.base));
                } else if (sourceMap.sourceRoot === "" || (sourceMap.sourceRoot && sourceMap.sourceRoot[0] === ".")) {
                    sourceMap.sourceRoot = adone.util.unixifyPath(adone.std.path.join(adone.std.path.relative(adone.std.path.dirname(destSourceMapPath), file.base), sourceMap.sourceRoot));
                }
            } else {
                // best effort, can be incorrect if options.destPath not set
                sourceMap.file = adone.util.unixifyPath(adone.std.path.relative(adone.std.path.dirname(sourceMapPath), file.path));
                if (sourceMap.sourceRoot === "" || (sourceMap.sourceRoot && sourceMap.sourceRoot[0] === ".")) {
                    sourceMap.sourceRoot = adone.util.unixifyPath(adone.std.path.join(adone.std.path.relative(adone.std.path.dirname(sourceMapPath), file.base), sourceMap.sourceRoot));
                }
            }

            const sourceMapFile = file.clone(options.clone || { deep: false, contents: false });
            sourceMapFile.path = sourceMapPath;
            sourceMapFile.contents = new Buffer(JSON.stringify(sourceMap));
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

            let sourceMapPathRelative = adone.std.path.relative(adone.std.path.dirname(file.path), sourceMapPath);

            if (options.sourceMappingURLPrefix) {
                let prefix = "";
                if (is.function(options.sourceMappingURLPrefix)) {
                    prefix = options.sourceMappingURLPrefix(file);
                } else {
                    prefix = options.sourceMappingURLPrefix;
                }
                sourceMapPathRelative = `${prefix}${adone.std.path.join("/", sourceMapPathRelative)}`;
            }
            comment = commentFormatter(adone.util.unixifyPath(sourceMapPathRelative));

            if (options.sourceMappingURL && is.function(options.sourceMappingURL)) {
                comment = commentFormatter(options.sourceMappingURL(file));
            }
        }

        // append source map comment
        if (options.addComment) {
            file.contents = Buffer.concat([file.contents, Buffer.from(comment)]);
        }
    }

    return { setSourceRoot, loadContent, mapSources, mapDestPath };
}
