import groupArray from "group-array";

import transform from "./transform";
import tags from "./tags";


const escapeStringRegexp = adone.text.escape.regExpPattern;
const { std: { path }, fast: { Fast } } = adone;

export default function (sources, options = {}) {
    if (!sources) {
        throw new adone.x.InvalidArgument("Missing sources stream!");
    }

    if (options.templateString) {
        throw new adone.x.InvalidArgument("`templateString` option is deprecated! Create a virtual file instead!");
    }
    if (options.transform && !adone.is.function(options.transform)) {
        throw new adone.x.InvalidArgument("transform options must be a function");
    }
    // Notify people of common mistakes...
    if (!adone.is.undefined(options.read)) {
        throw new adone.x.InvalidArgument("There is no `read` options. Did you mean to provide it for `fast.src` perhaps?");
    }

    options = adone.vendor.lodash.defaults(options, {
        relative: false,
        addRootSlash: !options.relative,
        transform,
        tags: tags(),
        name: "inject"
    });

    transform.selfClosingTag = options.selfClosingTag || false;

    // Is the first parameter a Vinyl File Stream:
    if (adone.is.function(sources.on) && adone.is.function(sources.pipe)) {
        sources = Promise.resolve(sources);
        return new Fast(null, {
            async transform(file) {
                if (file.isStream()) {
                    throw new adone.x.NotSupported("Streams not supported for target templates!");
                }

                const collected = await sources;
                file.contents = getNewContent(file, collected, options);
                this.push(file);
            }
        });
    }

    throw new Error("Passing target file as a string is deprecated! Pass a file stream (i.e. use `fast.src`)!");
}

/**
 * Get new content for template
 * with all injections made
 *
 * @param {Object} target
 * @param {Array} collection
 * @param {Object} options
 * @returns {Buffer}
 */
function getNewContent(target, collection, options) {
    let content = String(target.contents);
    const targetExt = target.extname.slice(1);
    const files = prepareFiles(collection, targetExt, options, target);
    const filesPerTags = groupArray(files, "tagKey");
    const startAndEndTags = adone.util.keys(filesPerTags);
    const matches = [];

    startAndEndTags.forEach((tagKey) => {
        const files = filesPerTags[tagKey];
        const startTag = files[0].startTag;
        const endTag = files[0].endTag;
        const tagsToInject = getTagsToInject(files, target, options);
        content = inject(content, {
            startTag,
            endTag,
            tagsToInject,
            removeTags: options.removeTags,
            empty: options.empty,
            onMatch(match) {
                matches.push(match[0]);
            }
        });
    });

    if (options.empty) {
        const ext = "{{ANY}}";
        const startTag = getTagRegExp(options.tags.start(targetExt, ext, options.starttag), ext, options);
        const endTag = getTagRegExp(options.tags.end(targetExt, ext, options.starttag), ext, options);

        content = inject(content, {
            startTag,
            endTag,
            tagsToInject: [],
            removeTags: options.removeTags,
            empty: options.empty,
            shouldAbort: (match) => {
                return matches.indexOf(match[0]) !== -1;
            }
        });
    }

    return new Buffer(content);
}

/**
 * Inject tags into content for given
 * start and end tags
 *
 * @param {String} content
 * @param {Object} options
 * @returns {String}
 */
function inject(content, options) {
    const startTag = options.startTag;
    const endTag = options.endTag;
    let startMatch;
    let endMatch;

    /**
     * The content consists of:
     *
     * <everything before startMatch>
     * <startMatch>
     * <previousInnerContent>
     * <endMatch>
     * <everything after endMatch>
     */

    while ((startMatch = startTag.exec(content)) !== null) {
        if (typeof options.onMatch === "function") {
            options.onMatch(startMatch);
        }
        if (typeof options.shouldAbort === "function" && options.shouldAbort(startMatch)) {
            continue;
        }
        // Take care of content length change:
        endTag.lastIndex = startTag.lastIndex;
        endMatch = endTag.exec(content);
        if (!endMatch) {
            throw Error(`Missing end tag for start tag: ${startMatch[0]}`);
        }
        const toInject = options.tagsToInject.slice();

        if (typeof options.willInject === "function") {
            options.willInject(toInject);
        }

        // <everything before startMatch>:
        let newContents = content.slice(0, startMatch.index);

        if (options.removeTags) {
            if (options.empty) {
                // Take care of content length change:
                startTag.lastIndex -= startMatch[0].length;
            }
        } else {
            // <startMatch> + <endMatch>
            toInject.unshift(startMatch[0]);
            toInject.push(endMatch[0]);
        }
        const previousInnerContent = content.substring(startTag.lastIndex, endMatch.index);
        const indent = getLeadingWhitespace(previousInnerContent);
        // <new inner content>:
        newContents += toInject.join(indent);
        // <everything after endMatch>:
        newContents += content.slice(endTag.lastIndex);
        // replace old content with new:
        content = newContents;
    }

    return content;
}

