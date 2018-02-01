const {
    exception,
    is,
    util,
    sourcemap
} = adone;

const REGEX_NEWLINE = /(\r?\n)/;
const NEWLINE_CODE = 10;

const isSourceNode = "$$$isSourceNode$$$";

export default class SourceNode {
    constructor(line = null, column = null, source = null, chunks = null, name = null) {
        this.children = [];
        this.sourceContents = {};
        this.line = line;
        this.column = column;
        this.source = source;
        this.name = name;
        this[isSourceNode] = true;

        if (!is.nil(chunks)) {
            this.add(chunks);
        }
    }

    static fromStringWithSourceMap(generatedCode, consumer, relativePath) {
        const node = new SourceNode();

        const remainingLines = generatedCode.split(REGEX_NEWLINE);
        const shiftNextLine = () => {
            const lineContents = remainingLines.shift();
            const newLine = remainingLines.shift() || "";
            return lineContents + newLine;
        };

        let lastGeneratedLine = 1;
        let lastGeneratedColumn = 0;

        let lastMapping = null;

        const addMappingWithCode = (mapping, code) => {
            if (is.null(mapping) || is.undefined(mapping.source)) {
                node.add(code);
            } else {
                const source = relativePath ? sourcemap.util.join(relativePath, mapping.source) :
                    mapping.source;
                node.add(new SourceNode(
                    mapping.originalLine,
                    mapping.originalColumn,
                    source,
                    code,
                    mapping.name
                ));
            }
        };

        consumer.eachMapping((mapping) => {
            if (!is.null(lastMapping)) {
                if (lastGeneratedLine < mapping.generatedLine) {
                    addMappingWithCode(lastMapping, shiftNextLine());
                    lastGeneratedLine++;
                    lastGeneratedColumn = 0;
                } else {
                    const [nextLine] = remainingLines;
                    const code = nextLine.slice(
                        0,
                        mapping.generatedColumn - lastGeneratedColumn
                    );
                    remainingLines[0] = nextLine.slice(
                        mapping.generatedColumn - lastGeneratedColumn
                    );
                    lastGeneratedColumn = mapping.generatedColumn;
                    addMappingWithCode(lastMapping, code);
                    lastMapping = mapping;
                    return;
                }
            }
            while (lastGeneratedLine < mapping.generatedLine) {
                node.add(shiftNextLine());
                lastGeneratedLine++;
            }
            if (lastGeneratedColumn < mapping.generatedColumn) {
                const [nextLine] = remainingLines;
                node.add(nextLine.slice(0, mapping.generatedColumn));
                remainingLines[0] = nextLine.slice(mapping.generatedColumn);
                lastGeneratedColumn = mapping.generatedColumn;
            }
            lastMapping = mapping;
        });
        if (remainingLines.length > 0) {
            if (lastMapping) {
                addMappingWithCode(lastMapping, shiftNextLine());
            }
            node.add(remainingLines.join(""));
        }

        consumer.sources.forEach((sourceFile) => {
            const content = consumer.sourceContentFor(sourceFile);
            if (!is.nil(content)) {
                if (!is.nil(relativePath)) {
                    sourceFile = sourcemap.util.join(relativePath, sourceFile);
                }
                node.setSourceContent(sourceFile, content);
            }
        });

        return node;
    }

    add(chunk) {
        if (is.array(chunk)) {
            for (const c of chunk) {
                this.add(c);
            }
        } else if (chunk[isSourceNode] || is.string(chunk)) {
            if (chunk) {
                this.children.push(chunk);
            }
        } else {
            throw new exception.InvalidArgument(`Expected a SourceNode, string, or an array of SourceNodes and strings. Got ${chunk}`);
        }
        return this;
    }

