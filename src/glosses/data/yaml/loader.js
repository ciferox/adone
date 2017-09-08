const { data: { yaml }, is, util } = adone;

const CONTEXT_FLOW_IN = 1;
const CONTEXT_FLOW_OUT = 2;
const CONTEXT_BLOCK_IN = 3;
const CONTEXT_BLOCK_OUT = 4;

const CHOMPING_CLIP = 1;
const CHOMPING_STRIP = 2;
const CHOMPING_KEEP = 3;

const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
const PATTERN_FLOW_INDICATORS = /[,[\]{}]/;
const PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z-]+!)$/i;
const PATTERN_TAG_URI = /^(?:!|[^,[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()[\]])*$/i;

const isEOL = (c) => c === 0x0A/* LF */ || c === 0x0D/* CR */;

const isWhiteSpace = (c) => c === 0x09/* Tab */ || c === 0x20/* Space */;

const isWSorEOL = (c) => {
    return c === 0x09/* Tab */ ||
        c === 0x20/* Space */ ||
        c === 0x0A/* LF */ ||
        c === 0x0D/* CR */;
};

const isFlowIndicator = (c) => {
    return c === 0x2C/* , */ ||
        c === 0x5B/* [ */ ||
        c === 0x5D/* ] */ ||
        c === 0x7B/* { */ ||
        c === 0x7D/* } */;
};

const fromHexCode = (c) => {
    if (c/* 0 */ >= 0x30 && c <= 0x39/* 9 */) {
        return c - 0x30;
    }

    const lc = c | 0x20;

    if (lc/* a */ >= 0x61 && lc <= 0x66/* f */) {
        return lc - 0x61 + 10;
    }

    return -1;
};

const escapedHexLen = (c) => {
    switch (c) {
        case 0x78: { /* x */
            return 2;
        }
        case 0x75: { /* u */
            return 4;
        }
        case 0x55: { /* U */
            return 8;
        }
        default: {
            return 0;
        }
    }
};

const fromDecimalCode = (c) => c/* 0 */ >= 0x30 && c <= 0x39/* 9 */ ? c - 0x30 : -1;

const simpleEscapeSequence = (c) => {
    switch (c) {
        case 0x30: { /* 0 */
            return "\x00";
        }
        case 0x61: { /* a */
            return "\x07";
        }
        case 0x62: { /* b */
            return "\x08";
        }
        case 0x74: { /* t */
            return "\x09";
        }
        case 0x09: { /* Tab */
            return "\x09";
        }
        case 0x6E: { /* n */
            return "\x0A";
        }
        case 0x76: { /* v */
            return "\x0B";
        }
        case 0x66: { /* f */
            return "\x0C";
        }
        case 0x72: { /* r */
            return "\x0D";
        }
        case 0x65: { /* e */
            return "\x1B";
        }
        case 0x20: { /*; Space */
            return " ";
        }
        case 0x22: { /* " */
            return "\x22";
        }
        case 0x2F: { /* /; */
            return "/";
        }
        case 0x5C: { /* \ */
            return "\x5C";
        }
        case 0x4E: { /* N */
            return "\x85";
        }
        case 0x5F: { /* _ */
            return "\xA0";
        }
        case 0x4C: { /* L */
            return "\u2028";
        }
        case 0x50: { /* P */
            return "\u2029";
        }
        default: {
            return "";
        }
    }
};

const charFromCodepoint = (c) => {
    if (c <= 0xFFFF) {
        return String.fromCharCode(c);
    }
    // Encode UTF-16 surrogate pair
    // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
    return String.fromCharCode(
        ((c - 0x010000) >> 10) + 0xD800,
        ((c - 0x010000) & 0x03FF) + 0xDC00
    );
};

const simpleEscapeCheck = new Array(256); // integer, for fast access
const simpleEscapeMap = new Array(256);
for (let i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
}

class State {
    constructor(input, options) {
        this.input = input;

        this.filename = options.filename || null;
        this.schema = options.schema || yaml.schema.DEFAULT_FULL;
        this.onWarning = options.onWarning || null;
        this.legacy = options.legacy || false;
        this.json = options.json || false;
        this.listener = options.listener || null;

        this.implicitTypes = this.schema.compiledImplicit;
        this.typeMap = this.schema.compiledTypeMap;

        this.length = input.length;
        this.position = 0;
        this.line = 0;
        this.lineStart = 0;
        this.lineIndent = 0;

        this.documents = [];
    }
}

const generateError = (state, message) => {
    return new yaml.Exception(
        message,
        new yaml.Mark(
            state.filename,
            state.input,
            state.position,
            state.line,
            state.position - state.lineStart
        )
    );
};

const throwError = (state, message) => {
    throw generateError(state, message);
};

const throwWarning = (state, message) => {
    if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
    }
};


