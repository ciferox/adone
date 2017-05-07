const { data: { yaml }, is, x, util, text } = adone;

const CHAR_TAB = 0x09;
const CHAR_LINE_FEED = 0x0A;
const CHAR_SPACE = 0x20;
const CHAR_EXCLAMATION = 0x21;
const CHAR_DOUBLE_QUOTE = 0x22;
const CHAR_SHARP = 0x23;
const CHAR_PERCENT = 0x25;
const CHAR_AMPERSAND = 0x26;
const CHAR_SINGLE_QUOTE = 0x27;
const CHAR_ASTERISK = 0x2A;
const CHAR_COMMA = 0x2C;
const CHAR_MINUS = 0x2D;
const CHAR_COLON = 0x3A;
const CHAR_GREATER_THAN = 0x3E;
const CHAR_QUESTION = 0x3F;
const CHAR_COMMERCIAL_AT = 0x40;
const CHAR_LEFT_SQUARE_BRACKET = 0x5B;
const CHAR_RIGHT_SQUARE_BRACKET = 0x5D;
const CHAR_GRAVE_ACCENT = 0x60;
const CHAR_LEFT_CURLY_BRACKET = 0x7B;
const CHAR_VERTICAL_LINE = 0x7C;
const CHAR_RIGHT_CURLY_BRACKET = 0x7D;

const ESCAPE_SEQUENCES = new Map([
    [0x00, "\\0"],
    [0x07, "\\a"],
    [0x08, "\\b"],
    [0x09, "\\t"],
    [0x0A, "\\n"],
    [0x0B, "\\v"],
    [0x0C, "\\f"],
    [0x0D, "\\r"],
    [0x1B, "\\e"],
    [0x22, '\\"'],
    [0x5C, "\\\\"],
    [0x85, "\\N"],
    [0xA0, "\\_"],
    [0x2028, "\\L"],
    [0x2029, "\\P"]
]);

const DEPRECATED_BOOLEANS_SYNTAX = new Set([
    "y", "Y", "yes", "Yes", "YES", "on", "On", "ON",
    "n", "N", "no", "No", "NO", "off", "Off", "OFF"
]);

const compileStyleMap = (schema, map) => {
    if (is.null(map)) {
        return {};
    }

    const result = {};

    for (let tag of util.keys(map)) {
        let style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
            tag = `tag:yaml.org,2002:${tag.slice(2)}`;
        }
        const type = schema.compiledTypeMap.fallback[tag];

        if (type && is.propertyOwned(type.styleAliases, style)) {
            style = type.styleAliases[style];
        }

        result[tag] = style;
    }
    return result;
};

const encodeHex = (character) => {
    const string = character.toString(16).toUpperCase();
    let handle;
    let length;

    if (character <= 0xFF) {
        handle = "x";
        length = 2;
    } else if (character <= 0xFFFF) {
        handle = "u";
        length = 4;
    } else if (character <= 0xFFFFFFFF) {
        handle = "U";
        length = 8;
    } else {
        throw new x.IllegalState("code point within a string may not be greater than 0xFFFFFFFF");
    }

    return `\\${handle}${"0".repeat(length - string.length)}${string}`;
};

class State {
    constructor(options) {
        this.schema = options.schema || yaml.schema.DEFAULT_FULL;
        this.indent = Math.max(1, (options.indent || 2));
        this.skipInvalid = options.skipInvalid || false;
        this.flowLevel = is.nil(options.flowLevel) ? -1 : options.flowLevel;
        this.styleMap = compileStyleMap(this.schema, options.styles || null);
        this.sortKeys = options.sortKeys || false;
        this.lineWidth = options.lineWidth || 80;
        this.noRefs = options.noRefs || false;
        this.noCompatMode = options.noCompatMode || false;

        this.implicitTypes = this.schema.compiledImplicit;
        this.explicitTypes = this.schema.compiledExplicit;

        this.tag = null;
        this.result = "";

        this.duplicates = [];
        this.usedDuplicates = null;
    }
}

const generateNextLine = (state, level) => `\n${" ".repeat(state.indent * level)}`;

const testImplicitResolving = (state, str) => {
    for (const type of state.implicitTypes) {
        if (type.resolve(str)) {
            return true;
        }
    }
    return false;
};

// [33] s-white ::= s-space | s-tab
const isWhitespace = (c) => c === CHAR_SPACE || c === CHAR_TAB;

