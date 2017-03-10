// @flow


const { types } = adone.js.compiler;

export const ModuleDeclaration = {
    enter(path, file) {
        const { node } = path;
        if (node.source) {
            node.source.value = file.resolveModuleSource(node.source.value);
        }
    }
};

export const ImportDeclaration = {
    exit(path, file) {
        const { node } = path;

        const specifiers = [];
        const imported = [];
        file.metadata.modules.imports.push({
            source: node.source.value,
            imported,
            specifiers
        });

        for (const specifier of (path.get("specifiers"): Object[])) {
            const local = specifier.node.local.name;

            if (specifier.isImportDefaultSpecifier()) {
                imported.push("default");
                specifiers.push({
                    kind: "named",
                    imported: "default",
                    local
                });
            }

            if (specifier.isImportSpecifier()) {
                const importedName = specifier.node.imported.name;
                imported.push(importedName);
                specifiers.push({
                    kind: "named",
                    imported: importedName,
                    local
                });
            }

            if (specifier.isImportNamespaceSpecifier()) {
                imported.push("*");
                specifiers.push({
                    kind: "namespace",
                    local
                });
            }
        }
    }
};

export const ExportDeclaration = (path, file) => {
    const { node } = path;

    const source = node.source ? node.source.value : null;
    const exports = file.metadata.modules.exports;

    // export function foo() {}
    // export let foo = "bar";
    const declar = path.get("declaration");
    if (declar.isStatement()) {
        const bindings = declar.getBindingIdentifiers();

        for (const name in bindings) {
            exports.exported.push(name);
            exports.specifiers.push({
                kind: "local",
                local: name,
                exported: path.isExportDefaultDeclaration() ? "default" : name
            });
        }
    }

    if (path.isExportNamedDeclaration() && node.specifiers) {
        for (const specifier of (node.specifiers: Object[])) {
            const exported = specifier.exported.name;
            exports.exported.push(exported);

            // export foo from "bar";
            if (types.isExportDefaultSpecifier(specifier)) {
                exports.specifiers.push({
                    kind: "external",
                    local: exported,
                    exported,
                    source
                });
            }

            // export * as foo from "bar";
            if (types.isExportNamespaceSpecifier(specifier)) {
                exports.specifiers.push({
                    kind: "external-namespace",
                    exported,
                    source
                });
            }

            const local = specifier.local;
            if (!local) {
                continue;
            }

            // export { foo } from "bar";
            // export { foo as bar } from "bar";
            if (source) {
                exports.specifiers.push({
                    kind: "external",
                    local: local.name,
                    exported,
                    source
                });
            }

            // export { foo };
            // export { foo as bar };
            if (!source) {
                exports.specifiers.push({
                    kind: "local",
                    local: local.name,
                    exported
                });
            }
        }
    }

    // export * from "bar";
    if (path.isExportAllDeclaration()) {
        exports.specifiers.push({
            kind: "external-all",
            source
        });
    }
};

export const Scope = (path) => {
    path.skip();
};