const directiveHandlers = new Map([
    ["YAML", function handleYamlDirective(state, name, args) {
        if (!is.null(state.version)) {
            throwError(state, "duplication of %YAML directive");
        }

        if (args.length !== 1) {
            throwError(state, "YAML directive accepts exactly one argument");
        }

        const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

        if (is.null(match)) {
            throwError(state, "ill-formed argument of the YAML directive");
        }

        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);

        if (major !== 1) {
            throwError(state, "unacceptable YAML version of the document");
        }

        state.version = args[0];
        state.checkLineBreaks = (minor < 2);

        if (minor !== 1 && minor !== 2) {
            throwWarning(state, "unsupported YAML version of the document");
        }
    }],
    ["TAG", function handleTagDirective(state, name, args) {
        if (args.length !== 2) {
            throwError(state, "TAG directive accepts exactly two arguments");
        }

        const [handle, prefix] = args;

        if (!PATTERN_TAG_HANDLE.test(handle)) {
            throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }

        if (is.propertyOwned(state.tagMap, handle)) {
            throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
        }

        if (!PATTERN_TAG_URI.test(prefix)) {
            throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }

        state.tagMap[handle] = prefix;
    }]
]);


const captureSegment = (state, start, end, checkJson) => {
    if (start < end) {
        const res = state.input.slice(start, end);

        if (checkJson) {
            for (let i = 0; i < res.length; ++i) {
                const ch = res.charCodeAt(i);
                if (!(ch === 0x09 || (ch >= 0x20 && ch <= 0x10FFFF))) {
                    throwError(state, "expected valid JSON character");
                }
            }
        } else if (PATTERN_NON_PRINTABLE.test(res)) {
            throwError(state, "the stream contains non-printable characters");
        }

        state.result += res;
    }
};

const mergeMappings = (state, destination, source, overridableKeys) => {
    if (!is.object(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    }

    for (const [k, v] of util.entries(source)) {
        if (is.propertyOwned(destination, k)) {
            continue;
        }
        destination[k] = v;
        overridableKeys[k] = true;
    }
};

const storeMappingPair = (
    state,
    _result,
    overridableKeys,
    keyTag,
    keyNode,
    valueNode,
    startLine,
    startPos
) => {
    keyNode = String(keyNode);

    if (is.null(_result)) {
        _result = {};
    }

    if (keyTag === "tag:yaml.org,2002:merge") {
        if (is.array(valueNode)) {
            for (const i of valueNode) {
                mergeMappings(state, _result, i, overridableKeys);
            }
        } else {
            mergeMappings(state, _result, valueNode, overridableKeys);
        }
    } else {
        if (
            !state.json &&
            !is.propertyOwned(overridableKeys, keyNode) &&
            is.propertyOwned(_result, keyNode)
        ) {
            state.line = startLine || state.line;
            state.position = startPos || state.position;
            throwError(state, "duplicated mapping key");
        }
        _result[keyNode] = valueNode;
        delete overridableKeys[keyNode];
    }

    return _result;
};

const readLineBreak = (state) => {
    const ch = state.input.charCodeAt(state.position);

    if (ch === 0x0A/* LF */) {
        state.position++;
    } else if (ch === 0x0D/* CR */) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 0x0A/* LF */) {
            state.position++;
        }
    } else {
        throwError(state, "a line break is expected");
    }

    state.line += 1;
    state.lineStart = state.position;
};

const skipSeparationSpace = (state, allowComments, checkIndent) => {
    let lineBreaks = 0;
    let ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {
        while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
        }

        if (allowComments && ch === 0x23/* # */) {
            do {
                ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0x0A/* LF */ && ch !== 0x0D/* CR */ && ch !== 0);
        }

        if (isEOL(ch)) {
            readLineBreak(state);

            ch = state.input.charCodeAt(state.position);
            lineBreaks++;
            state.lineIndent = 0;

            while (ch === 0x20/* Space */) {
                state.lineIndent++;
                ch = state.input.charCodeAt(++state.position);
            }
        } else {
            break;
        }
    }

    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
    }

    return lineBreaks;
};

