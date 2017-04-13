const { is, std } = adone;

const indexRe = /^index\.(js|ajs|tjs)$/;

export default class XNamespace {
    constructor({ name, description }) {
        this.name = name;
        this.description = description;
        this.modules = [];
        this.exports = {};
    }

    static async inspect(name, pathPrefix) {
        const mapExportsToNamespace = (ns, nsModule) => Object.assign(ns.exports, adone.meta.code.Module.lazyExports(nsModule.exports()));

        const info = adone.meta.getNamespaceInfo(name);
        const ns = new XNamespace(info);

        const sources = await adone.meta.getNamespacePaths({ name, pathPrefix, relative: false });
        for (const filePath of sources) {
            const sourceModule = new adone.meta.code.Module({ nsName: name, filePath });
            await sourceModule.load();
            ns.modules.push({
                path: filePath,
                module: sourceModule
            });
        }

        if (ns.modules.length === 1) {
            const nsModule = ns.modules[0].module;
            const moduleExports = nsModule.exports();
            if (nsModule.numberOfExports() === 1 && adone.meta.code.is.object(moduleExports.default)) { // #1
                mapExportsToNamespace(ns, nsModule);
                return ns;
            } else if (nsModule.numberOfExports() >= 1 && !adone.meta.code.is.object(moduleExports.default)) { // #2
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
                    ((numberOfExports === 1 && adone.meta.code.is.functionLike(moduleExports.default) && is.string(moduleExports.default.name)) ||
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
}
