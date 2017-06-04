const { is, util, sourcemap } = adone;

export default class Concat {
    constructor(generateSourceMap, fileName, separator = Buffer.alloc(0)) {
        this.lineOffset = 0;
        this.columnOffset = 0;
        this.sourceMapping = generateSourceMap;
        this.contentParts = [];
        if (!is.buffer(separator)) {
            separator = Buffer.from(separator);
        }
        this.separator = separator;
        if (this.sourceMapping) {
            this._sourceMap = sourcemap.createGenerator({ file: util.unixifyPath(fileName) });
            this.separatorLineOffset = 0;
            this.separatorColumnOffset = 0;
            const separatorString = this.separator.toString();
            for (let i = 0, n = separatorString.length; i < n; i++) {
                this.separatorColumnOffset++;
                if (separatorString[i] === "\n") {
                    this.separatorLineOffset++;
                    this.separatorColumnOffset = 0;
                }
            }
        }
    }

    add(filePath, content, sourceMap) {
        filePath = filePath && util.unixifyPath(filePath);
        if (!is.buffer(content)) {
            content = Buffer.from(content);
        }
        if (this.contentParts.length) {
            this.contentParts.push(this.separator);
        }
        this.contentParts.push(content);

        if (this.sourceMapping) {
            const contentString = content.toString();
            const lines = contentString.split("\n").length;

            if (is.string(sourceMap)) {
                sourceMap = JSON.parse(sourceMap);
            }

            if (sourceMap && sourceMap.mappings && sourceMap.mappings.length > 0) {
                const upstreamSM = adone.sourcemap.createConsumer(sourceMap);
                upstreamSM.eachMapping((mapping) => {
                    if (mapping.source) {
                        this._sourceMap.addMapping({
                            generated: {
                                line: this.lineOffset + mapping.generatedLine,
                                column: (mapping.generatedLine === 1 ? this.columnOffset : 0) + mapping.generatedColumn
                            },
                            original: {
                                line: mapping.originalLine,
                                column: mapping.originalColumn
                            },
                            source: mapping.source,
                            name: mapping.name
                        });
                    }
                });
                if (upstreamSM.sourcesContent) {
                    upstreamSM.sourcesContent.forEach((sourceContent, i) => {
                        this._sourceMap.setSourceContent(upstreamSM.sources[i], sourceContent);
                    });
                }
            } else {
                if (sourceMap && sourceMap.sources && sourceMap.sources.length > 0) {
                    filePath = sourceMap.sources[0];
                }
                if (filePath) {
                    for (let i = 1; i <= lines; i++) {
                        this._sourceMap.addMapping({
                            generated: {
                                line: this.lineOffset + i,
                                column: (i === 1 ? this.columnOffset : 0)
                            },
                            original: {
                                line: i,
                                column: 0
                            },
                            source: filePath
                        });
                    }
                    if (sourceMap && sourceMap.sourcesContent) {
                        this._sourceMap.setSourceContent(filePath, sourceMap.sourcesContent[0]);
                    }
                }
            }
            if (lines > 1) {
                this.columnOffset = 0;
            }
            if (this.separatorLineOffset === 0) {
                this.columnOffset += contentString.length - Math.max(0, contentString.lastIndexOf("\n") + 1);
            }
            this.columnOffset += this.separatorColumnOffset;
            this.lineOffset += lines - 1 + this.separatorLineOffset;
        }
    }

    get content() {
        return Buffer.concat(this.contentParts);
    }

    get sourceMap() {
        return this._sourceMap ? this._sourceMap.toString() : undefined;
    }
}