    prepend(chunk) {
        if (is.array(chunk)) {
            for (let i = chunk.length - 1; i >= 0; i--) {
                this.prepend(chunk[i]);
            }
        } else if (chunk[isSourceNode] || is.string(chunk)) {
            this.children.unshift(chunk);
        } else {
            throw new exception.InvalidArgument(`Expected a SourceNode, string, or an array of SourceNodes and strings. Got ${chunk}`);
        }
        return this;
    }

    walk(fn) {
        for (const chunk of this.children) {
            if (chunk[isSourceNode]) {
                chunk.walk(fn);
            } else {
                if (chunk !== "") {
                    fn(chunk, {
                        source: this.source,
                        line: this.line,
                        column: this.column,
                        name: this.name
                    });
                }
            }
        }
    }

    join(sep) {
        if (!this.children.length) {
            return this;
        }
        const newChildren = [];
        for (let i = 0; i < this.children.length - 1; i++) {
            newChildren.push(this.children[i]);
            newChildren.push(sep);
        }
        newChildren.push(this.children[this.children.length - 1]);
        this.children = newChildren;
        return this;
    }

    replaceRight(pattern, replacement) {
        const lastChild = this.children[this.children.length - 1];
        if (lastChild[isSourceNode]) {
            lastChild.replaceRight(pattern, replacement);
        } else if (is.string(lastChild)) {
            this.children[this.children.length - 1] = lastChild.replace(pattern, replacement);
        } else {
            this.children.push("".replace(pattern, replacement));
        }
        return this;
    }

    setSourceContent(source, content) {
        this.sourceContents[source] = content;
    }

    walkSourceContents(fn) {
        for (const child of this.children) {
            if (child[isSourceNode]) {
                child.walkSourceContents(fn);
            }
        }

        for (const [k, v] of util.entries(this.sourceContents)) {
            fn(k, v);
        }
    }

    toString() {
        let str = "";
        this.walk((chunk) => {
            str += chunk;
        });
        return str;
    }

    toStringWithSourceMap(args) {
        const generated = {
            code: "",
            line: 1,
            column: 0
        };
        const map = new sourcemap.Generator(args);
        let sourceMappingActive = false;
        let lastOriginalSource = null;
        let lastOriginalLine = null;
        let lastOriginalColumn = null;
        let lastOriginalName = null;
        this.walk((chunk, original) => {
            generated.code += chunk;
            if (
                original.source !== null &&
                original.line !== null &&
                original.column !== null
            ) {
                if (
                    lastOriginalSource !== original.source ||
                    lastOriginalLine !== original.line ||
                    lastOriginalColumn !== original.column ||
                    lastOriginalName !== original.name
                ) {
                    map.addMapping({
                        source: original.source,
                        original: {
                            line: original.line,
                            column: original.column
                        },
                        generated: {
                            line: generated.line,
                            column: generated.column
                        },
                        name: original.name
                    });
                }
                lastOriginalSource = original.source;
                lastOriginalLine = original.line;
                lastOriginalColumn = original.column;
                lastOriginalName = original.name;
                sourceMappingActive = true;
            } else if (sourceMappingActive) {
                map.addMapping({
                    generated: {
                        line: generated.line,
                        column: generated.column
                    }
                });
                lastOriginalSource = null;
                sourceMappingActive = false;
            }
            for (let idx = 0; idx < chunk.length; ++idx) {
                if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
                    generated.line++;
                    generated.column = 0;
                    // Mappings end at eol
                    if (idx + 1 === chunk.length) {
                        lastOriginalSource = null;
                        sourceMappingActive = false;
                    } else if (sourceMappingActive) {
                        map.addMapping({
                            source: original.source,
                            original: {
                                line: original.line,
                                column: original.column
                            },
                            generated: {
                                line: generated.line,
                                column: generated.column
                            },
                            name: original.name
                        });
                    }
                } else {
                    generated.column++;
                }
            }
        });
        this.walkSourceContents((sourceFile, sourceContent) => {
            map.setSourceContent(sourceFile, sourceContent);
        });

        return { code: generated.code, map };
    }
}
