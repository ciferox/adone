const { lazify } = adone;

const diff = lazify({
    chars: ["./diff/character", (x) => x.diffChars],
    words: ["./diff/word", (x) => x.diffWords],
    wordsWithSpace: ["./diff/word", (x) => x.diffWordsWithSpace],
    lines: ["./diff/line", (x) => x.diffLines],
    trimmedLines: ["./diff/line", (x) => x.diffTrimmedLines],
    sentences: ["./diff/sentence", (x) => x.diffSentences],
    css: ["./diff/css", (x) => x.diffCSS],
    json: ["./diff/json", (x) => x.diffJson],
    arrays: ["./diff/array", (x) => x.diffArrays]
}, exports, require);

diff._ = lazify({
    Diff: "./diff/base",
    arrayDiff: ["./diff/array", (x) => x.arrayDiff],
    characterDiff: ["./diff/chars", (x) => x.characterDiff],
    cssDiff: ["./diff/css", (x) => x.cssDiff],
    lineDiff: ["./diff/line", (x) => x.lineDiff],
    jsonDiff: ["./diff/json", (x) => x.jsonDiff],
    sentenceDiff: ["./diff/sentence", (x) => x.sentenceDiff],
    wordDiff: ["./diff/word", (x) => x.wordDiff],
    helper: "./helpers"
}, null, require);

diff.util = lazify({
    canonicalizeObject: ["./diff/json", (x) => x.canonicalizeObject],
    structuredPatch: ["./patch/create", (x) => x.structuredPatch],
    createTwoFilesPatch: ["./patch/create", (x) => x.createTwoFilesPatch],
    createPatch: ["./patch/create", (x) => x.createPatch],
    applyPatch: ["./patch/apply", (x) => x.applyPatch],
    applyPatches: ["./patch/apply", (x) => x.applyPatches],
    parsePatch: ["./patch/parse", (x) => x.parsePatch],
    mergePatches: ["./patch/merge", (x) => x.mergePatches],
    convertChangesToDMP: ["./convert", (x) => x.convertChangesToDMP],
    convertChangesToXML: ["./convert", (x) => x.convertChangesToXML]
}, null, require);
