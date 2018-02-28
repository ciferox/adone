export default function es(chunk, magicString, { getPath, intro, outro }) {
    const { dependencies, exports } = chunk.getModuleDeclarations();
    const importBlock = dependencies.map(({ id, reexports, imports, name }) => {
        if (!reexports && !imports) {
            return `import '${getPath(id)}';`;
        }
        let output = "";
        if (imports) {
            const defaultImport = imports.find((specifier) => specifier.imported === "default");
            const starImport = imports.find((specifier) => specifier.imported === "*");
            if (starImport) {
                output += `import * as ${starImport.local} from '${getPath(id)}';`;
                if (imports.length > 1) {
                    output += "\n"; 
                }
            }
            if (defaultImport && imports.length === 1) {
                output += `import ${defaultImport.local} from '${getPath(id)}';`;
            } else if (!starImport || imports.length > 1) {
                output += `import ${defaultImport ? `${defaultImport.local}, ` : ""}{ ${imports
                    .filter((specifier) => specifier !== defaultImport && specifier !== starImport)
                    .map((specifier) => {
                        if (specifier.imported === specifier.local) {
                            return specifier.imported;
                        } 
                        return `${specifier.imported} as ${specifier.local}`;
                        
                    })
                    .join(", ")} } from '${getPath(id)}';`;
            }
        }
        if (reexports) {
            if (imports) {
                output += "\n"; 
            }
            const starExport = reexports.find((specifier) => specifier.reexported === "*");
            const namespaceReexport = reexports.find((specifier) => specifier.imported === "*" && specifier.reexported !== "*");
            if (starExport) {
                output += `export * from '${getPath(id)}';`;
                if (reexports.length === 1) {
                    return output;
                }
                output += "\n";
            }
            if (namespaceReexport) {
                output += `import * as ${name} from '${getPath(id)}';\n`;
                output += `export { ${name === namespaceReexport.reexported ? name : `${name} as ${namespaceReexport.reexported}`} };`;
                if (reexports.length === (starExport ? 2 : 1)) {
                    return output;
                }
                output += "\n";
            }
            output += `export { ${reexports
                .filter((specifier) => specifier !== starExport && specifier !== namespaceReexport)
                .map((specifier) => {
                    if (specifier.imported === specifier.reexported) {
                        return specifier.imported;
                    } 
                    return `${specifier.imported} as ${specifier.reexported}`;
                    
                })
                .join(", ")} } from '${getPath(id)}';`;
        }
        return output;
    }).join("\n");
    if (importBlock) {
        intro += `${importBlock}\n\n`;
    }
    if (intro) {
        magicString.prepend(intro); 
    }
    const exportBlock = [];
    const exportDeclaration = [];
    exports.forEach((specifier) => {
        if (specifier.exported === "default") {
            exportBlock.push(`export default ${specifier.local};`);
        } else {
            exportDeclaration.push(specifier.exported === specifier.local ? specifier.local : `${specifier.local} as ${specifier.exported}`);
        }
    });
    if (exportDeclaration.length) {
        exportBlock.push(`export { ${exportDeclaration.join(", ")} };`);
    }
    if (exportBlock.length) {
        magicString.append(`\n\n${ exportBlock.join("\n").trim()}`);
    } // TODO TypeScript: Awaiting PR
    if (outro) {
        magicString.append(outro);
    } // TODO TypeScript: Awaiting PR
    return magicString.trim(); // TODO TypeScript: Awaiting PR
}