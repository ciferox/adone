const {
    js: { compiler: { types: t, helper: { pluginUtils: { declare } } } }
} = adone;

export default declare((api) => {
    api.assertVersion(7);

    return {
        name: "proposal-export-default-from",
        inherits: adone.js.compiler.plugin.syntax.exportDefaultFrom,

        visitor: {
            ExportNamedDeclaration(path) {
                const { node, scope } = path;
                const { specifiers } = node;
                if (!t.isExportDefaultSpecifier(specifiers[0])) {return;}

                const specifier = specifiers.shift();
                const { exported } = specifier;
                const uid = scope.generateUidIdentifier(exported.name);

                const nodes = [
                    t.importDeclaration(
                        [t.importDefaultSpecifier(uid)],
                        t.cloneNode(node.source),
                    ),
                    t.exportNamedDeclaration(null, [
                        t.exportSpecifier(t.cloneNode(uid), exported)
                    ])
                ];

                if (specifiers.length >= 1) {
                    nodes.push(node);
                }

                path.replaceWithMultiple(nodes);
            }
        }
    };
});
