/**
 * This file handles all logic for converting string-based configuration references into loaded objects.
 */

const {
    std: { path }
} = adone;

const EXACT_RE = /^module:/;
const BABEL_PLUGIN_PREFIX_RE = /^(?!@|module:|[^/]+\/|babel-plugin-)/;
const BABEL_PRESET_PREFIX_RE = /^(?!@|module:|[^/]+\/|babel-preset-)/;
const BABEL_PLUGIN_ORG_RE = /^(@babel\/)(?!plugin-|[^/]+\/)/;
const BABEL_PRESET_ORG_RE = /^(@babel\/)(?!preset-|[^/]+\/)/;
const OTHER_PLUGIN_ORG_RE = /^(@(?!babel\/)[^/]+\/)(?![^/]*babel-plugin(?:-|\/|$)|[^/]+\/)/;
const OTHER_PRESET_ORG_RE = /^(@(?!babel\/)[^/]+\/)(?![^/]*babel-preset(?:-|\/|$)|[^/]+\/)/;
const OTHER_ORG_DEFAULT_RE = /^(@(?!babel$)[^/]+)$/;

export function resolvePlugin(name: string, dirname: string): string | null {
    return resolveStandardizedName("plugin", name, dirname);
}

export function resolvePreset(name: string, dirname: string): string | null {
    return resolveStandardizedName("preset", name, dirname);
}

export function loadPlugin(name, dirname) {
    return {
        value: adone.lodash.get(adone.js.compiler.plugin, name)
    };
}

export function loadPreset(
    name: string,
    dirname: string,
): { filepath: string, value: mixed } {
    const filepath = resolvePreset(name, dirname);
    if (!filepath) {
        throw new Error(`Preset ${name} not found relative to ${dirname}`);
    }

    const value = requireModule("preset", filepath);

    return { filepath, value };
}

function standardizeName(type: "plugin" | "preset", name: string) {
    // Let absolute and relative paths through.
    if (path.isAbsolute(name)) {
        return name;
    }

    const isPreset = type === "preset";

    return (
        name
            // foo -> babel-preset-foo
            .replace(
                isPreset ? BABEL_PRESET_PREFIX_RE : BABEL_PLUGIN_PREFIX_RE,
                `babel-${type}-`,
            )
            // @babel/es2015 -> @babel/preset-es2015
            .replace(
                isPreset ? BABEL_PRESET_ORG_RE : BABEL_PLUGIN_ORG_RE,
                `$1${type}-`,
            )
            // @foo/mypreset -> @foo/babel-preset-mypreset
            .replace(
                isPreset ? OTHER_PRESET_ORG_RE : OTHER_PLUGIN_ORG_RE,
                `$1babel-${type}-`,
            )
            // @foo -> @foo/babel-preset
            .replace(OTHER_ORG_DEFAULT_RE, `$1/babel-${type}`)
            // module:mypreset -> mypreset
            .replace(EXACT_RE, "")
    );
}

const resolveStandardizedName = function (type, name, dirname = process.cwd()) {
    const standardizedName = standardizeName(type, name);

    try {
        return adone.js.Module.resolve(standardizedName, { basedir: dirname });
    } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") {
            throw e;
        }

        if (standardizedName !== name) {
            let resolvedOriginal = false;
            try {
                adone.js.Module.resolve(name, { basedir: dirname });
                resolvedOriginal = true;
            } catch (e2) { }

            if (resolvedOriginal) {
                e.message += `\n- If you want to resolve "${name}", use "module:${name}"`;
            }
        }

        let resolvedBabel = false;
        try {
            adone.js.Module.resolve(standardizeName(type, `@babel/${name}`), {
                basedir: dirname
            });
            resolvedBabel = true;
        } catch (e2) { }

        if (resolvedBabel) {
            e.message += `\n- Did you mean "@babel/${name}"?`;
        }

        let resolvedOppositeType = false;
        const oppositeType = type === "preset" ? "plugin" : "preset";
        try {
            adone.js.Module.resolve(standardizeName(oppositeType, name), { basedir: dirname });
            resolvedOppositeType = true;
        } catch (e2) { }

        if (resolvedOppositeType) {
            e.message += `\n- Did you accidentally pass a ${type} as a ${oppositeType}?`;
        }

        throw e;
    }
};

const LOADING_MODULES = new Set();
function requireModule(type: string, name: string): mixed {
    if (LOADING_MODULES.has(name)) {
        throw new Error(
            `Reentrant ${type} detected trying to load "${name}". This module is not ignored ` +
            "and is trying to load itself while compiling itself, leading to a dependency cycle. " +
            'We recommend adding it to your "ignore" list in your babelrc, or to a .babelignore.',
        );
    }

    try {
        LOADING_MODULES.add(name);
        // $FlowIssue
        return require(name);
    } finally {
        LOADING_MODULES.delete(name);
    }
}
