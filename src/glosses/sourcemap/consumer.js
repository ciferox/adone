const {
    collection,
    data,
    is,
    error,
    sourcemap,
    util
} = adone;

class Mapping {
    constructor() {
        this.generatedLine = 0;
        this.generatedColumn = 0;
        this.source = null;
        this.originalLine = null;
        this.originalColumn = null;
        this.name = null;
    }
}

export class SourceMapConsumer {
    get _generatedMappings() {
        if (!this.__generatedMappings) {
            this._parseMappings(this._mappings, this.sourceRoot);
        }

        return this.__generatedMappings;
    }

    get _originalMappings() {
        if (!this.__originalMappings) {
            this._parseMappings(this._mappings, this.sourceRoot);
        }

        return this.__originalMappings;
    }

    _charIsMappingSeparator(str, index) {
        const c = str[index];
        return c === ";" || c === ",";
    }

    _parseMapping(/* aStr, aSourceRoot */) {
        throw new error.NotImplementedException();
    }

    eachMapping(callback, context = null, order = SourceMapConsumer.GENERATED_ORDER) {
        let mappings;
        switch (order) {
            case SourceMapConsumer.GENERATED_ORDER:
                mappings = this._generatedMappings;
                break;
            case SourceMapConsumer.ORIGINAL_ORDER:
                mappings = this._originalMappings;
                break;
            default:
                throw new Error("Unknown order of iteration.");
        }

        const sourceRoot = this.sourceRoot;
        for (const mapping of mappings) {
            let source = is.null(mapping.source) ? null : this._sources.at(mapping.source);
            if (!is.nil(source) && !is.nil(sourceRoot)) {
                source = sourcemap.util.join(sourceRoot, source);
            }
            const t = {
                source,
                generatedLine: mapping.generatedLine,
                generatedColumn: mapping.generatedColumn,
                originalLine: mapping.originalLine,
                originalColumn: mapping.originalColumn,
                name: is.null(mapping.name) ? null : this._names.at(mapping.name)
            };
            callback.call(context, t);
        }
    }

    allGeneratedPositionsFor(args) {
        const line = sourcemap.util.getArg(args, "line");

        const needle = {
            source: sourcemap.util.getArg(args, "source"),
            originalLine: line,
            originalColumn: sourcemap.util.getArg(args, "column", 0)
        };

        if (!is.nil(this.sourceRoot)) {
            needle.source = sourcemap.util.relative(this.sourceRoot, needle.source);
        }
        if (!this._sources.has(needle.source)) {
            return [];
        }
        needle.source = this._sources.indexOf(needle.source);

        const mappings = [];

        let index = this._findMapping(needle,
            this._originalMappings,
            "originalLine",
            "originalColumn",
            sourcemap.util.compareByOriginalPositions,
            util.binarySearch.LEAST_UPPER_BOUND);
        if (index >= 0) {
            let mapping = this._originalMappings[index];

            if (is.undefined(args.column)) {
                const originalLine = mapping.originalLine;
                while (mapping && mapping.originalLine === originalLine) {
                    mappings.push({
                        line: sourcemap.util.getArg(mapping, "generatedLine", null),
                        column: sourcemap.util.getArg(mapping, "generatedColumn", null),
                        lastColumn: sourcemap.util.getArg(mapping, "lastGeneratedColumn", null)
                    });

                    mapping = this._originalMappings[++index];
                }
            } else {
                const originalColumn = mapping.originalColumn;
                while (
                    mapping &&
                    mapping.originalLine === line &&
                    mapping.originalColumn === originalColumn
                ) {
                    mappings.push({
                        line: sourcemap.util.getArg(mapping, "generatedLine", null),
                        column: sourcemap.util.getArg(mapping, "generatedColumn", null),
                        lastColumn: sourcemap.util.getArg(mapping, "lastGeneratedColumn", null)
                    });

                    mapping = this._originalMappings[++index];
                }
            }
        }

        return mappings;
    }
}

SourceMapConsumer.prototype._version = 3;
SourceMapConsumer.prototype.__generatedMappings = null;
SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;
SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

export class BasicSourceMapConsumer extends SourceMapConsumer {
    constructor(sourceMap) {
        super();
        if (is.string(sourceMap)) {
            sourceMap = JSON.parse(sourceMap.replace(/^\)\]\}'/, ""));
        }