// Returns true if the character can be printed without escaping.
// From YAML 1.2: "any allowed characters known to be non-printable
// should also be escaped. [However,] This isn’t mandatory"
// Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
const isPrintable = (c) => {
    return (c >= 0x00020 && c <= 0x00007E) ||
        ((c >= 0x000A1 && c <= 0x00D7FF) && c !== 0x2028 && c !== 0x2029) ||
        ((c >= 0x0E000 && c <= 0x00FFFD) && c !== 0xFEFF /* BOM */) ||
        (c >= 0x10000 && c <= 0x10FFFF);
};

// Simplified test for values allowed after the first character in plain style.
const isPlainSafe = (c) => {
    // Uses a subset of nb-char - c-flow-indicator - ":" - "#"
    // where nb-char ::= c-printable - b-char - c-byte-order-mark.
    return isPrintable(c) &&
        c !== 0xFEFF &&
        // - c-flow-indicator
        c !== CHAR_COMMA &&
        c !== CHAR_LEFT_SQUARE_BRACKET &&
        c !== CHAR_RIGHT_SQUARE_BRACKET &&
        c !== CHAR_LEFT_CURLY_BRACKET &&
        c !== CHAR_RIGHT_CURLY_BRACKET &&
        // - ":" - "#"
        c !== CHAR_COLON &&
        c !== CHAR_SHARP;
};

// Simplified test for values allowed as the first character in plain style.
const isPlainSafeFirst = (c) => {
    // Uses a subset of ns-char - c-indicator
    // where ns-char = nb-char - s-white.
    return isPrintable(c) &&
        c !== 0xFEFF &&
        !isWhitespace(c) &&
        // - (c-indicator ::=
        // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
        c !== CHAR_MINUS &&
        c !== CHAR_QUESTION &&
        c !== CHAR_COLON &&
        c !== CHAR_COMMA &&
        c !== CHAR_LEFT_SQUARE_BRACKET &&
        c !== CHAR_RIGHT_SQUARE_BRACKET &&
        c !== CHAR_LEFT_CURLY_BRACKET &&
        c !== CHAR_RIGHT_CURLY_BRACKET &&
        // | “#” | “&” | “*” | “!” | “|” | “>” | “'” | “"”
        c !== CHAR_SHARP &&
        c !== CHAR_AMPERSAND &&
        c !== CHAR_ASTERISK &&
        c !== CHAR_EXCLAMATION &&
        c !== CHAR_VERTICAL_LINE &&
        c !== CHAR_GREATER_THAN &&
        c !== CHAR_SINGLE_QUOTE &&
        c !== CHAR_DOUBLE_QUOTE &&
        // | “%” | “@” | “`”)
        c !== CHAR_PERCENT &&
        c !== CHAR_COMMERCIAL_AT &&
        c !== CHAR_GRAVE_ACCENT;
};

const STYLE_PLAIN = 1;
const STYLE_SINGLE = 2;
const STYLE_LITERAL = 3;
const STYLE_FOLDED = 4;
const STYLE_DOUBLE = 5;

// Determines which scalar styles are possible and returns the preferred style.
// lineWidth = -1 => no limit.
// Pre-conditions: str.length > 0.
// Post-conditions:
//    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
//    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
//    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
const chooseScalarStyle = (
    string,
    singleLineOnly,
    indentPerLevel,
    lineWidth,
    testAmbiguousType
) => {
    let hasLineBreak = false;
    let hasFoldableLine = false; // only checked if shouldTrackWidth
    const shouldTrackWidth = lineWidth !== -1;
    let previousLineBreak = -1; // count the first line correctly
    let plain = isPlainSafeFirst(string.charCodeAt(0))
        && !isWhitespace(string.charCodeAt(string.length - 1));

    if (singleLineOnly) {
        // Case: no block styles.
        // Check for disallowed characters to rule out plain and single.
        for (let i = 0; i < string.length; i++) {
            const char = string.charCodeAt(i);
            if (!isPrintable(char)) {
                return STYLE_DOUBLE;
            }
            plain = plain && isPlainSafe(char);
        }
    } else {
        // Case: block styles permitted.
        let i;
        for (i = 0; i < string.length; i++) {
            const char = string.charCodeAt(i);
            if (char === CHAR_LINE_FEED) {
                hasLineBreak = true;
                // Check if any line can be folded.
                if (!hasFoldableLine && shouldTrackWidth) {
                    // Foldable line = too long, and not more-indented.
                    hasFoldableLine = i - previousLineBreak - 1 > lineWidth &&
                        string[previousLineBreak + 1] !== " ";
                    previousLineBreak = i;
                }
            } else if (!isPrintable(char)) {
                return STYLE_DOUBLE;
            }
            plain = plain && isPlainSafe(char);
        }
        // in case the end is missing a \n
        if (!hasFoldableLine && shouldTrackWidth) {
            hasFoldableLine = i - previousLineBreak - 1 > lineWidth &&
                string[previousLineBreak + 1] !== " ";
        }

    }
    // Although every style can represent \n without escaping, prefer block styles
    // for multiline, since they're more readable and they don't add empty lines.
    // Also prefer folding a super-long line.
    if (!hasLineBreak && !hasFoldableLine) {
        // Strings interpretable as another type have to be quoted;
        // e.g. the string 'true' vs. the boolean true.
        return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
    }
    // Edge case: block indentation indicator can only have one digit.
    if (string[0] === " " && indentPerLevel > 9) {
        return STYLE_DOUBLE;
    }
    // At this point we know block styles are valid.
    // Prefer literal style unless we want to fold.
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
};

