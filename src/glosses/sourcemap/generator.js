const { is, x, data, collection, sourcemap } = adone;

export class SourceMapGenerator {
    constructor(args = {}) {
        this._file = sourcemap.util.getArg(args, "file", null);
        this._sourceRoot = sourcemap.util.getArg(args, "sourceRoot", null);
        this._skipValidation = sourcemap.util.getArg(args, "skipValidation", false);
        this._sources = new collection.ArraySet();
        this._names = new collection.ArraySet();
        this._mappings = new sourcemap.MappingList();
        this._sourcesContents = null;
    }

    static fromSourceMap(consumer) {
        const sourceRoot = consumer.sourceRoot;
        const generator = new SourceMapGenerator({
            file: consumer.file,
            sourceRoot
        });
        consumer.eachMapping((mapping) => {
            const newMapping = {
                generated: {
                    line: mapping.generatedLine,
                    column: mapping.generatedColumn
                }
            };

            if (!is.nil(mapping.source)) {
                newMapping.source = mapping.source;
                if (!is.nil(sourceRoot)) {
                    newMapping.source = sourcemap.util.relative(sourceRoot, newMapping.source);
                }

                newMapping.original = {
                    line: mapping.originalLine,
                    column: mapping.originalColumn
                };

                if (!is.nil(mapping.name)) {
                    newMapping.name = mapping.name;
                }
            }

            generator.addMapping(newMapping);
        });
        consumer.sources.forEach((sourceFile) => {
            const content = consumer.sourceContentFor(sourceFile);
            if (!is.nil(content)) {
                generator.setSourceContent(sourceFile, content);
            }
        });
        return generator;
    }

    addMapping(args) {
        const generated = sourcemap.util.getArg(args, "generated");
        const original = sourcemap.util.getArg(args, "original", null);
        let source = sourcemap.util.getArg(args, "source", null);
        let name = sourcemap.util.getArg(args, "name", null);

        if (!this._skipValidation) {
            this._validateMapping(generated, original, source, name);
        }

        if (!is.nil(source)) {
            source = String(source);
            if (!this._sources.has(source)) {
                this._sources.add(source);
            }
        }

        if (!is.nil(name)) {
            name = String(name);
            if (!this._names.has(name)) {
                this._names.add(name);
            }
        }

        const originalLine = is.nil(original) ? null : original.line;
        const originalColumn = is.nil(original) ? null : original.column;

        this._mappings.add({
            generatedLine: generated.line,
            generatedColumn: generated.column,
            originalLine,
            originalColumn,
            source,
            name
        });
    }

    setSourceContent(source, content) {
        if (!is.nil(this._sourceRoot)) {
            source = sourcemap.util.relative(this._sourceRoot, source);
        }

        if (!is.nil(content)) {
            // Add the source content to the _sourcesContents map.
            // Create a new _sourcesContents map if the property is null.
            if (!this._sourcesContents) {
                this._sourcesContents = Object.create(null);
            }
            this._sourcesContents[source] = content;
        } else if (this._sourcesContents) {
            // Remove the source file from the _sourcesContents map.
            // If the _sourcesContents map is empty, set the property to null.
            delete this._sourcesContents[source];
            if (is.emptyObject(this._sourcesContents)) {
                this._sourcesContents = null;
            }
        }
    }

    applySourceMap(consumer, sourceFile, sourcemapPath) {
        if (is.nil(sourceFile)) {
            if (is.nil(consumer.file)) {
                throw new x.InvalidArgument("requires either an explicit source file, or the source map's \"file\" property");
            }
            sourceFile = consumer.file;
        }
        const sourceRoot = this._sourceRoot;
        // Make "sourceFile" relative if an absolute Url is passed.
        if (!is.nil(sourceRoot)) {
            sourceFile = sourcemap.util.relative(sourceRoot, sourceFile);
        }
        const newSources = new collection.ArraySet();
        const newNames = new collection.ArraySet();

        // Find mappings for the "sourceFile"
        this._mappings.unsortedForEach((mapping) => {
            if (mapping.source === sourceFile && !is.nil(mapping.originalLine)) {
                // Check if it can be mapped by the source map, then update the mapping.
                const original = consumer.originalPositionFor({
                    line: mapping.originalLine,
                    column: mapping.originalColumn
                });
                if (!is.nil(original.source)) {
                    // Copy mapping
                    mapping.source = original.source;
                    if (!is.nil(sourcemapPath)) {
                        mapping.source = sourcemap.util.join(sourcemapPath, mapping.source);
                    }
                    if (!is.nil(sourceRoot)) {
                        mapping.source = sourcemap.util.relative(sourceRoot, mapping.source);
                    }
                    mapping.originalLine = original.line;
                    mapping.originalColumn = original.column;
                    if (!is.nil(original.name)) {
                        mapping.name = original.name;
                    }
                }
            }

            const source = mapping.source;
            if (!is.nil(source) && !newSources.has(source)) {
                newSources.add(source);
            }

            const name = mapping.name;
            if (!is.nil(name) && !newNames.has(name)) {
                newNames.add(name);
            }

        }, this);
        this._sources = newSources;
        this._names = newNames;

        // Copy sourcesContents of applied map.
        for (let sourceFile of consumer.sources) {
            const content = consumer.sourceContentFor(sourceFile);
            if (!is.nil(content)) {
                if (!is.nil(sourcemapPath)) {
                    sourceFile = sourcemap.util.join(sourcemapPath, sourceFile);
                }
                if (!is.nil(sourceRoot)) {
                    sourceFile = sourcemap.util.relative(sourceRoot, sourceFile);
                }
                this.setSourceContent(sourceFile, content);
            }
        }
    }