        const version = sourcemap.util.getArg(sourceMap, "version");
        let sources = sourcemap.util.getArg(sourceMap, "sources");
        const names = sourcemap.util.getArg(sourceMap, "names", []);
        const sourceRoot = sourcemap.util.getArg(sourceMap, "sourceRoot", null);
        const sourcesContent = sourcemap.util.getArg(sourceMap, "sourcesContent", null);
        const mappings = sourcemap.util.getArg(sourceMap, "mappings");
        const file = sourcemap.util.getArg(sourceMap, "file", null);

        if (version !== this._version) {
            throw new error.NotSupportedException(`Unsupported version: ${version}`);
        }

        sources = sources
            .map(String)
            .map(sourcemap.util.normalize)
            .map((source) => {
                if (
                    sourceRoot &&
                    sourcemap.util.isAbsolute(sourceRoot) &&
                    sourcemap.util.isAbsolute(source)
                ) {
                    return sourcemap.util.relative(sourceRoot, source);
                }
                return source;
            });

        this._names = collection.ArraySet.from(names.map(String), true);
        this._sources = collection.ArraySet.from(sources, true);
        this.sourceRoot = sourceRoot;
        this.sourcesContent = sourcesContent;
        this._mappings = mappings;
        this.file = file;
    }

    static fromSourceMap(sourceMap) {
        const smc = Object.create(BasicSourceMapConsumer.prototype);
        const names = smc._names = collection.ArraySet.from(
            sourceMap._names.toArray(),
            true
        );
        const sources = smc._sources = collection.ArraySet.from(
            sourceMap._sources.toArray(),
            true
        );
        smc.sourceRoot = sourceMap._sourceRoot;
        smc.sourcesContent = sourceMap._generateSourcesContent(
            smc._sources.toArray(),
            smc.sourceRoot
        );
        smc.file = sourceMap._file;

        const generatedMappings = sourceMap._mappings.toArray().slice();
        const destGeneratedMappings = smc.__generatedMappings = [];
        const destOriginalMappings = smc.__originalMappings = [];

        for (const srcMapping of generatedMappings) {
            const destMapping = new Mapping();
            destMapping.generatedLine = srcMapping.generatedLine;
            destMapping.generatedColumn = srcMapping.generatedColumn;

            if (srcMapping.source) {
                destMapping.source = sources.indexOf(srcMapping.source);
                destMapping.originalLine = srcMapping.originalLine;
                destMapping.originalColumn = srcMapping.originalColumn;

                if (srcMapping.name) {
                    destMapping.name = names.indexOf(srcMapping.name);
                }

                destOriginalMappings.push(destMapping);
            }

            destGeneratedMappings.push(destMapping);
        }

        smc.__originalMappings.sort(sourcemap.util.compareByOriginalPositions);

        return smc;
    }

    get sources() {
        return this._sources.toArray().map((s) => {
            return is.nil(this.sourceRoot) ? s : sourcemap.util.join(this.sourceRoot, s);
        });
    }

    _parseMappings(str) {
        let generatedLine = 1;
        let previousGeneratedColumn = 0;
        let previousOriginalLine = 0;
        let previousOriginalColumn = 0;
        let previousSource = 0;
        let previousName = 0;
        const { length } = str;
        let index = 0;
        const cachedSegments = new Map();
        const originalMappings = [];
        const generatedMappings = [];
        let mapping;
        let segment;
        let end;
        let value;

        while (index < length) {
            if (str[index] === ";") {
                generatedLine++;
                index++;
                previousGeneratedColumn = 0;
            } else if (str[index] === ",") {
                index++;
            } else {
                mapping = new Mapping();
                mapping.generatedLine = generatedLine;

                // Because each offset is encoded relative to the previous one,
                // many segments often have the same encoding. We can exploit this
                // fact by caching the parsed variable length fields of each segment,
                // allowing us to avoid a second parse if we encounter the same
                // segment again.
                for (end = index; end < length; end++) {
                    if (this._charIsMappingSeparator(str, end)) {
                        break;
                    }
                }
                const _str = str.slice(index, end);

                segment = cachedSegments.get(_str);
                if (segment) {
                    index += _str.length;
                } else {
                    segment = [];
                    while (index < end) {
                        ({ value, index } = data.base64.decodeVLQ(str, index, true));
                        segment.push(value);
                    }

                    if (segment.length === 2) {
                        throw new error.IllegalStateException("Found a source, but no line and column");
                    }

                    if (segment.length === 3) {
                        throw new error.IllegalStateException("Found a source and line, but no column");
                    }

                    cachedSegments.set(_str, segment);
                }

                // Generated column.
                mapping.generatedColumn = previousGeneratedColumn + segment[0];
                previousGeneratedColumn = mapping.generatedColumn;

                if (segment.length > 1) {
                    // Original source.
                    mapping.source = previousSource + segment[1];
                    previousSource += segment[1];

                    // Original line.
                    mapping.originalLine = previousOriginalLine + segment[2];
                    previousOriginalLine = mapping.originalLine;
                    // Lines are stored 0-based
                    mapping.originalLine += 1;

                    // Original column.
                    mapping.originalColumn = previousOriginalColumn + segment[3];
                    previousOriginalColumn = mapping.originalColumn;

                    if (segment.length > 4) {
                        // Original name.
                        mapping.name = previousName + segment[4];
                        previousName += segment[4];
                    }
                }

                generatedMappings.push(mapping);
                if (is.number(mapping.originalLine)) {
                    originalMappings.push(mapping);
                }
            }
        }

        generatedMappings.sort(sourcemap.util.compareByGeneratedPositionsDeflated);
        this.__generatedMappings = generatedMappings;

        originalMappings.sort(sourcemap.util.compareByOriginalPositions);
        this.__originalMappings = originalMappings;
    }

    _findMapping(needle, mappings, lineName, columnName, comparator, bias) {
        if (needle[lineName] <= 0) {
            throw new error.IllegalStateException(`Line must be greater than or equal to 1, got ${needle[lineName]}`);
        }
        if (needle[columnName] < 0) {
            throw new error.IllegalStateException(`Column must be greater than or equal to 0, got ${needle[columnName]}`);
        }

        return sourcemap.util.search(mappings, needle, comparator, bias);
    }

    computeColumnSpans() {
        for (let index = 0; index < this._generatedMappings.length; ++index) {
            const mapping = this._generatedMappings[index];

            // Mappings do not contain a field for the last generated columnt.
            // We can come up with an optimistic estimate, however, by assuming that
            // mappings are contiguous (i.e. given two consecutive mappings, the
            // first mapping ends where the second one starts).
            if (index + 1 < this._generatedMappings.length) {
                const nextMapping = this._generatedMappings[index + 1];

                if (mapping.generatedLine === nextMapping.generatedLine) {
                    mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
                    continue;
                }
            }

            // The last mapping for each line spans the entire line.
            mapping.lastGeneratedColumn = Infinity;
        }
    }

    originalPositionFor(args) {
        const needle = {
            generatedLine: sourcemap.util.getArg(args, "line"),
            generatedColumn: sourcemap.util.getArg(args, "column")
        };

        const index = this._findMapping(
            needle,
            this._generatedMappings,
            "generatedLine",
            "generatedColumn",
            sourcemap.util.compareByGeneratedPositionsDeflated,
            sourcemap.util.getArg(args, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
        );

        if (index >= 0) {
            const mapping = this._generatedMappings[index];

            if (mapping.generatedLine === needle.generatedLine) {
                let source = sourcemap.util.getArg(mapping, "source", null);
                if (!is.null(source)) {
                    source = this._sources.at(source);
                    if (!is.nil(this.sourceRoot)) {
                        source = sourcemap.util.join(this.sourceRoot, source);
                    }
                }
                let name = sourcemap.util.getArg(mapping, "name", null);
                if (!is.null(name)) {
                    name = this._names.at(name);
                }
                return {
                    source,
                    line: sourcemap.util.getArg(mapping, "originalLine", null),
                    column: sourcemap.util.getArg(mapping, "originalColumn", null),
                    name
                };
            }
        }

        return {
            source: null,
            line: null,
            column: null,
            name: null
        };
    }

    hasContentsOfAllSources() {
        if (!this.sourcesContent) {
            return false;
        }
        if (this.sourcesContent.length < this._sources.length) {
            return false;
        }
        return !this.sourcesContent.some(is.nil);
    }

    sourceContentFor(source, nullOnMissing) {
        if (!this.sourcesContent) {
            return null;
        }

        if (!is.nil(this.sourceRoot)) {
            source = sourcemap.util.relative(this.sourceRoot, source);
        }

        if (this._sources.has(source)) {
            return this.sourcesContent[this._sources.indexOf(source)];
        }

        if (!is.nil(this.sourceRoot)) {
            const url = sourcemap.util.urlParse(this.sourceRoot);
            if (url) {
                const fileUriAbsPath = source.replace(/^file:\/\//, "");
                if (url.scheme === "file" && this._sources.has(fileUriAbsPath)) {
                    return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
                }

                if ((!url.path || url.path === "/") && this._sources.has(`/${source}`)) {
                    return this.sourcesContent[this._sources.indexOf(`/${source}`)];
                }
            }
        }

        // This function is used recursively from
        // IndexedSourceMapConsumer.prototype.sourceContentFor.
        // In that case, we don't want to throw if we can't find the source - we just want to
        // return null, so we provide a flag to exit gracefully.
        if (nullOnMissing) {
            return null;
        }
        throw new error.InvalidArgumentException(`"${source}" is not in the SourceMap.`);
    }

    generatedPositionFor(args) {
        let source = sourcemap.util.getArg(args, "source");
        if (!is.nil(this.sourceRoot)) {
            source = sourcemap.util.relative(this.sourceRoot, source);
        }
        if (!this._sources.has(source)) {
            return {
                line: null,
                column: null,
                lastColumn: null
            };
        }
        source = this._sources.indexOf(source);

        const needle = {
            source,
            originalLine: sourcemap.util.getArg(args, "line"),
            originalColumn: sourcemap.util.getArg(args, "column")
        };

        const index = this._findMapping(
            needle,
            this._originalMappings,
            "originalLine",
            "originalColumn",
            sourcemap.util.compareByOriginalPositions,
            sourcemap.util.getArg(args, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
        );

        if (index >= 0) {
            const mapping = this._originalMappings[index];
            if (mapping.source === needle.source) {
                return {
                    line: sourcemap.util.getArg(mapping, "generatedLine", null),
                    column: sourcemap.util.getArg(mapping, "generatedColumn", null),
                    lastColumn: sourcemap.util.getArg(mapping, "lastGeneratedColumn", null)
                };
            }
        }

        return {
            line: null,
            column: null,
            lastColumn: null
        };
    }
}

export class IndexedSourceMapConsumer extends SourceMapConsumer {
    constructor(sourceMap) {
        super();
        if (is.string(sourceMap)) {
            sourceMap = JSON.parse(sourceMap.replace(/^\)\]\}'/, ""));
        }

        const version = sourcemap.util.getArg(sourceMap, "version");
        const sections = sourcemap.util.getArg(sourceMap, "sections");

        if (version !== this._version) {
            throw new error.NotSupportedException(`Unsupported version: ${version}`);
        }

        this._sources = new collection.ArraySet();
        this._names = new collection.ArraySet();

        let lastOffset = {
            line: -1,
            column: 0
        };
        this._sections = sections.map((s) => {
            if (s.url) {
                // The url field will require support for asynchronicity.
                throw new error.IllegalStateException("Support for url field in sections not implemented.");
            }
            const offset = sourcemap.util.getArg(s, "offset");
            const offsetLine = sourcemap.util.getArg(offset, "line");
            const offsetColumn = sourcemap.util.getArg(offset, "column");

            if (offsetLine < lastOffset.line ||
                (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
                throw new error.IllegalStateException("Section offsets must be ordered and non-overlapping.");
            }
            lastOffset = offset;

            return {
                generatedOffset: {
                    // The offset fields are 0-based, but we use 1-based indices when
                    // encoding/decoding from VLQ.
                    generatedLine: offsetLine + 1,
                    generatedColumn: offsetColumn + 1
                },
                consumer: sourcemap.createConsumer(sourcemap.util.getArg(s, "map"))
            };
        });
    }

    get sources() {
        const sources = [];
        for (const section of this._sections) {
            sources.push(...section.consumer.sources);
        }
        return sources;
    }

    originalPositionFor(args) {
        const needle = {
            generatedLine: sourcemap.util.getArg(args, "line"),
            generatedColumn: sourcemap.util.getArg(args, "column")
        };

        // Find the section containing the generated position we're trying to map
        // to an original position.
        const sectionIndex = sourcemap.util.search(this._sections, needle,
            (needle, section) => {
                const cmp = needle.generatedLine - section.generatedOffset.generatedLine;
                if (cmp) {
                    return cmp;
                }

                return (needle.generatedColumn -
                    section.generatedOffset.generatedColumn);
            });

        const section = this._sections[sectionIndex];
        if (!section) {
            return {
                source: null,
                line: null,
                column: null,
                name: null
            };
        }

        return section.consumer.originalPositionFor({
            line: needle.generatedLine -
            (section.generatedOffset.generatedLine - 1),
            column: needle.generatedColumn -
            (section.generatedOffset.generatedLine === needle.generatedLine
                ? section.generatedOffset.generatedColumn - 1
                : 0),
            bias: args.bias
        });
    }

    hasContentsOfAllSources() {
        return this._sections.every((s) => s.consumer.hasContentsOfAllSources());
    }

    sourceContentFor(source, nullOnMissing) {
        for (const section of this._sections) {
            const content = section.consumer.sourceContentFor(source, true);
            if (content) {
                return content;
            }
        }
        if (nullOnMissing) {
            return null;
        }
        throw new error.InvalidArgumentException(`"${source}" is not in the SourceMap.`);
    }

    generatedPositionFor(args) {
        for (const section of this._sections) {
            // Only consider this section if the requested source is in the list of
            // sources of the consumer.
            if (!section.consumer.sources.includes(sourcemap.util.getArg(args, "source"))) {
                continue;
            }
            const generatedPosition = section.consumer.generatedPositionFor(args);
            if (generatedPosition) {
                const line = generatedPosition.line + section.generatedOffset.generatedLine - 1;
                let column = generatedPosition.column;
                if (section.generatedOffset.generatedLine === generatedPosition.line) {
                    column += section.generatedOffset.generatedColumn - 1;
                }
                return { line, column };
            }
        }

        return { line: null, column: null };
    }

    _parseMappings() {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        for (const section of this._sections) {
            for (const mapping of section.consumer._generatedMappings) {
                let source = section.consumer._sources.at(mapping.source);
                if (!is.null(section.consumer.sourceRoot)) {
                    source = sourcemap.util.join(section.consumer.sourceRoot, source);
                }
                this._sources.add(source);
                source = this._sources.indexOf(source);

                let name = section.consumer._names.at(mapping.name);
                this._names.add(name);
                name = this._names.indexOf(name);

                // The mappings coming from the consumer for the section have
                // generated positions relative to the start of the section, so we
                // need to offset them to be relative to the start of the concatenated
                // generated file.
                const generatedLine = mapping.generatedLine +
                                      section.generatedOffset.generatedLine - 1;
                let generatedColumn = mapping.generatedColumn;
                if (section.generatedOffset.generatedLine === mapping.generatedLine) {
                    generatedColumn += section.generatedOffset.generatedColumn - 1;
                }

                const adjustedMapping = {
                    source,
                    generatedLine,
                    generatedColumn,
                    originalLine: mapping.originalLine,
                    originalColumn: mapping.originalColumn,
                    name
                };

                this.__generatedMappings.push(adjustedMapping);
                if (is.number(adjustedMapping.originalLine)) {
                    this.__originalMappings.push(adjustedMapping);
                }
            }
        }

        this.__generatedMappings.sort(sourcemap.util.compareByGeneratedPositionsDeflated);
        this.__originalMappings.sort(sourcemap.util.compareByOriginalPositions);
    }
}

export const createConsumer = (sourceMap) => {
    if (is.string(sourceMap)) {
        sourceMap = JSON.parse(sourceMap.replace(/^\)\]\}'/, ""));
    }

    if (!is.nil(sourceMap.sections)) {
        return new IndexedSourceMapConsumer(sourceMap);
    }

    return new BasicSourceMapConsumer(sourceMap);
};
