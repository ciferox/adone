const {
    js: { compiler: { types: t } }
} = adone;

export const ImportSpecifier = function (node) {
    if (node.importKind === "type" || node.importKind === "typeof") {
        this.word(node.importKind);
        this.space();
    }

    this.print(node.imported, node);
    if (node.local && node.local.name !== node.imported.name) {
        this.space();
        this.word("as");
        this.space();
        this.print(node.local, node);
    }
};

export const ImportDefaultSpecifier = function (node) {
    this.print(node.local, node);
};

export const ExportDefaultSpecifier = function (node) {
    this.print(node.exported, node);
};

export const ExportSpecifier = function (node) {
    this.print(node.local, node);
    if (node.exported && node.local.name !== node.exported.name) {
        this.space();
        this.word("as");
        this.space();
        this.print(node.exported, node);
    }
};

export const ExportNamespaceSpecifier = function (node) {
    this.token("*");
    this.space();
    this.word("as");
    this.space();
    this.print(node.exported, node);
};

export const ExportAllDeclaration = function (node) {
    this.word("export");
    this.space();
    if (node.exportKind === "type") {
        this.word("type");
        this.space();
    }
    this.token("*");
    this.space();
    this.word("from");
    this.space();
    this.print(node.source, node);
    this.semicolon();
};

const ExportDeclaration = function (node) {
    if (node.declaration) {
        const declar = node.declaration;
        this.print(declar, node);
        if (!t.isStatement(declar)) {
            this.semicolon();
        }
    } else {
        if (node.exportKind === "type") {
            this.word("type");
            this.space();
        }

        const specifiers = node.specifiers.slice(0);

        // print "special" specifiers first
        let hasSpecial = false;
        while (true) {
            const first = specifiers[0];
            if (
                t.isExportDefaultSpecifier(first) ||
                t.isExportNamespaceSpecifier(first)
            ) {
                hasSpecial = true;
                this.print(specifiers.shift(), node);
                if (specifiers.length) {
                    this.token(",");
                    this.space();
                }
            } else {
                break;
            }
        }

        if (specifiers.length || (!specifiers.length && !hasSpecial)) {
            this.token("{");
            if (specifiers.length) {
                this.space();
                this.printList(specifiers, node);
                this.space();
            }
            this.token("}");
        }

        if (node.source) {
            this.space();
            this.word("from");
            this.space();
            this.print(node.source, node);
        }

        this.semicolon();
    }
};


export const ExportNamedDeclaration = function (node) {
    if (
        this.format.decoratorsBeforeExport &&
        t.isClassDeclaration(node.declaration)
    ) {
        this.printJoin(node.declaration.decorators, node);
    }

    this.word("export");
    this.space();
    ExportDeclaration.apply(this, arguments);
};

export const ExportDefaultDeclaration = function (node) {
    if (
        this.format.decoratorsBeforeExport &&
        t.isClassDeclaration(node.declaration)
    ) {
        this.printJoin(node.declaration.decorators, node);
    }

    this.word("export");
    this.space();
    this.word("default");
    this.space();
    ExportDeclaration.apply(this, arguments);
};

export const ImportDeclaration = function (node) {
    this.word("import");
    this.space();

    if (node.importKind === "type" || node.importKind === "typeof") {
        this.word(node.importKind);
        this.space();
    }

    const specifiers = node.specifiers.slice(0);
    if (specifiers && specifiers.length) {
        // print "special" specifiers first
        while (true) {
            const first = specifiers[0];
            if (
                t.isImportDefaultSpecifier(first) ||
                t.isImportNamespaceSpecifier(first)
            ) {
                this.print(specifiers.shift(), node);
                if (specifiers.length) {
                    this.token(",");
                    this.space();
                }
            } else {
                break;
            }
        }

        if (specifiers.length) {
            this.token("{");
            this.space();
            this.printList(specifiers, node);
            this.space();
            this.token("}");
        }

        this.space();
        this.word("from");
        this.space();
    }

    this.print(node.source, node);
    this.semicolon();
};

export const ImportNamespaceSpecifier = function (node) {
    this.token("*");
    this.space();
    this.word("as");
    this.space();
    this.print(node.local, node);
};