    /**
     * A mapping can have one of the three levels of data:
     *
     *   1. Just the generated position.
     *   2. The Generated position, original position, and original source.
     *   3. Generated and original position, original source, as well as a name
     *      token.
     *
     * To maintain consistency, we validate that any new mapping being added falls
     * in to one of these categories.
     */
    _validateMapping(generated, original, source, name) {
        if (
            generated && "line" in generated && "column" in generated &&
            generated.line > 0 && generated.column >= 0 &&
            !original && !source && !name
        ) {
            // Case 1.
            return;
        }
        if (
            generated && "line" in generated && "column" in generated &&
            original && "line" in original && "column" in original &&
            generated.line > 0 && generated.column >= 0 &&
            original.line > 0 && original.column >= 0 &&
            source
        ) {
            // Cases 2 and 3.
            return;
        }
        throw new x.Exception(`Invalid mapping: ${JSON.stringify({
            generated,
            source,
            original,
            name
        })}`);
    }

    _serializeMappings() {
        let previousGeneratedColumn = 0;
        let previousGeneratedLine = 1;
        let previousOriginalColumn = 0;
        let previousOriginalLine = 0;
        let previousName = 0;
        let previousSource = 0;
        let result = "";
        let next;
        let nameIdx;
        let sourceIdx;
        const { util: { compareByGeneratedPositionsInflated } } = sourcemap;

        const mappings = this._mappings.toArray();
        for (let i = 0; i < mappings.length; i++) {
            const mapping = mappings[i];
            next = "";

            if (mapping.generatedLine !== previousGeneratedLine) {
                previousGeneratedColumn = 0;
                while (mapping.generatedLine !== previousGeneratedLine) {
                    next += ";";
                    previousGeneratedLine++;
                }
            } else {
                if (i > 0) {
                    if (!compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
                        continue;
                    }
                    next += ",";
                }
            }

            next += data.base64.encodeVLQ(mapping.generatedColumn
                - previousGeneratedColumn);
            previousGeneratedColumn = mapping.generatedColumn;

            if (!is.nil(mapping.source)) {
                sourceIdx = this._sources.indexOf(mapping.source);
                next += data.base64.encodeVLQ(sourceIdx - previousSource);
                previousSource = sourceIdx;

                // lines are stored 0-based in SourceMap spec version 3
                next += data.base64.encodeVLQ(mapping.originalLine - 1
                    - previousOriginalLine);
                previousOriginalLine = mapping.originalLine - 1;

                next += data.base64.encodeVLQ(mapping.originalColumn
                    - previousOriginalColumn);
                previousOriginalColumn = mapping.originalColumn;

                if (!is.nil(mapping.name)) {
                    nameIdx = this._names.indexOf(mapping.name);
                    next += data.base64.encodeVLQ(nameIdx - previousName);
                    previousName = nameIdx;
                }
            }

            result += next;
        }

        return result;
    }

    _generateSourcesContent(sources, sourceRoot) {
        return sources.map((source) => {
            if (!this._sourcesContents) {
                return null;
            }
            if (!is.nil(sourceRoot)) {
                source = sourcemap.util.relative(sourceRoot, source);
            }
            const key = source;
            if (is.propertyOwned(this._sourcesContents, key)) {
                return this._sourcesContents[key];
            }
            return null;
        });
    }

    toJSON() {
        const map = {
            version: this._version,
            sources: this._sources.toArray(),
            names: this._names.toArray(),
            mappings: this._serializeMappings()
        };
        if (!is.nil(this._file)) {
            map.file = this._file;
        }
        if (!is.nil(this._sourceRoot)) {
            map.sourceRoot = this._sourceRoot;
        }
        if (this._sourcesContents) {
            map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
        }

        return map;
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }
}

SourceMapGenerator.prototype._version = 3;

export const createGenerator = (args) => new SourceMapGenerator(args);
