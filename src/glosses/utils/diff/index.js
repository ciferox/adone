import Diff from "./diff/base";
import { diffChars } from "./diff/character";
import { diffWords, diffWordsWithSpace, wordDiff } from "./diff/word";
import { diffLines, diffTrimmedLines } from "./diff/line";
import { diffSentences } from "./diff/sentence";

import { diffCSS } from "./diff/css";
import { diffObject, canonicalizeObject } from "./diff/object";

import { diffArrays } from "./diff/array";

import { applyPatch, applyPatches } from "./patch/apply";
import { mergePatches } from "./patch/merge";
import { parsePatch } from "./patch/parse";
import { structuredPatch, createTwoFilesPatch, createPatch } from "./patch/create";

import { convertChangesToDMP, convertChangesToXML } from "./convert";

export {
    Diff,
    diffChars as chars,
    diffWords as words,
    diffWordsWithSpace as wordsWithSpace,
    diffLines as lines,
    diffTrimmedLines as trimmedLines,
    diffSentences as sentences,
    diffCSS as css,
    diffObject as objects,
    diffArrays as arrays,
    structuredPatch as createStructuredPatch,
    createTwoFilesPatch,
    createPatch,
    applyPatch,
    applyPatches,
    parsePatch,
    mergePatches,
    convertChangesToDMP,
    convertChangesToXML,
    canonicalizeObject,
    wordDiff // For tests
};
