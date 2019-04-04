const {
    is,
    sourcemap,
    std: {
        fs,
        path
    },
    util
} = adone;

/**
 * Mixin source map support into `compiler`.
 *
 * @param {object} `compiler`
 */
export default function mixin(compiler) {
    Object.defineProperty(compiler, "_comment", {
        value: compiler.comment,
        enumerable: false,
        configurable: true,
        writable: true
    });
    compiler.map = new sourcemap.SourceMapGenerator();
    compiler.position = { line: 1, column: 1 };
    compiler.content = {};
    compiler.files = {};

    for (const key in exports) {
        Object.defineProperty(compiler, key, {
            value: exports[key],
            writable: true,
            configurable: true,
            enumerable: false
        });
    }
}

mixin.updatePosition = function (str) {
    const lines = str.match(/\n/g);
    if (lines) {
        this.position.line += lines.length;
    }
    const i = str.lastIndexOf("\n");
    this.position.column = ~i ? str.length - i : this.position.column + str.length;
};

/**
 * Emit `str` with `position`.
 *
 * @param {string} str
 * @param {object} [pos]
 * @return {String}
 */
mixin.emit = function (str, node) {
    const position = node.position || {};
    let source = position.source;
    if (source) {
        if (position.filepath) {
            source = util.normalizePath(position.filepath);
        }

        this.map.addMapping({
            source,
            generated: {
                line: this.position.line,
                column: Math.max(this.position.column - 1, 0)
            },
            original: {
                line: position.start.line,
                column: position.start.column - 1
            }
        });

        if (position.content) {
            this.addContent(source, position);
        }
        if (position.filepath) {
            this.addFile(source, position);
        }
    }

    this.updatePosition(str);
    this.output += str;
    return str;
};

/**
 * Adds a file to the source map output if it has not already been added
 *
 * @param {string} `file`
 * @param {object} `pos`
 */
mixin.addFile = function (file, position) {
    if (!is.string(position.content)) {
        return;
    }
    if (Object.prototype.hasOwnProperty.call(this.files, file)) {
        return;
    }
    this.files[file] = position.content;
};

/**
 * Adds a content source to the source map output if it has not already been added
 *
 * @param {string} `source`
 * @param {object} `position`
 */
mixin.addContent = function (source, position) {
    if (!is.string(position.content)) {
        return;
    }
    if (Object.prototype.hasOwnProperty.call(this.content, source)) {
        return;
    }
    this.map.setSourceContent(source, position.content);
};

/**
 * Applies any original source maps to the output and embeds the source file
 * contents in the source map.
 */
mixin.applySourceMaps = function () {
    Object.keys(this.files).forEach(function (file) {
        const content = this.files[file];
        this.map.setSourceContent(file, content);

        if (this.options.inputSourcemaps === true) {
            const originalMap = adone.sourcemap.resolveSync(content, file, fs.readFileSync);
            if (originalMap) {
                const map = new sourcemap.Consumer(originalMap.map);
                const relativeTo = originalMap.sourcesRelativeTo;
                this.map.applySourceMap(map, file, util.normalizePath(path.dirname(relativeTo)));
            }
        }
    }, this);
};

/**
 * Process comments, drops sourceMap comments.
 *
 * @param {object} node
 */
mixin.comment = function (node) {
    if (/^# sourceMappingURL=/.test(node.comment)) {
        return this.emit("", node.position);
    }
    return this._comment(node);
};
