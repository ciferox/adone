const {
    error,
    is,
    realm: { code },
    std: { path }
} = adone;

/**
 * Represents nodejs-module.
 */
export default class Module {
    constructor({ sandbox, file } = {}) {
        if (!is.string(file) || file.length === 0) {
            throw new error.NotValidException("Invalid module path");
        } else if (!path.isAbsolute(file)) {
            throw new error.NotValidException("Module path should be absolute");
        }

        this.sandbox = sandbox;

        this.filename = adone.module.resolve(file);
        this.dirname = path.dirname(this.filename);

        this.dependencies = new Map();
        this.exports = new Map();
    }

    async load({ virtualPath = this.dirname } = {}) {
        this.content = await this.sandbox.loadFile(this.filename);
        this.ast = this.sandbox.parse(this.content);

        this.scope = new code.ModuleScope(this);
        this.scope.addDeclaration(new code.Variable({
            name: "__dirname",
            rawValue: this.dirname
        }));
        this.scope.addDeclaration(new code.Variable({
            name: "__filename",
            rawValue: this.filename
        }));
        this.scope.addDeclaration(new code.ExportsVariable(this.exports));
        this.scope.addDeclaration(new code.ModuleVariable(this));
        this.scope.addDeclaration(new code.RequireVariable(/* ??? */));

        this.astProcessor = new code.AstProcessor({
            module: this,
            virtualPath
        });

        // Load all dependencies
        for (const modPath of this.astProcessor.modulePaths.values()) {
            // eslint-disable-next-line no-await-in-loop
            this.addDependencyModule(await this.sandbox.loadAndCacheModule(modPath));
        }
    }

    addDependencyModule(mod) {
        this.dependencies.set(mod.filename, mod);
    }    
}