function getLeadingWhitespace(str) {
    return str.match(/^\s*/)[0];
}

function prepareFiles(files, targetExt, options, target) {
    return files.map((file) => {
        const ext = file.extname.slice(1);
        const filePath = getFilepath(file, target, options);
        const startTag = getTagRegExp(options.tags.start(targetExt, ext, options.starttag), ext, options, filePath);
        const endTag = getTagRegExp(options.tags.end(targetExt, ext, options.endtag), ext, options, filePath);
        const tagKey = String(startTag) + String(endTag);
        return {
            file,
            ext,
            startTag,
            endTag,
            tagKey
        };
    });
}

function getTagRegExp(tag, sourceExt, options, sourcePath) {
    tag = makeWhiteSpaceOptional(escapeStringRegexp(tag));
    tag = replaceVariables(tag, {
        name: options.name,
        path: sourcePath,
        ext: sourceExt === "{{ANY}}" ? ".+" : sourceExt
    });
    return new RegExp(tag, "ig");
}

function replaceVariables(str, variables) {
    return Object.keys(variables).reduce((str, variable) => {
        return str.replace(new RegExp(escapeStringRegexp(escapeStringRegexp(`{{${variable}}}`)), "ig"), `${variables[variable]}\\b`);
    }, str);
}

function makeWhiteSpaceOptional(str) {
    return str.replace(/\s+/g, "\\s*");
}

function getTagsToInject(files, target, options) {
    return files.reduce(function transformFile(lines, file, i, files) {
        const filepath = getFilepath(file.file, target, options);
        const transformedContents = options.transform(filepath, file.file, i, files.length, target);
        if (!adone.is.string(transformedContents)) {
            return lines;
        }
        return lines.concat(transformedContents);
    }, []);
}

function getFilepath(sourceFile, targetFile, options = {}) {
    const ignorePath = adone.util.arrify(options.ignorePath);
    const base = options.relative ? path.dirname(addRootSlash(unixify(targetFile.path))) : addRootSlash(unixify(sourceFile.cwd));

    let filepath = unixify(path.relative(base, addRootSlash(unixify(sourceFile.path))));

    if (ignorePath.length) {
        filepath = removeBasePath(ignorePath, filepath);
    }

    if (options.addPrefix) {
        filepath = addPrefix(filepath, options.addPrefix);
    }

    if (options.addRootSlash) {
        filepath = addRootSlash(filepath);
    } else if (!options.addPrefix) {
        filepath = removeRootSlash(filepath);
    }

    if (options.addSuffix) {
        filepath = filepath + options.suffix;
    }

    return filepath;
}

function unixify(filepath) {
    return filepath.replace(/\\/g, "/");
}
function addRootSlash(filepath) {
    return filepath.replace(/^\/*([^\/])/, "/$1");
}
function removeRootSlash(filepath) {
    return filepath.replace(/^\/+/, "");
}
function addPrefix(filepath, prefix) {
    return prefix + addRootSlash(filepath);
}

function removeBasePath(basedirs, filepath) {
    return basedirs.map(unixify).reduce((path, remove) => {
        if (path[0] === "/" && remove[0] !== "/") {
            remove = `/${remove}`;
        }
        if (path[0] !== "/" && remove[0] === "/") {
            path = `/${path}`;
        }
        if (remove && path.indexOf(remove) === 0) {
            return path.slice(remove.length);
        }
        return path;
    }, filepath);
}
