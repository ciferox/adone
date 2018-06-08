import { SourceMap } from 'magic-string';
import error from './error';
import { basename, dirname, relative, resolve } from './path';
class Source {
    constructor(filename, content) {
        this.isOriginal = true;
        this.filename = filename;
        this.content = content;
    }
    traceSegment(line, column, name) {
        return { line, column, name, source: this };
    }
}
class Link {
    constructor(map, sources) {
        this.sources = sources;
        this.names = map.names;
        this.mappings = map.mappings;
    }
    traceMappings() {
        const sources = [];
        const sourcesContent = [];
        const names = [];
        const mappings = [];
        for (const line of this.mappings) {
            const tracedLine = [];
            for (const segment of line) {
                const source = this.sources[segment[1]];
                if (!source)
                    continue;
                const traced = source.traceSegment(segment[2], segment[3], this.names[segment[4]]);
                if (traced) {
                    // newer sources are more likely to be used, so search backwards.
                    let sourceIndex = sources.lastIndexOf(traced.source.filename);
                    if (sourceIndex === -1) {
                        sourceIndex = sources.length;
                        sources.push(traced.source.filename);
                        sourcesContent[sourceIndex] = traced.source.content;
                    }
                    else if (sourcesContent[sourceIndex] == null) {
                        sourcesContent[sourceIndex] = traced.source.content;
                    }
                    else if (traced.source.content != null &&
                        sourcesContent[sourceIndex] !== traced.source.content) {
                        error({
                            message: `Multiple conflicting contents for sourcemap source ${traced.source.filename}`
                        });
                    }
                    const tracedSegment = [
                        segment[0],
                        sourceIndex,
                        traced.line,
                        traced.column
                    ];
                    if (traced.name) {
                        let nameIndex = names.indexOf(traced.name);
                        if (nameIndex === -1) {
                            nameIndex = names.length;
                            names.push(traced.name);
                        }
                        tracedSegment[4] = nameIndex;
                    }
                    tracedLine.push(tracedSegment);
                }
            }
            mappings.push(tracedLine);
        }
        return { sources, sourcesContent, names, mappings };
    }
    traceSegment(line, column, name) {
        const segments = this.mappings[line];
        if (!segments)
            return null;
        // binary search through segments for the given column
        let i = 0;
        let j = segments.length - 1;
        while (i <= j) {
            const m = (i + j) >> 1;
            const segment = segments[m];
            if (segment[0] === column) {
                const source = this.sources[segment[1]];
                if (!source)
                    return null;
                return source.traceSegment(segment[2], segment[3], this.names[segment[4]] || name);
            }
            if (segment[0] > column) {
                j = m - 1;
            }
            else {
                i = m + 1;
            }
        }
        return null;
    }
}
// TODO TypeScript: Fix <any> typecasts
export default function collapseSourcemaps(bundle, file, map, modules, bundleSourcemapChain) {
    const moduleSources = modules.filter(module => !module.excludeFromSourcemap).map(module => {
        let sourcemapChain = module.sourcemapChain;
        let source;
        if (!module.originalSourcemap) {
            source = new Source(module.id, module.originalCode);
        }
        else {
            const sources = module.originalSourcemap.sources;
            const sourcesContent = module.originalSourcemap.sourcesContent || [];
            if (sources == null || (sources.length <= 1 && sources[0] == null)) {
                source = new Source(module.id, sourcesContent[0]);
                sourcemapChain = [module.originalSourcemap].concat(sourcemapChain);
            }
            else {
                // TODO indiscriminately treating IDs and sources as normal paths is probably bad.
                const directory = dirname(module.id) || '.';
                const sourceRoot = module.originalSourcemap.sourceRoot || '.';
                const baseSources = sources.map((source, i) => {
                    return new Source(resolve(directory, sourceRoot, source), sourcesContent[i]);
                });
                source = new Link(module.originalSourcemap, baseSources);
            }
        }
        sourcemapChain.forEach((map) => {
            if (map.missing) {
                bundle.graph.warn({
                    code: 'SOURCEMAP_BROKEN',
                    plugin: map.plugin,
                    message: `Sourcemap is likely to be incorrect: a plugin${map.plugin ? ` ('${map.plugin}')` : ``} was used to transform files, but didn't generate a sourcemap for the transformation. Consult the plugin documentation for help`,
                    url: `https://github.com/rollup/rollup/wiki/Troubleshooting#sourcemap-is-likely-to-be-incorrect`
                });
                map = {
                    names: [],
                    mappings: ''
                };
            }
            source = new Link(map, [source]);
        });
        return source;
    });
    let source = new Link(map, moduleSources);
    bundleSourcemapChain.forEach(map => {
        source = new Link(map, [source]);
    });
    let { sources, sourcesContent, names, mappings } = source.traceMappings();
    if (file) {
        const directory = dirname(file);
        sources = sources.map((source) => relative(directory, source));
        file = basename(file);
    }
    return new SourceMap({ file, sources, sourcesContent, names, mappings });
}