const testDocumentSeparator = (state) => {
    let _position = state.position;
    let ch = state.input.charCodeAt(_position);

    // Condition state.position === state.lineStart is tested
    // in parent on each call, for efficiency. No needs to test here again.
    if (
        (ch === 0x2D/* - */ || ch === 0x2E/* . */) &&
        ch === state.input.charCodeAt(_position + 1) &&
        ch === state.input.charCodeAt(_position + 2)
    ) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || isWSorEOL(ch)) {
            return true;
        }
    }
    return false;
};

const writeFoldedLines = (state, count) => {
    if (count === 1) {
        state.result += " ";
    } else if (count > 1) {
        state.result += "\n".repeat(count - 1);
    }
};


const readPlainScalar = (state, nodeIndent, withinFlowCollection) => {
    let ch = state.input.charCodeAt(state.position);

    if (
        isWSorEOL(ch) ||
        isFlowIndicator(ch) ||
        ch === 0x23/* # */ ||
        ch === 0x26/* & */ ||
        ch === 0x2A/* * */ ||
        ch === 0x21/* ! */ ||
        ch === 0x7C/* | */ ||
        ch === 0x3E/* > */ ||
        ch === 0x27/* ' */ ||
        ch === 0x22/* " */ ||
        ch === 0x25/* % */ ||
        ch === 0x40/* @ */ ||
        ch === 0x60/* ` */
    ) {
        return false;
    }

    if (ch === 0x3F/* ? */ || ch === 0x2D/* - */) {
        const following = state.input.charCodeAt(state.position + 1);

        if (isWSorEOL(following) ||
            withinFlowCollection && isFlowIndicator(following)) {
            return false;
        }
    }

    const _kind = state.kind;
    const _result = state.result;

    let captureStart = state.position;
    let captureEnd = state.position;
    let hasPendingContent = false;
    let _line;
    let _lineStart;
    let _lineIndent;

    state.kind = "scalar";
    state.result = "";

    while (ch !== 0) {
        if (ch === 0x3A/* : */) {
            const following = state.input.charCodeAt(state.position + 1);

            if (isWSorEOL(following) ||
                withinFlowCollection && isFlowIndicator(following)) {
                break;
            }

        } else if (ch === 0x23/* # */) {
            const preceding = state.input.charCodeAt(state.position - 1);

            if (isWSorEOL(preceding)) {
                break;
            }

        } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
            withinFlowCollection && isFlowIndicator(ch)) {
            break;

        } else if (isEOL(ch)) {
            _line = state.line;
            _lineStart = state.lineStart;
            _lineIndent = state.lineIndent;
            skipSeparationSpace(state, false, -1);

            if (state.lineIndent >= nodeIndent) {
                hasPendingContent = true;
                ch = state.input.charCodeAt(state.position);
                continue;
            } else {
                state.position = captureEnd;
                state.line = _line;
                state.lineStart = _lineStart;
                state.lineIndent = _lineIndent;
                break;
            }
        }

        if (hasPendingContent) {
            captureSegment(state, captureStart, captureEnd, false);
            writeFoldedLines(state, state.line - _line);
            captureStart = captureEnd = state.position;
            hasPendingContent = false;
        }

        if (!isWhiteSpace(ch)) {
            captureEnd = state.position + 1;
        }

        ch = state.input.charCodeAt(++state.position);
    }

    captureSegment(state, captureStart, captureEnd, false);

    if (state.result) {
        return true;
    }

    state.kind = _kind;
    state.result = _result;
    return false;
};

const readSingleQuotedScalar = (state, nodeIndent) => {
    let ch = state.input.charCodeAt(state.position);

    if (ch !== 0x27/* ' */) {
        return false;
    }

    state.kind = "scalar";
    state.result = "";
    state.position++;

    let captureStart = state.position;
    let captureEnd = state.position;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x27/* ' */) {
            captureSegment(state, captureStart, state.position, true);
            ch = state.input.charCodeAt(++state.position);

            if (ch === 0x27/* ' */) {
                captureStart = state.position;
                state.position++;
                captureEnd = state.position;
            } else {
                return true;
            }

        } else if (isEOL(ch)) {
            captureSegment(state, captureStart, captureEnd, true);
            writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
            captureStart = captureEnd = state.position;

        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
            throwError(state, "unexpected end of the document within a single quoted scalar");

        } else {
            state.position++;
            captureEnd = state.position;
        }
    }

    throwError(state, "unexpected end of the stream within a single quoted scalar");
};

