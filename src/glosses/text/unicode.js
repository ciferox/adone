export const symbol = {
    tick: "✔",
    cross: "✖",
    star: "★",
    square: "▇",
    squareSmall: "◻",
    squareSmallFilled: "◼",
    play: "▶",
    circle: "◯",
    circleFilled: "◉",
    circleDotted: "◌",
    circleDouble: "◎",
    circleCircle: "ⓞ",
    circleCross: "ⓧ",
    circlePipe: "Ⓘ",
    circleQuestionMark: "?⃝",
    bullet: "●",
    dot: "․",
    line: "─",
    ellipsis: "…",
    pointer: "❯",
    pointerSmall: "›",
    info: "ℹ",
    warning: "⚠",
    hamburger: "☰",
    smiley: "㋡",
    mustache: "෴",
    heart: "♥",
    arrowUp: "↑",
    arrowDown: "↓",
    arrowLeft: "←",
    arrowRight: "→",
    radioOn: "◉",
    radioOff: "◯",
    checkboxOn: "☒",
    checkboxOff: "☐",
    checkboxCircleOn: "ⓧ",
    checkboxCircleOff: "Ⓘ",
    questionMarkPrefix: (adone.is.linux ? "?" : "?⃝"),
    oneHalf: "½",
    oneThird: "⅓",
    oneQuarter: "¼",
    oneFifth: "⅕",
    oneSixth: "⅙",
    oneSeventh: "⅐",
    oneEighth: "⅛",
    oneNinth: "⅑",
    oneTenth: "⅒",
    twoThirds: "⅔",
    twoFifths: "⅖",
    threeQuarters: "¾",
    threeFifths: "⅗",
    threeEighths: "⅜",
    fourFifths: "⅘",
    fiveSixths: "⅚",
    fiveEighths: "⅝",
    sevenEighths: "⅞",
    minus: "−"
};

const symbolFallback = {
    tick: "√",
    cross: "×",
    star: "*",
    square: "█",
    squareSmall: "[ ]",
    squareSmallFilled: "[█]",
    play: "►",
    circle: "( )",
    circleFilled: "(*)",
    circleDotted: "( )",
    circleDouble: "( )",
    circleCircle: "(○)",
    circleCross: "(×)",
    circlePipe: "(│)",
    circleQuestionMark: "(?)",
    bullet: "*",
    dot: ".",
    line: "─",
    ellipsis: "...",
    pointer: ">",
    pointerSmall: "»",
    info: "i",
    warning: "‼",
    hamburger: "≡",
    smiley: "☺",
    mustache: "┌─┐",
    heart: "♥",
    arrowUp: "↑",
    arrowDown: "↓",
    arrowLeft: "←",
    arrowRight: "→",
    radioOn: "(*)",
    radioOff: "( )",
    checkboxOn: "[×]",
    checkboxOff: "[ ]",
    checkboxCircleOn: "(×)",
    checkboxCircleOff: "( )",
    questionMarkPrefix: "？",
    oneHalf: "1/2",
    oneThird: "1/3",
    oneQuarter: "1/4",
    oneFifth: "1/5",
    oneSixth: "1/6",
    oneSeventh: "1/7",
    oneEighth: "1/8",
    oneNinth: "1/9",
    oneTenth: "1/10",
    twoThirds: "2/3",
    twoFifths: "2/5",
    threeQuarters: "3/4",
    threeFifths: "3/5",
    threeEighths: "3/8",
    fourFifths: "4/5",
    fiveSixths: "5/6",
    fiveEighths: "5/8",
    sevenEighths: "7/8",
    minus: "-"
};

export const approx = (str) => {
    if (!adone.is.win32) {
        return str;
    }

    Object.keys(symbol).forEach((key) => {
        if (symbol[key] === symbolFallback[key]) {
            return;
        }
        str = str.replace(new RegExp(adone.text.escapeStringRegexp(symbol[key]), "g"), symbolFallback[key]);
    });

    return str;
};

// Get the length of an unicode string
export const length = (str) => adone.std.punycode.ucs2.decode(str).length;

// Return an array of chars
export const toArray = (str) => {
    return adone.std.punycode.ucs2.decode(str).map((code) => {
        return adone.std.punycode.ucs2.encode([code]);
    });
};

// Returns: 0: single char, 1: leading surrogate -1: trailing surrogate
export const surrogatePair = (char) => {
    const code = char.charCodeAt(0);
    if (code < 0xd800 || code >= 0xe000) {
        return 0;
    } else if (code < 0xdc00) {
        return 1;
    }
    return -1;
};

// Check if a character is a full-width char or not
export const isFullWidthCodePoint = (code) => {
    // Code points are derived from:
    // http://www.unicode.org/Public/UNIDATA/EastAsianWidth.txt
    if (code >= 0x1100 && (
        code <= 0x115f || // Hangul Jamo
        code === 0x2329 || // LEFT-POINTING ANGLE BRACKET
        code === 0x232a || // RIGHT-POINTING ANGLE BRACKET
        // CJK Radicals Supplement .. Enclosed CJK Letters and Months
        (code >= 0x2e80 && code <= 0x3247 && code !== 0x303f) ||
        // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
        code >= 0x3250 && code <= 0x4dbf ||
        // CJK Unified Ideographs .. Yi Radicals
        code >= 0x4e00 && code <= 0xa4c6 ||
        // Hangul Jamo Extended-A
        code >= 0xa960 && code <= 0xa97c ||
        // Hangul Syllables
        code >= 0xac00 && code <= 0xd7a3 ||
        // CJK Compatibility Ideographs
        code >= 0xf900 && code <= 0xfaff ||
        // Vertical Forms
        code >= 0xfe10 && code <= 0xfe19 ||
        // CJK Compatibility Forms .. Small Form Variants
        code >= 0xfe30 && code <= 0xfe6b ||
        // Halfwidth and Fullwidth Forms
        code >= 0xff01 && code <= 0xff60 ||
        code >= 0xffe0 && code <= 0xffe6 ||
        // Kana Supplement
        code >= 0x1b000 && code <= 0x1b001 ||
        // Enclosed Ideographic Supplement
        code >= 0x1f200 && code <= 0x1f251 ||
        // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
        code >= 0x20000 && code <= 0x3fffd)) {
        return true;
    }
    return false;
};

export const isFullWidth = (char) => {
    const code = char.codePointAt(0);
    return isFullWidthCodePoint(code);
};

// Convert normal ASCII chars to their full-width counterpart
export const toFullWidth = (str) => {
    return adone.std.punycode.ucs2.encode(
        adone.std.punycode.ucs2.decode(str).map((code) => {
            if (code >= 33 && code <= 126) {
                return 0xff00 + code - 0x20;
            }
            return code;
        })
    );
};
