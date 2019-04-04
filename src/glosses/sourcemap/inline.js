/* eslint-disable func-style */

const {
    is,
    sourcemap: { SourceMapGenerator }
} = adone;

function offsetMapping(mapping, offset) {
    return { line: offset.line + mapping.line, column: offset.column + mapping.column };
}

function newlinesIn(src) {
    if (!src) {
        return 0;
    }
    const newlines = src.match(/\n/g);

    return newlines ? newlines.length : 0;
}

export class Generator {
    constructor(opts) {
        opts = opts || {};
        this.generator = new SourceMapGenerator({ file: opts.file || "", sourceRoot: opts.sourceRoot || "" });
        this.sourcesContent = undefined;
        this.opts = opts;
    }

    /**
     * Adds the given mappings to the generator and offsets them if offset is given
     *
     * @name addMappings
     * @function
     * @param sourceFile {String} name of the source file
     * @param mappings {Array{{Object}} each object has the form { original: { line: _, column: _ }, generated: { line: _, column: _ } }
     * @param offset {Object} offset to apply to each mapping. Has the form { line: _, column: _ }
     * @return {Object} the generator to allow chaining
     */
    addMappings(sourceFile, mappings, offset) {
        const generator = this.generator;

        offset = offset || {};
        offset.line = offset.hasOwnProperty("line") ? offset.line : 0;
        offset.column = offset.hasOwnProperty("column") ? offset.column : 0;

        mappings.forEach((m) => {
            // only set source if we have original position to handle edgecase (see inline-source-map tests)
            generator.addMapping({
                source: m.original ? sourceFile : undefined,
                original: m.original,
                generated: offsetMapping(m.generated, offset)
            });
        });
        return this;
    }

    /**
     * Generates mappings for the given source, assuming that no translation from original to generated is necessary.
     *
     * @name addGeneratedMappings
     * @function
     * @param sourceFile {String} name of the source file
     * @param source {String} source of the file
     * @param offset {Object} offset to apply to each mapping. Has the form { line: _, column: _ }
     * @return {Object} the generator to allow chaining
     */
    addGeneratedMappings(sourceFile, source, offset) {
        const mappings = [];
        const linesToGenerate = newlinesIn(source) + 1;

        for (let line = 1; line <= linesToGenerate; line++) {
            const location = { line, column: 0 };
            mappings.push({ original: location, generated: location });
        }

        return this.addMappings(sourceFile, mappings, offset);
    }

    /**
     * Adds source content for the given source file.
     * 
     * @name addSourceContent
     * @function
     * @param sourceFile {String} The source file for which a mapping is included
     * @param sourcesContent {String} The content of the source file
     * @return {Object} The generator to allow chaining
     */
    addSourceContent(sourceFile, sourcesContent) {
        this.sourcesContent = this.sourcesContent || {};
        this.sourcesContent[sourceFile] = sourcesContent;
        return this;
    }

    /**
     * @name base64Encode
     * @function
     * @return {String} bas64 encoded representation of the added mappings
     */
    base64Encode() {
        const map = this.toString();
        return Buffer.from(map).toString("base64");
    }

    /**
     * @name inlineMappingUrl
     * @function
     * @return {String} comment with base64 encoded representation of the added mappings. Can be inlined at the end of the generated file. 
     */
    inlineMappingUrl() {
        const charset = this.opts.charset || "utf-8";
        return `//# sourceMappingURL=data:application/json;charset=${charset};base64,${this.base64Encode()}`;
    }

    toJSON() {
        const map = this.generator.toJSON();
        if (!this.sourcesContent) {
            return map;
        }

        const toSourcesContent = (function (s) {
            if (is.string(this.sourcesContent[s])) {
                return this.sourcesContent[s];
            }
            return null;

        }).bind(this);
        map.sourcesContent = map.sources.map(toSourcesContent);
        return map;
    }

    toString() {
        return JSON.stringify(this);
    }

    _mappings() {
        return this.generator._mappings._array;
    }

    gen() {
        return this.generator;
    }
}

export const generate = (opts) => new Generator(opts);