const readDoubleQuotedScalar = (state, nodeIndent) => {
    let ch = state.input.charCodeAt(state.position);

    if (ch !== 0x22/* " */) {
        return false;
    }

    state.kind = "scalar";
    state.result = "";
    state.position++;
    let captureStart = state.position;
    let captureEnd = state.position;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x22/* " */) {
            captureSegment(state, captureStart, state.position, true);
            state.position++;
            return true;

        } else if (ch === 0x5C/* \ */) {
            captureSegment(state, captureStart, state.position, true);
            ch = state.input.charCodeAt(++state.position);

            let tmp;

            if (isEOL(ch)) {
                skipSeparationSpace(state, false, nodeIndent);

                // TODO: rework to inline fn with no type cast?
            } else if (ch < 256 && simpleEscapeCheck[ch]) {
                state.result += simpleEscapeMap[ch];
                state.position++;

            } else if ((tmp = escapedHexLen(ch)) > 0) {
                let hexLength = tmp;
                let hexResult = 0;

                for (; hexLength > 0; hexLength--) {
                    ch = state.input.charCodeAt(++state.position);

                    if ((tmp = fromHexCode(ch)) >= 0) {
                        hexResult = (hexResult << 4) + tmp;

                    } else {
                        throwError(state, "expected hexadecimal character");
                    }
                }

                state.result += charFromCodepoint(hexResult);

                state.position++;

            } else {
                throwError(state, "unknown escape sequence");
            }

            captureStart = captureEnd = state.position;

        } else if (isEOL(ch)) {
            captureSegment(state, captureStart, captureEnd, true);
            writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
            captureStart = captureEnd = state.position;

        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
            throwError(state, "unexpected end of the document within a double quoted scalar");

        } else {
            state.position++;
            captureEnd = state.position;
        }
    }

    throwError(state, "unexpected end of the stream within a double quoted scalar");
};

const readFlowCollection = (state, nodeIndent) => {
    const _tag = state.tag;
    const _anchor = state.anchor;

    let readNext = true;
    let ch = state.input.charCodeAt(state.position);
    let terminator;
    let isMapping;
    let _result;
    const overridableKeys = {};

    if (ch === 0x5B/* [ */) {
        terminator = 0x5D;/* ] */
        isMapping = false;
        _result = [];
    } else if (ch === 0x7B/* { */) {
        terminator = 0x7D;/* } */
        isMapping = true;
        _result = {};
    } else {
        return false;
    }

    if (!is.null(state.anchor)) {
        state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(++state.position);

    while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);

        ch = state.input.charCodeAt(state.position);

        if (ch === terminator) {
            state.position++;
            state.tag = _tag;
            state.anchor = _anchor;
            state.kind = isMapping ? "mapping" : "sequence";
            state.result = _result;
            return true;
        }
        if (!readNext) {
            throwError(state, "missed comma between flow collection entries");
        }

        let keyTag = null;
        let keyNode = null;
        let valueNode = null;
        let isPair = false;
        let isExplicitPair = false;

        if (ch === 0x3F/* ? */) {
            const following = state.input.charCodeAt(state.position + 1);

            if (isWSorEOL(following)) {
                isPair = isExplicitPair = true;
                state.position++;
                skipSeparationSpace(state, true, nodeIndent);
            }
        }

        const _line = state.line;
        // eslint-disable-next-line no-use-before-define
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);

        ch = state.input.charCodeAt(state.position);

        if ((isExplicitPair || state.line === _line) && ch === 0x3A/* : */) {
            isPair = true;
            ch = state.input.charCodeAt(++state.position);
            skipSeparationSpace(state, true, nodeIndent);
            // eslint-disable-next-line no-use-before-define
            composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
            valueNode = state.result;
        }

        if (isMapping) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
        } else if (isPair) {
            _result.push(
                storeMappingPair(
                    state,
                    null,
                    overridableKeys,
                    keyTag,
                    keyNode,
                    valueNode
                )
            );
        } else {
            _result.push(keyNode);
        }

        skipSeparationSpace(state, true, nodeIndent);

        ch = state.input.charCodeAt(state.position);

        if (ch === 0x2C/* , */) {
            readNext = true;
            ch = state.input.charCodeAt(++state.position);
        } else {
            readNext = false;
        }
    }

    throwError(state, "unexpected end of the stream within a flow collection");
};

