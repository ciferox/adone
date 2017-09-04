// @flow

/**
 * This file handles all logic for converting string-based configuration references into loaded objects.
 */

import resolve from "resolve";

const {
    is,
    std: { path }
} = adone;

const EXACT_RE = /^module:/;
const BABEL_PLUGIN_PREFIX_RE = /^(?!@|module:|[^/\/]+[/\/]|babel-plugin-)/;
const BABEL_PRESET_PREFIX_RE = /^(?!@|module:|[^/\/]+[/\/]|babel-preset-)/;
const BABEL_PLUGIN_ORG_RE = /^(@babel[/\/])(?!plugin-|[^/\/]+[/\/])/;
const BABEL_PRESET_ORG_RE = /^(@babel[/\/])(?!preset-|[^/\/]+[/\/])/;
const OTHER_PLUGIN_ORG_RE = /^(@(?!babel[/\/])[^/\/]+[/\/])(?!babel-plugin-|[^/\/]+[/\/])/;
const OTHER_PRESET_ORG_RE = /^(@(?!babel[/\/])[^/\/]+[/\/])(?!babel-preset-|[^/\/]+[/\/])/;

const standardizeName = (type: "plugin" | "preset", name: string) => {
    // Let absolute and relative paths through.
    if (path.isAbsolute(name)) { 
        return name;
    }

    const isPreset = type === "preset";

    return (
        name
            // foo -> babel-preset-foo
            .replace(isPreset ? BABEL_PRESET_PREFIX_RE : BABEL_PLUGIN_PREFIX_RE, `${type}-`)
            // @babel/es2015 -> @babel/preset-es2015
            .replace(isPreset ? BABEL_PRESET_ORG_RE : BABEL_PLUGIN_ORG_RE, `$1${type}-`)
            // @foo/mypreset -> @foo/babel-preset-mypreset
            .replace(isPreset ? OTHER_PRESET_ORG_RE : OTHER_PLUGIN_ORG_RE, `$1${type}-`)
            // module:mypreset -> mypreset
            .replace(EXACT_RE, "")
    );
};

// const resolveStandardizedName = (type: "plugin" | "preset", name: string, dirname: string = process.cwd()) => {
//     const standardizedName = standardizeName(type, name);

//     try {
//         return resolve.sync(standardizedName, { basedir: dirname });
//     } catch (e) {
//         if (e.code !== "MODULE_NOT_FOUND") { 
//             throw e; 
//         }

//         if (standardizedName !== name) {
//             let resolvedOriginal = false;
//             try {
//                 resolve.sync(name, { basedir: dirname });
//                 resolvedOriginal = true;
//             } catch (e2) { }

//             if (resolvedOriginal) {
//                 // eslint-disable-next-line max-len
//                 e.message += `\n- If you want to resolve "${name}", use "module:${name}"`;
//             }
//         }

//         let resolvedBabel = false;
//         try {
//             resolve.sync(standardizeName(type, `@babel/${name}`), {
//                 basedir: dirname
//             });
//             resolvedBabel = true;
//         } catch (e2) { }

//         if (resolvedBabel) {
//             // eslint-disable-next-line max-len
//             e.message += `\n- Did you mean "@babel/${name}"?`;
//         }

//         let resolvedOppositeType = false;
//         const oppositeType = type === "preset" ? "plugin" : "preset";
//         try {
//             resolve.sync(standardizeName(oppositeType, name), { basedir: dirname });
//             resolvedOppositeType = true;
//         } catch (e2) { }

//         if (resolvedOppositeType) {
//             // eslint-disable-next-line max-len
//             e.message += `\n- Did you accidentally pass a ${type} as a ${oppositeType}?`;
//         }

//         throw e;
//     }
// };

const LOADING_MODULES = new Set();
const requireModule = (type: string, name: string): mixed => {
    if (LOADING_MODULES.has(name)) {
        throw new Error(
            // eslint-disable-next-line max-len
            `Reentrant ${type} detected trying to load "${name}". This module is not ignored and is trying to load itself while compiling itself, leading to a dependency cycle. We recommend adding it to your "ignore" list in your babelrc, or to a .babelignore.`,
        );
    }

    try {
        LOADING_MODULES.add(name);
        // $FlowIssue
        return adone.vendor.lodash.get(adone.js.compiler.plugin, name);
        // return require(name);
    } finally {
        LOADING_MODULES.delete(name);
    }
};


// export const resolvePlugin = (name: string, dirname: string): string | null => resolveStandardizedName("plugin", name, dirname);

// export const resolvePreset = (name: string, dirname: string): string | null => resolveStandardizedName("preset", name, dirname);

export const loadPlugin = (name: string): { value: mixed } => {
    return {
        value: adone.vendor.lodash.get(adone.js.compiler.plugin, name)
    };
};

// export const loadPreset = (name: string, dirname: string): { filepath: string, value: mixed } => {
//     const filepath = resolvePreset(name, dirname);
//     if (!filepath) {
//         throw new Error(`Preset ${name} not found relative to ${dirname}`);
//     }

//     const value = requireModule("preset", filepath);

//     return { filepath, value };
// };

export const loadParser = (name: string, dirname: string): { filepath: string, value: Function } => {
    const filepath = resolve.sync(name, { basedir: dirname });

    const mod = requireModule("parser", filepath);

    if (!mod) {
        throw new Error(
            `Parser ${name} relative to ${dirname} does not export an object`,
        );
    }
    if (!is.function(mod.parse)) {
        throw new Error(
            `Parser ${name} relative to ${dirname} does not export a .parse function`,
        );
    }
    const value = mod.parse;

    return {
        filepath,
        value
    };
};

export const loadGenerator = (name: string, dirname: string): { filepath: string, value: Function } => {
    const filepath = resolve.sync(name, { basedir: dirname });

    const mod = requireModule("generator", filepath);

    if (!mod) {
        throw new Error(
            `Generator ${name} relative to ${dirname} does not export an object`,
        );
    }
    if (!is.function(mod.print)) {
        throw new Error(
            `Generator ${name} relative to ${dirname} does not export a .print function`,
        );
    }
    const value = mod.print;

    return {
        filepath,
        value
    };
};
