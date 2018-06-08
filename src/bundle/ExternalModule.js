import ExternalVariable from './ast/variables/ExternalVariable';
import { makeLegal } from './utils/identifierHelpers';
import { isAbsolute, normalize, relative } from './utils/path';
export default class ExternalModule {
    constructor({ graph, id }) {
        this.exportsNames = false;
        this.exportsNamespace = false;
        this.renderPath = undefined;
        this.renormalizeRenderPath = false;
        this.isExternal = true;
        this.isEntryPoint = false;
        this.mostCommonSuggestion = 0;
        this.reexported = false;
        this.used = false;
        this.execIndex = undefined;
        this.graph = graph;
        this.id = id;
        const parts = id.split(/[\\/]/);
        this.name = makeLegal(parts.pop());
        this.nameSuggestions = Object.create(null);
        this.declarations = Object.create(null);
        this.exportedVariables = new Map();
    }
    setRenderPath(options, inputBase) {
        if (options.paths)
            this.renderPath =
                typeof options.paths === 'function' ? options.paths(this.id) : options.paths[this.id];
        if (!this.renderPath) {
            if (!isAbsolute(this.id)) {
                this.renderPath = this.id;
            }
            else {
                this.renderPath = normalize(relative(inputBase, this.id));
                this.renormalizeRenderPath = true;
            }
        }
        return this.renderPath;
    }
    suggestName(name) {
        if (!this.nameSuggestions[name])
            this.nameSuggestions[name] = 0;
        this.nameSuggestions[name] += 1;
        if (this.nameSuggestions[name] > this.mostCommonSuggestion) {
            this.mostCommonSuggestion = this.nameSuggestions[name];
            this.name = name;
        }
    }
    warnUnusedImports() {
        const unused = Object.keys(this.declarations).filter(name => {
            if (name === '*')
                return false;
            const declaration = this.declarations[name];
            return !declaration.included && !this.reexported && !declaration.referenced;
        });
        if (unused.length === 0)
            return;
        const names = unused.length === 1
            ? `'${unused[0]}' is`
            : `${unused
                .slice(0, -1)
                .map(name => `'${name}'`)
                .join(', ')} and '${unused.slice(-1)}' are`;
        this.graph.warn({
            code: 'UNUSED_EXTERNAL_IMPORT',
            source: this.id,
            names: unused,
            message: `${names} imported from external module '${this.id}' but never used`
        });
    }
    traceExport(name) {
        if (name !== 'default' && name !== '*')
            this.exportsNames = true;
        if (name === '*')
            this.exportsNamespace = true;
        let declaration = this.declarations[name];
        if (declaration)
            return declaration;
        this.declarations[name] = declaration = new ExternalVariable(this, name);
        this.exportedVariables.set(declaration, name);
        return declaration;
    }
}