const readBlockScalar = (state, nodeIndent) => {
    let ch = state.input.charCodeAt(state.position);
    let folding;

    if (ch === 0x7C/* | */) {
        folding = false;
    } else if (ch === 0x3E/* > */) {
        folding = true;
    } else {
        return false;
    }

    let chomping = CHOMPING_CLIP;
    let didReadContent = false;
    let detectedIndent = false;
    let textIndent = nodeIndent;
    let emptyLines = 0;
    let atMoreIndented = false;

    state.kind = "scalar";
    state.result = "";

    while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        let tmp;
        if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
            if (CHOMPING_CLIP === chomping) {
                chomping = (ch === 0x2B/* + */) ? CHOMPING_KEEP : CHOMPING_STRIP;
            } else {
                throwError(state, "repeat of a chomping mode identifier");
            }

        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
            if (tmp === 0) {
                throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
            } else if (!detectedIndent) {
                textIndent = nodeIndent + tmp - 1;
                detectedIndent = true;
            } else {
                throwError(state, "repeat of an indentation width identifier");
            }

        } else {
            break;
        }
    }

    if (isWhiteSpace(ch)) {
        do {
            ch = state.input.charCodeAt(++state.position);
        }
        while (isWhiteSpace(ch));

        if (ch === 0x23/* # */) {
            do {
                ch = state.input.charCodeAt(++state.position);
            }
            while (!isEOL(ch) && (ch !== 0));
        }
    }

    while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;

        ch = state.input.charCodeAt(state.position);

        while ((!detectedIndent || state.lineIndent < textIndent) &&
            (ch === 0x20/* Space */)) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
        }

        if (!detectedIndent && state.lineIndent > textIndent) {
            textIndent = state.lineIndent;
        }

        if (isEOL(ch)) {
            emptyLines++;
            continue;
        }

        // End of the scalar.
        if (state.lineIndent < textIndent) {

            // Perform the chomping.
            if (chomping === CHOMPING_KEEP) {
                state.result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
            } else if (chomping === CHOMPING_CLIP) {
                if (didReadContent) { // i.e. only if the scalar is not empty.
                    state.result += "\n";
                }
            }

            // Break this `while` cycle and go to the funciton's epilogue.
            break;
        }

        // Folded style: use fancy rules to handle line breaks.
        if (folding) {

            // Lines starting with white space characters (more-indented lines) are not folded.
            if (isWhiteSpace(ch)) {
                atMoreIndented = true;
                // except for the first content line (cf. Example 8.1)
                state.result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);

                // End of more-indented block.
            } else if (atMoreIndented) {
                atMoreIndented = false;
                state.result += "\n".repeat(emptyLines + 1);

                // Just one line break - perceive as the same line.
            } else if (emptyLines === 0) {
                if (didReadContent) { // i.e. only if we have already read some scalar content.
                    state.result += " ";
                }

                // Several line breaks - perceive as different lines.
            } else {
                state.result += "\n".repeat(emptyLines);
            }

            // Literal style: just add exact number of line breaks between content lines.
        } else {
            // Keep all line breaks except the header line break.
            state.result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
        }

        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        const captureStart = state.position;

        while (!isEOL(ch) && (ch !== 0)) {
            ch = state.input.charCodeAt(++state.position);
        }

        captureSegment(state, captureStart, state.position, false);
    }

    return true;
};

const readBlockSequence = (state, nodeIndent) => {
    const _tag = state.tag;
    const _anchor = state.anchor;

    const _result = [];

    if (!is.null(state.anchor)) {
        state.anchorMap[state.anchor] = _result;
    }

    let ch = state.input.charCodeAt(state.position);
    let detected = false;

    while (ch !== 0) {

        if (ch !== 0x2D/* - */) {
            break;
        }

        const following = state.input.charCodeAt(state.position + 1);

        if (!isWSorEOL(following)) {
            break;
        }

        detected = true;
        state.position++;

        if (skipSeparationSpace(state, true, -1)) {
            if (state.lineIndent <= nodeIndent) {
                _result.push(null);
                ch = state.input.charCodeAt(state.position);
                continue;
            }
        }

        const _line = state.line;
        // eslint-disable-next-line no-use-before-define
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);

        ch = state.input.charCodeAt(state.position);

        if ((state.line === _line || state.lineIndent > nodeIndent) && (ch !== 0)) {
            throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
            break;
        }
    }

    if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
    }
    return false;
};