// (See the note for writeScalar.)
const dropEndingNewline = (string) => {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
};

// Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
const blockHeader = (string, indentPerLevel) => {
    const indentIndicator = string[0] === " " ? String(indentPerLevel) : "";

    // note the special case: the string '\n' counts as a "trailing" empty line.
    const clip = string[string.length - 1] === "\n";
    const keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    const chomp = keep ? "+" : (clip ? "" : "-");

    return `${indentIndicator + chomp}\n`;
};

// Greedy line breaking.
// Picks the longest line under the limit each time,
// otherwise settles for the shortest line over the limit.
// NB. More-indented lines *cannot* be folded, as that would add an extra \n.
const foldLine = (line, width) => {
    if (line === "" || line[0] === " ") {
        return line;
    }

    // Since a more-indented line adds a \n, breaks can't be followed by a space.
    // start is an inclusive index. end, curr, and next are exclusive.
    const breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
    let match;
    let start = 0;
    let curr = 0;
    let result = "";
    // Invariants: 0 <= start <= length-1.
    //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
    // Inside the loop:
    //   A match implies length >= 2, so curr and next are <= length-2.
    while ((match = breakRe.exec(line))) {
        const next = match.index;
        // maintain invariant: curr - start <= width
        if (next - start > width) {
            const end = (curr > start) ? curr : next; // derive end <= length-2
            result += `\n${line.slice(start, end)}`;
            // skip the space that was output as \n
            start = end + 1;                    // derive start <= length-1
        }
        curr = next;
    }

    // By the invariants, start <= length-1, so there is something left over.
    // It is either the whole string or a part starting from non-whitespace.
    result += "\n";
    // Insert a break if the remainder is too long and there is a break available.
    if (line.length - start > width && curr > start) {
        result += `${line.slice(start, curr)}\n${line.slice(curr + 1)}`;
    } else {
        result += line.slice(start);
    }

    return result.slice(1); // drop extra \n joiner
};

// Note: a long line without a suitable break point will exceed the width limit.
// Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
const foldString = (string, width) => {
    // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
    // unless they're before or after a more-indented line, or at the very
    // beginning or end, in which case $k$ maps to $k$.
    // Therefore, parse each chunk as newline(s) followed by a content line.
    const lineRe = /(\n+)([^\n]*)/g;

    // first line (possibly an empty line)
    let result = (function () {
        let nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
    }());
    // If we haven't reached the first content line yet, don't add an extra \n.
    let prevMoreIndented = string[0] === "\n" || string[0] === " ";
    let moreIndented;

    // rest of the lines
    let match;
    while ((match = lineRe.exec(string))) {
        const [, prefix, line] = match;
        moreIndented = line[0] === " ";
        result += prefix;
        if (!prevMoreIndented && !moreIndented && line !== "") {
            result += "\n";
        }
        result += foldLine(line, width);
        prevMoreIndented = moreIndented;
    }

    return result;
};

// Escapes a double-quoted string.
const escapeString = (string) => {
    let result = "";
    let char;
    let escapeSeq;

    for (let i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        escapeSeq = ESCAPE_SEQUENCES.get(char);
        result += !escapeSeq && isPrintable(char)
            ? string[i]
            : escapeSeq || encodeHex(char);
    }

    return result;
};

