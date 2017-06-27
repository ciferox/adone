const { is, sourcemap } = adone;

const offsetMapping = (mapping, offset) => {
    return { line: offset.line + mapping.line, column: offset.column + mapping.column };
};

const newlinesIn = (src) => {
    if (!src) {
        return 0;
    }
    const newlines = src.match(/\n/g);

    return newlines ? newlines.length : 0;
};

class Generator {
    constructor(options = {}) {
        this.generator = new sourcemap.Generator({
            file: options.file || "",
            sourceRoot: options.sourceRoot || ""
        });
        this.sourcesContent = undefined;
        this.options = options;
    }

    addMappings(sourceFile, mappings, offset = {}) {
        const { generator } = this;

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

    addGeneratedMappings(sourceFile, source, offset) {
        const mappings = [];
        const linesToGenerate = newlinesIn(source) + 1;

        for (let line = 1; line <= linesToGenerate; line++) {
            const location = { line, column: 0 };
            mappings.push({ original: location, generated: location });
        }

        return this.addMappings(sourceFile, mappings, offset);
    }

    addSourceContent(sourceFile, sourcesContent) {
        this.sourcesContent = this.sourcesContent || {};
        this.sourcesContent[sourceFile] = sourcesContent;
        return this;
    }

    base64Encode() {
        const map = this.toString();
        return Buffer.from(map).toString("base64");
    }

    inlineMappingUrl() {
        const charset = this.options.charset || "utf-8";
        return `//# sourceMappingURL=data:application/json;charset=${charset};base64,${this.base64Encode()}`;
    }

    toJSON() {
        const map = this.generator.toJSON();
        if (!this.sourcesContent) {
            return map;
        }

        map.sourcesContent = map.sources.map((s) => {
            if (is.string(this.sourcesContent[s])) {
                return this.sourcesContent[s];
            }
            return null;

        });
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

export default function createGenerator(options) {
    return new Generator(options);
}

createGenerator.Generator = Generator;