const readBlockMapping = (state, nodeIndent, flowIndent) => {
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = {};
    const overridableKeys = {};

    if (!is.null(state.anchor)) {
        state.anchorMap[state.anchor] = _result;
    }

    let ch = state.input.charCodeAt(state.position);
    let detected = false;
    let atExplicitKey = false;
    let keyTag = null;
    let keyNode = null;
    let valueNode = null;
    let allowCompact;


    while (ch !== 0) {
        const following = state.input.charCodeAt(state.position + 1);
        const _line = state.line; // Save the current line.
        const _pos = state.position;

        //
        // Explicit notation case. There are two separate blocks:
        // first for the key (denoted by "?") and second for the value (denoted by ":")
        //
        if ((ch === 0x3F/* ? */ || ch === 0x3A/* : */) && isWSorEOL(following)) {

            if (ch === 0x3F/* ? */) {
                if (atExplicitKey) {
                    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
                    keyTag = keyNode = valueNode = null;
                }

                detected = true;
                atExplicitKey = true;
                allowCompact = true;

            } else if (atExplicitKey) {
                // i.e. 0x3A/* : */ === character after the explicit key.
                atExplicitKey = false;
                allowCompact = true;

            } else {
                throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
            }

            state.position += 1;
            ch = following;

            //
            // Implicit notation case. Flow-style node as the key first, then ":", and the value.
            //
            // eslint-disable-next-line no-use-before-define
        } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {

            if (state.line === _line) {
                ch = state.input.charCodeAt(state.position);

                while (isWhiteSpace(ch)) {
                    ch = state.input.charCodeAt(++state.position);
                }

                if (ch === 0x3A/* : */) {
                    ch = state.input.charCodeAt(++state.position);

                    if (!isWSorEOL(ch)) {
                        throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
                    }

                    if (atExplicitKey) {
                        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
                        keyTag = keyNode = valueNode = null;
                    }

                    detected = true;
                    atExplicitKey = false;
                    allowCompact = false;
                    keyTag = state.tag;
                    keyNode = state.result;

                } else if (detected) {
                    throwError(state, "can not read an implicit mapping pair; a colon is missed");

                } else {
                    state.tag = _tag;
                    state.anchor = _anchor;
                    return true; // Keep the result of `composeNode`.
                }

            } else if (detected) {
                throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");

            } else {
                state.tag = _tag;
                state.anchor = _anchor;
                return true; // Keep the result of `composeNode`.
            }

        } else {
            break; // Reading is done. Go to the epilogue.
        }

        //
        // Common reading code for both explicit and implicit notations.
        //
        if (state.line === _line || state.lineIndent > nodeIndent) {
            // eslint-disable-next-line no-use-before-define
            if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
                if (atExplicitKey) {
                    keyNode = state.result;
                } else {
                    valueNode = state.result;
                }
            }

            if (!atExplicitKey) {
                storeMappingPair(
                    state,
                    _result,
                    overridableKeys,
                    keyTag,
                    keyNode,
                    valueNode,
                    _line,
                    _pos
                );
                keyTag = keyNode = valueNode = null;
            }

            skipSeparationSpace(state, true, -1);
            ch = state.input.charCodeAt(state.position);
        }

        if (state.lineIndent > nodeIndent && (ch !== 0)) {
            throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
            break;
        }
    }

    //
    // Epilogue.
    //

    // Special case: last mapping's node contains only the key in explicit notation.
    if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
    }

    // Expose the resulting mapping.
    if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
    }

    return detected;
};

const readTagProperty = (state) => {
    let ch = state.input.charCodeAt(state.position);

    if (ch !== 0x21/* ! */) {
        return false;
    }

    if (!is.null(state.tag)) {
        throwError(state, "duplication of a tag property");
    }

    ch = state.input.charCodeAt(++state.position);

    let isVerbatim = false;
    let isNamed = false;
    let tagHandle;
    let tagName;

    if (ch === 0x3C/* < */) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);

    } else if (ch === 0x21/* ! */) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);

    } else {
        tagHandle = "!";
    }

    let _position = state.position;

    if (isVerbatim) {
        do {
            ch = state.input.charCodeAt(++state.position);
        }
        while (ch !== 0 && ch !== 0x3E/* > */);

        if (state.position < state.length) {
            tagName = state.input.slice(_position, state.position);
            ch = state.input.charCodeAt(++state.position);
        } else {
            throwError(state, "unexpected end of the stream within a verbatim tag");
        }
    } else {
        while (ch !== 0 && !isWSorEOL(ch)) {

            if (ch === 0x21/* ! */) {
                if (!isNamed) {
                    tagHandle = state.input.slice(_position - 1, state.position + 1);

                    if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                        throwError(state, "named tag handle cannot contain such characters");
                    }

                    isNamed = true;
                    _position = state.position + 1;
                } else {
                    throwError(state, "tag suffix cannot contain exclamation marks");
                }
            }

            ch = state.input.charCodeAt(++state.position);
        }

        tagName = state.input.slice(_position, state.position);

        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
            throwError(state, "tag suffix cannot contain flow indicator characters");
        }
    }

    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, `tag name cannot contain such characters: ${tagName}`);
    }

    if (isVerbatim) {
        state.tag = tagName;

    } else if (is.propertyOwned(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;

    } else if (tagHandle === "!") {
        state.tag = `!${tagName}`;

    } else if (tagHandle === "!!") {
        state.tag = `tag:yaml.org,2002:${tagName}`;

    } else {
        throwError(state, `undeclared tag handle "${tagHandle}"`);
    }

    return true;
};