// Note: line breaking/folding is implemented for only the folded style.
// NB. We drop the last trailing newline (if any) of a returned block scalar
//  since the dumper adds its own newline. This always works:
//    • No ending newline => unaffected; already using strip "-" chomping.
//    • Ending newline    => removed then restored.
//  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
const writeScalar = (state, string, level, iskey) => {
    if (string.length === 0) {
        state.dump = "''";
        return;
    }
    if (!state.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.has(string)) {
        state.dump = `'${string}'`;
        return;
    }

    const indent = state.indent * Math.max(1, level); // no 0-indent scalars
    // As indentation gets deeper, let the width decrease monotonically
    // to the lower bound min(state.lineWidth, 40).
    // Note that this implies
    //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
    //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
    // This behaves better than a constant minimum width which disallows narrower options,
    // or an indent threshold which causes the width to suddenly increase.
    const lineWidth = state.lineWidth === -1
        ? -1
        : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

    // Without knowing if keys are implicit/explicit, assume implicit for safety.
    // No block styles in flow mode.
    const singleLineOnly = iskey || (state.flowLevel > -1 && level >= state.flowLevel);

    const testAmbiguity = (string) => testImplicitResolving(state, string);

    switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
        case STYLE_PLAIN: {
            state.dump = string;
            break;
        }
        case STYLE_SINGLE: {
            state.dump = `'${string.replace(/'/g, "''")}'`;
            break;
        }
        case STYLE_LITERAL: {
            const s = dropEndingNewline(text.indent(string, indent));
            state.dump = `|${blockHeader(string, state.indent)}${s}`;
            break;
        }
        case STYLE_FOLDED: {
            const s = dropEndingNewline(text.indent(foldString(string, lineWidth), indent));
            state.dump = `>${blockHeader(string, state.indent)}${s}`;
            break;
        }
        case STYLE_DOUBLE: {
            state.dump = `"${escapeString(string, lineWidth)}"`;
            break;
        }
        default: {
            throw new x.IllegalState("impossible error: invalid scalar style");
        }
    }
};

const writeFlowSequence = (state, level, object) => {
    let _result = "";
    const _tag = state.tag;

    for (let i = 0; i < object.length; ++i) {
        // Write only valid elements.
        // eslint-disable-next-line no-use-before-define
        if (writeNode(state, level, object[i], false, false)) {
            if (i !== 0) {
                _result += ", ";
            }
            _result += state.dump;
        }
    }

    state.tag = _tag;
    state.dump = `[${_result}]`;
};

const writeBlockSequence = (state, level, object, compact) => {
    let _result = "";
    const _tag = state.tag;
    let index;
    let length;

    for (index = 0, length = object.length; index < length; index += 1) {
        // Write only valid elements.
        // eslint-disable-next-line no-use-before-define
        if (writeNode(state, level + 1, object[index], true, true)) {
            if (!compact || index !== 0) {
                _result += generateNextLine(state, level);
            }

            if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
                _result += "-";
            } else {
                _result += "- ";
            }

            _result += state.dump;
        }
    }

    state.tag = _tag;
    state.dump = _result || "[]"; // Empty sequence if no valid values.
};

const writeFlowMapping = (state, level, object) => {
    let _result = "";
    const _tag = state.tag;

    const keys = util.keys(object);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        const value = object[key];
        let pairBuffer = i === 0 ? "" : ", ";
        // eslint-disable-next-line no-use-before-define
        if (!writeNode(state, level, key, false, false)) {
            continue; // Skip this pair because of invalid key;
        }

        if (state.dump.length > 1024) {
            pairBuffer += "? ";
        }

        pairBuffer += `${state.dump}: `;
        // eslint-disable-next-line no-use-before-define
        if (!writeNode(state, level, value, false, false)) {
            continue; // Skip this pair because of invalid value.
        }

        pairBuffer += state.dump;

        // Both key and value are valid.
        _result += pairBuffer;
    }

    state.tag = _tag;
    state.dump = `{${_result}}`;
};

const writeBlockMapping = (state, level, object, compact) => {
    const keys = util.keys(object);
    // Allow sorting keys so that the output file is deterministic
    if (state.sortKeys === true) {
        // Default sorting
        keys.sort();
    } else if (is.function(state.sortKeys)) {
        // Custom sort function
        keys.sort(state.sortKeys);
    } else if (state.sortKeys) {
        // Something is wrong
        throw new x.InvalidArgument("sortKeys must be a boolean or a function");
    }
    let _result = "";
    const _tag = state.tag;

    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        const value = object[key];
        let pairBuffer = (i !== 0 || !compact) ? generateNextLine(state, level) : "";
        // eslint-disable-next-line no-use-before-define
        if (!writeNode(state, level + 1, key, true, true, true)) {
            continue; // Skip this pair because of invalid key.
        }

        const explicitPair = (state.tag !== null && state.tag !== "?") ||
            (state.dump && state.dump.length > 1024);

        if (explicitPair) {
            if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
                pairBuffer += "?";
            } else {
                pairBuffer += "? ";
            }
        }

        pairBuffer += state.dump;

        if (explicitPair) {
            pairBuffer += generateNextLine(state, level);
        }

        // eslint-disable-next-line no-use-before-define
        if (!writeNode(state, level + 1, value, true, explicitPair)) {
            continue; // Skip this pair because of invalid value.
        }

        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += ":";
        } else {
            pairBuffer += ": ";
        }

        pairBuffer += state.dump;

        // Both key and value are valid.
        _result += pairBuffer;
    }

    state.tag = _tag;
    state.dump = _result || "{}"; // Empty mapping if no valid pairs.
};

