import * as util from "../util";

const { urlRegex } = util;

export default function (options, file, fileContent) {
    function loadMaps() {

        const sources = {
            path: "",
            map: null,
            content: fileContent,
            preExistingComment: null
        };

        getInlineSources(sources);
        if (!sources.map) {
            getFileSources(sources);
        }

        fixSources(sources);

        return sources;
    }

    function fixSources(sources) {
        // fix source paths and sourceContent for imported source map
        if (sources.map) {
            sources.map.sourcesContent = sources.map.sourcesContent || [];
            sources.map.sources.forEach(function (source, i) {
                if (source.match(urlRegex)) {
                    sources.map.sourcesContent[i] = sources.map.sourcesContent[i] || null;
                    return;
                }
                let absPath = adone.std.path.resolve(sources.path, source);
                sources.map.sources[i] = adone.util.unixifyPath(adone.std.path.relative(file.base, absPath));

                if (!sources.map.sourcesContent[i]) {
                    let sourceContent = null;
                    if (sources.map.sourceRoot) {
                        if (sources.map.sourceRoot.match(urlRegex)) {
                            sources.map.sourcesContent[i] = null;
                            return;
                        }
                        absPath = adone.std.path.resolve(sources.path, sources.map.sourceRoot, source);
                    }

                    // if current file: use content
                    if (absPath === file.path) {
                        sourceContent = sources.content;
                    } else { //attempt load content from file
                        try {
                            sourceContent = adone.util.stripBom(adone.std.fs.readFileSync(absPath, "utf8"));
                        } catch (e) {
                            //
                        }
                    }
                    sources.map.sourcesContent[i] = sourceContent;
                }

            });
            // remove source map comment from source
            file.contents = Buffer.from(sources.content, "utf8");
        }

    }

    function getInlineSources(sources) {
        sources.preExistingComment = util.getInlinePreExisting(sources.content);
        // Try to read inline source map
        sources.map = adone.sourcemap.convert.fromSource(sources.content, options.largeFile);

        if (!sources.map)
            return sources;

        sources.map = sources.map.toObject();
        // sources in map are relative to the source file
        sources.path = adone.std.path.dirname(file.path);
        if (!options.largeFile) {
            sources.content = adone.sourcemap.convert.removeComments(sources.content);
        }
    }

    function getFileSources(sources) {
        // look for source map comment referencing a source map file
        const mapComment = adone.sourcemap.convert.getMapFileCommentRegex().exec(sources.content);

        let mapFile;
        if (mapComment) {
            sources.preExistingComment = mapComment[1] || mapComment[2];
            mapFile = adone.std.path.resolve(adone.std.path.dirname(file.path), sources.preExistingComment);
            sources.content = adone.sourcemap.convert.removeMapFileComments(sources.content);
            // if no comment try map file with same name as source file
        } else {
            mapFile = `${file.path}.map`;
        }

        // sources in external map are relative to map file
        sources.path = adone.std.path.dirname(mapFile);

        try {
            sources.map = JSON.parse(adone.util.stripBom(adone.std.fs.readFileSync(mapFile, "utf8")));
        } catch (e) {
            //should we really swallow this error?
        }
    }

    return { loadMaps };
}