const readAnchorProperty = (state) => {
    let ch = state.input.charCodeAt(state.position);

    if (ch !== 0x26/* & */) {
        return false;
    }

    if (!is.null(state.anchor)) {
        throwError(state, "duplication of an anchor property");
    }

    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;

    while (ch !== 0 && !isWSorEOL(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
    }

    if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
    }

    state.anchor = state.input.slice(_position, state.position);
    return true;
};

const readAlias = (state) => {
    let ch = state.input.charCodeAt(state.position);

    if (ch !== 0x2A/* * */) {
        return false;
    }

    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;

    while (ch !== 0 && !isWSorEOL(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
    }

    if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
    }

    const alias = state.input.slice(_position, state.position);

    if (!state.anchorMap.hasOwnProperty(alias)) {
        throwError(state, `unidentified alias "${alias}"`);
    }

    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
};

const composeNode = (state, parentIndent, nodeContext, allowToSeek, allowCompact) => {
    if (!is.null(state.listener)) {
        state.listener("open", state);
    }

    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;

    const allowBlockStyles = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    const allowBlockScalars = allowBlockStyles;
    let allowBlockCollections = allowBlockStyles;
    let indentStatus = 1; // 1: this>parent, 0: this=parent, -1: this<parent
    let atNewLine = false;


    if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;

            if (state.lineIndent > parentIndent) {
                indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
                indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
                indentStatus = -1;
            }
        }
    }

    if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
            if (skipSeparationSpace(state, true, -1)) {
                atNewLine = true;
                allowBlockCollections = allowBlockStyles;

                if (state.lineIndent > parentIndent) {
                    indentStatus = 1;
                } else if (state.lineIndent === parentIndent) {
                    indentStatus = 0;
                } else if (state.lineIndent < parentIndent) {
                    indentStatus = -1;
                }
            } else {
                allowBlockCollections = false;
            }
        }
    }

    if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
    }

    let hasContent = false;
    let flowIndent;
    let blockIndent;

    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
            flowIndent = parentIndent;
        } else {
            flowIndent = parentIndent + 1;
        }

        blockIndent = state.position - state.lineStart;

        if (indentStatus === 1) {
            if (allowBlockCollections &&
                (readBlockSequence(state, blockIndent) ||
                    readBlockMapping(state, blockIndent, flowIndent)) ||
                readFlowCollection(state, flowIndent)) {
                hasContent = true;
            } else {
                if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
                    readSingleQuotedScalar(state, flowIndent) ||
                    readDoubleQuotedScalar(state, flowIndent)) {
                    hasContent = true;

                } else if (readAlias(state)) {
                    hasContent = true;

                    if (!is.null(state.tag) || !is.null(state.anchor)) {
                        throwError(state, "alias node should not have any properties");
                    }

                } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
                    hasContent = true;

                    if (is.null(state.tag)) {
                        state.tag = "?";
                    }
                }

                if (!is.null(state.anchor)) {
                    state.anchorMap[state.anchor] = state.result;
                }
            }
        } else if (indentStatus === 0) {
            // Special case: block sequences are allowed to have same indentation level as the parent.
            // http://www.yaml.org/spec/1.2/spec.html#id2799784
            hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
    }

    if (!is.null(state.tag) && state.tag !== "!") {
        if (state.tag === "?") {
            for (const type of state.implicitTypes) {
                // Implicit resolving is not allowed for non-scalar types, and '?'
                // non-specific tag is only assigned to plain scalars. So, it isn't
                // needed to check for 'kind' conformity.

                if (type.resolve(state.result)) { // `state.result` updated in resolver if matched
                    state.result = type.construct(state.result);
                    state.tag = type.tag;
                    if (!is.null(state.anchor)) {
                        state.anchorMap[state.anchor] = state.result;
                    }
                    break;
                }
            }
        } else if (is.propertyOwned(state.typeMap[state.kind || "fallback"], state.tag)) {
            const type = state.typeMap[state.kind || "fallback"][state.tag];

            if (!is.null(state.result) && type.kind !== state.kind) {
                throwError(state, `unacceptable node kind for !<${state.tag}> tag; it should be "${type.kind}", not "${state.kind}"`);
            }

            if (!type.resolve(state.result)) { // `state.result` updated in resolver if matched
                throwError(state, `cannot resolve a node with !<${state.tag}> explicit tag`);
            } else {
                state.result = type.construct(state.result);
                if (!is.null(state.anchor)) {
                    state.anchorMap[state.anchor] = state.result;
                }
            }
        } else {
            throwError(state, `unknown tag !<${state.tag}>`);
        }
    }

    if (!is.null(state.listener)) {
        state.listener("close", state);
    }
    return !is.null(state.tag) || !is.null(state.anchor) || hasContent;
};

