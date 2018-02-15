import getInteropBlock from "./shared/getInteropBlock";
import getExportBlock from "./shared/getExportBlock";
import esModuleExport from "./shared/esModuleExport";
import warnOnBuiltins from "./shared/warnOnBuiltins";
export default function amd(chunk, magicString, { exportMode, getPath, indentString, intro, outro }, options) {
    warnOnBuiltins(chunk);
    const { dependencies, exports } = chunk.getModuleDeclarations();
    const deps = dependencies.map((m) => `'${getPath(m.id)}'`);
    const args = dependencies.map((m) => m.name);
    if (exportMode === "named") {
        args.unshift("exports");
        deps.unshift("'exports'");
    }
    const amdOptions = options.amd || {};
    const params = (amdOptions.id ? `'${amdOptions.id}', ` : "") +
        (deps.length ? `[${deps.join(", ")}], ` : "");
    const useStrict = options.strict !== false ? " 'use strict';" : "";
    const define = amdOptions.define || "define";
    const wrapperStart = `${define}(${params}function (${args.join(", ")}) {${useStrict}\n\n`;
    // var foo__default = 'default' in foo ? foo['default'] : foo;
    const interopBlock = getInteropBlock(chunk, options);
    if (interopBlock) {
        magicString.prepend(`${interopBlock}\n\n`);
    }
    if (intro) {
        magicString.prepend(intro);
    }
    const exportBlock = getExportBlock(exports, dependencies, exportMode);
    if (exportBlock) {
        magicString.append(`\n\n${exportBlock}`); 
    } // TODO TypeScript: Awaiting PR
    if (exportMode === "named" && options.legacy !== true && chunk.isEntryModuleFacade) {
        magicString.append(`\n\n${esModuleExport}`); 
    } // TODO TypeScript: Awaiting PR
    if (outro) {
        magicString.append(outro);
    }
    return magicString // TODO TypeScript: Awaiting PR
        .indent(indentString)
        .append("\n\n});")
        .prepend(wrapperStart);
}
