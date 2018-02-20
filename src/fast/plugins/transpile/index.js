const {
    is,
    std: { path },
    util
} = adone;

const { helper } = adone.private(adone.fast);

const replacer = ({ file, base, map } = {}) => {
    return {
        visitor: {
            ImportDeclaration(p) {
                const source = p.node.source.value;
                const res = map(source, file);
                if (is.array(res)) {
                    const [key, mapTo] = res;
                    const sourceRelative = path.relative(key, source);
                    const fileBase = base(source, file);
                    const mappedRelative = path.resolve(mapTo, sourceRelative);
                    if (!is.string(fileBase)) {
                        throw new adone.error.IllegalState("`base` should be a string");
                    }
                    const mappedFilename = path.resolve(fileBase, file.relative);
                    p.node.source.value = `./${path.relative(path.dirname(mappedFilename), mappedRelative)}`;
                }
            }
        }
    };
};

export default function transpilePlugin() {
    return function transpile(options) {
        options = util.clone(options);
        const importReplace = options.importReplace;
        delete options.importReplace;
        if (importReplace) {
            const { base, map } = importReplace;
            if (!is.function(base)) {
                importReplace.base = () => base;
            }
            if (!is.function(map)) {
                const sources = Object.keys(map);
                importReplace.map = (source) => {
                    for (const p of sources) {
                        if (source.startsWith(p)) {
                            return [p, map[p]];
                        }
                    }
                };
            }
        }

        return this.throughSync(function (file) {
            if (!file.isNull()) {
                let plugins = options.plugins;
                if (importReplace) {
                    const plugin = replacer({ file, ...importReplace });
                    plugins = plugins ? plugins.concat([plugin]) : [plugin];
                    delete options.importReplace;
                }
                const result = adone.js.compiler.core.transform(file.contents.toString(), adone.o(options, {
                    plugins,
                    filename: file.path,
                    filenameRelative: file.relative,
                    sourceMap: Boolean(file.sourceMap),
                    sourceFileName: file.relative,
                    sourceMapTarget: file.relative
                }));

                if (file.sourceMap && result.map) {
                    helper.applySourceMap(file, result.map);
                }

                if (!result.ignored) {
                    file.contents = Buffer.from(result.code);
                }
            }
            this.push(file);
        });
    };
}
