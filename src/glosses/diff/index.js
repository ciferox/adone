adone.lazify({
    Diff: "./diff/base",

    diffChars: ["./diff/character", "diffChars"],
    diffWords: ["./diff/word", "diffWords"],
    diffWordsWithSpace: ["./diff/word", "diffWordsWithSpace"],
    diffLines: ["./diff/line", "diffLines"],
    diffTrimmedLines: ["./diff/line", "diffLines"],
    diffSentences: ["./diff/sentence", "diffSentences"],

    diffCss: ["./diff/css", "diffCss"],
    diffJson: ["./diff/json", "diffJson"],

    diffArrays: ["./diff/array", "diffArrays"],

    structuredPatch: ["./patch/create", "structuredPatch"],
    createTwoFilesPatch: ["./patch/create", "createTwoFilesPatch"],
    createPatch: ["./patch/create", "createPatch"],
    applyPatch: ["./patch/apply", "applyPatch"],
    applyPatches: ["./patch/apply", "applyPatches"],
    parsePatch: ["./patch/parse", "parsePatch"],
    merge: ["./patch/merge", "merge"],
    convertChangesToDMP: ["./convert/dmp", "convertChangesToDMP"],
    convertChangesToXML: ["./convert/xml", "convertChangesToXML"],
    canonicalize: ["./diff/json", "canonicalize"]
}, adone.asNamespace(exports), require);