const readDocument = (state) => {
    const documentStart = state.position;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = {};
    state.anchorMap = {};

    let ch;
    let hasDirectives = false;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);

        ch = state.input.charCodeAt(state.position);

        if (state.lineIndent > 0 || ch !== 0x25/* % */) {
            break;
        }

        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        let _position = state.position;

        while (ch !== 0 && !isWSorEOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
        }

        const directiveName = state.input.slice(_position, state.position);
        const directiveArgs = [];

        if (directiveName.length < 1) {
            throwError(state, "directive name must not be less than one character in length");
        }

        while (ch !== 0) {
            while (isWhiteSpace(ch)) {
                ch = state.input.charCodeAt(++state.position);
            }

            if (ch === 0x23/* # */) {
                do {
                    ch = state.input.charCodeAt(++state.position);
                }
                while (ch !== 0 && !isEOL(ch));
                break;
            }

            if (isEOL(ch)) {
                break;
            }

            _position = state.position;

            while (ch !== 0 && !isWSorEOL(ch)) {
                ch = state.input.charCodeAt(++state.position);
            }

            directiveArgs.push(state.input.slice(_position, state.position));
        }

        if (ch !== 0) {
            readLineBreak(state);
        }

        if (directiveHandlers.has(directiveName)) {
            directiveHandlers.get(directiveName)(state, directiveName, directiveArgs);
        } else {
            throwWarning(state, `unknown document directive "${directiveName}"`);
        }
    }

    skipSeparationSpace(state, true, -1);

    if (state.lineIndent === 0 &&
        state.input.charCodeAt(state.position) === 0x2D/* - */ &&
        state.input.charCodeAt(state.position + 1) === 0x2D/* - */ &&
        state.input.charCodeAt(state.position + 2) === 0x2D/* - */) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);

    } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
    }

    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);

    if (state.checkLineBreaks &&
        PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }

    state.documents.push(state.result);

    if (state.position === state.lineStart && testDocumentSeparator(state)) {

        if (state.input.charCodeAt(state.position) === 0x2E/* . */) {
            state.position += 3;
            skipSeparationSpace(state, true, -1);
        }
        return;
    }

    if (state.position < (state.length - 1)) {
        throwError(state, "end of the stream or a document separator is expected");
    }
};


const loadDocuments = (input, options = {}) => {
    input = String(input);

    if (input.length !== 0) {
        // Add tailing `\n` if not exists
        if (
            input.charCodeAt(input.length - 1) !== 0x0A/* LF */ &&
            input.charCodeAt(input.length - 1) !== 0x0D/* CR */
        ) {
            input += "\n";
        }

        // Strip BOM
        if (input.charCodeAt(0) === 0xFEFF) {
            input = input.slice(1);
        }
    }

    const state = new State(input, options);

    // Use 0 as string terminator. That significantly simplifies bounds check.
    state.input += "\0";

    while (state.input.charCodeAt(state.position) === 0x20/* Space */) {
        state.lineIndent += 1;
        state.position += 1;
    }

    while (state.position < (state.length - 1)) {
        readDocument(state);
    }

    return state.documents;
};


export const loadAll = (input, iterator, options) => {
    const documents = loadDocuments(input, options);

    if (!is.function(iterator)) {
        return documents;
    }

    for (const doc of documents) {
        iterator(doc);
    }
};


export const load = (input, options) => {
    const documents = loadDocuments(input, options);

    if (documents.length === 0) {
        /*eslint-disable no-undefined*/
        return undefined;
    } else if (documents.length === 1) {
        return documents[0];
    }
    throw new yaml.Exception("expected a single document in the stream, but found more");
};


export const safeLoadAll = (input, output, options) => {
    if (is.function(output)) {
        loadAll(input, output, { schema: yaml.schema.DEFAULT_FULL, ...options });
    } else {
        return loadAll(input, { schema: yaml.schema.DEFAULT_FULL, ...options });
    }
};


export const safeLoad = (input, options) => {
    return load(input, Object.assign({ schema: yaml.schema.DEFAULT_SAFE }, options));
};
