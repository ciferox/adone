const {
    is,
    std
} = adone;

const indexRe = /^index\.(js|ajs|tjs)$/;

export default class XNamespace {
    constructor({ name, description }) {
        this.name = name;
        this.description = description;
        this.modules = [];
        this.exports = {};
    }

    static async inspect(name, pathPrefix) {
        const mapExportsToNamespace = (ns, nsModule) => Object.assign(ns.exports, adone.js.adone.Module.lazyExports(nsModule));

        const info = adone.meta.getNamespaceInfo(name);
        const ns = new XNamespace(info);

        const sources = await adone.meta.getNamespacePaths({ name, pathPrefix, relative: false });
        for (const filePath of sources) {
            const relIndexPath = adone.std.path.normalize("/adone/src/index.js");
            let sourceModule;
            // adone.log(filePath);
            if (filePath.endsWith(relIndexPath)) {
                sourceModule = new adone.js.adone.AdoneModule({ nsName: name, filePath });
            } else {
                sourceModule = new adone.js.adone.Module({ nsName: name, filePath });
            }
            await sourceModule.load();
            ns.modules.push({
                path: filePath,
                module: sourceModule
            });
        }

        if (ns.modules.length === 1) {
            const nsModule = ns.modules[0].module;
            const moduleExports = nsModule.exports();
            if (nsModule.numberOfExports() === 1) { // #1
                mapExportsToNamespace(ns, nsModule);
                return ns;
            } else if (nsModule.numberOfExports() >= 1 && !adone.js.adone.is.object(moduleExports.default)) { // #2
                mapExportsToNamespace(ns, nsModule);
                return ns;
            }
        }

        // #3
        if (ns.modules.length >= 1) {
            const isOk = ns.modules.every((x) => {
                const nsModule = x.module;
                const moduleExports = nsModule.exports();
                const numberOfExports = nsModule.numberOfExports();
                return !indexRe.test(std.path.basename(x.path)) &&
                    ((numberOfExports === 1 && adone.js.adone.is.functionLike(moduleExports.default) && is.string(moduleExports.default.name)) ||
                        (is.undefined(moduleExports.default) && numberOfExports >= 1));
            });
            if (isOk) {
                for (const nsModInfo of ns.modules) {
                    const nsModule = nsModInfo.module;
                    mapExportsToNamespace(ns, nsModule);
                }
                return ns;
            }
        }

        return ns;
    }

    get(name) {
        if (!is.propertyOwned(this.exports, name)) {
            throw new adone.x.NotFound(`Unknown object: ${this.name}.${name}`);
        }
        return this.exports[name];
    } 
}