const detectType = (state, object, explicit) => {
    const typeList = explicit ? state.explicitTypes : state.implicitTypes;

    for (const type of typeList) {
        if ((type.instanceOf || type.predicate) &&
            (!type.instanceOf || (is.object(object) && (object instanceof type.instanceOf))) &&
            (!type.predicate || type.predicate(object))) {

            state.tag = explicit ? type.tag : "?";

            if (type.represent) {
                const style = state.styleMap[type.tag] || type.defaultStyle;

                let result;

                if (is.function(type.represent)) {
                    result = type.represent(object, style);
                } else if (is.propertyOwned(type.represent, style)) {
                    result = type.represent[style](object, style);
                } else {
                    throw new x.IllegalState(`!<${type.tag}> tag resolver accepts not "${style}" style`);
                }

                state.dump = result;
            }

            return true;
        }
    }

    return false;
};

// Serializes `object` and writes it to global `result`.
// Returns true on success, or false on invalid object.
//
const writeNode = (state, level, object, block, compact, iskey) => {
    state.tag = null;
    state.dump = object;

    if (!detectType(state, object, false)) {
        detectType(state, object, true);
    }

    const type = util.typeOf(state.dump);

    if (block) {
        block = (state.flowLevel < 0 || state.flowLevel > level);
    }

    const objectOrArray = type === "Object" || type === "Array";
    let duplicateIndex;
    let duplicate;

    if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
    }

    if ((state.tag !== null && state.tag !== "?") || duplicate || (state.indent !== 2 && level > 0)) {
        compact = false;
    }

    if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = `*ref_${duplicateIndex}`;
    } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
            state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "Array") {
            if (block && (state.dump.length !== 0)) {
                writeBlockSequence(state, level, state.dump, compact);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex}${state.dump}`;
                }
            } else {
                writeFlowSequence(state, level, state.dump);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex} ${state.dump}`;
                }
            }
        } else if (type === "Object") {
            if (block && (Object.keys(state.dump).length !== 0)) {
                writeBlockMapping(state, level, state.dump, compact);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex}${state.dump}`;
                }
            } else {
                writeFlowMapping(state, level, state.dump);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex} ${state.dump}`;
                }
            }
        } else if (is.string(state.dump)) {
            if (state.tag !== "?") {
                writeScalar(state, state.dump, level, iskey);
            }
        } else {
            if (state.skipInvalid) {
                return false;
            }
            throw new x.IllegalState(`unacceptable kind of an object to dump ${type}`);
        }

        if (state.tag !== null && state.tag !== "?") {
            state.dump = `!<${state.tag}> ${state.dump}`;
        }
    }

    return true;
};

const inspectNode = (object, objects, duplicatesIndexes) => {
    if (!is.null(object) && is.object(object)) {
        const index = objects.indexOf(object);
        if (index !== -1) {
            if (!duplicatesIndexes.has(index)) {
                duplicatesIndexes.add(index);
            }
        } else {
            objects.push(object);

            if (is.array(object)) {
                for (const value of object) {
                    inspectNode(value, objects, duplicatesIndexes);
                }
            } else {
                for (const value of util.entries(object)) {
                    inspectNode(value, objects, duplicatesIndexes);
                }
            }
        }
    }
};

const getDuplicateReferences = (object, state) => {
    const objects = [];
    const duplicatesIndexes = new Set();

    inspectNode(object, objects, duplicatesIndexes);

    duplicatesIndexes.forEach((idx) => {
        state.duplicates.push(objects[idx]);
    });

    state.usedDuplicates = new Array(duplicatesIndexes.size);
};

export const dump = (input, options = {}) => {
    const state = new State(options);

    if (!state.noRefs) {
        getDuplicateReferences(input, state);
    }

    if (writeNode(state, 0, input, true, true)) {
        return `${state.dump}\n`;
    }

    return "";
};

export const safeDump = (input, options) => {
    return dump(input, Object.assign({ schema: adone.data.yaml.schema.DEFAULT_SAFE }, options));
};
