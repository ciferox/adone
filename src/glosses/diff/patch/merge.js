const { is, x, diff: { util: { structuredPatch, parsePatch } } } = adone;

const loadPatch = (param, base = adone.null) => {
    if (is.string(param)) {
        if (/^@@/m.test(param) || /^Index:/m.test(param)) {
            return parsePatch(param)[0];
        }

        if (base === adone.null) {
            throw new x.InvalidArgument("Must provide a base reference or pass in a patch");
        }
        return structuredPatch(undefined, undefined, base, param);
    }

    return param;
};

const fileNameChanged = (patch) => patch.newFileName && patch.newFileName !== patch.oldFileName;

const selectField = (index, mine, theirs) => {
    if (mine === theirs) {
        return mine;
    }
    index.conflict = true;
    return { mine, theirs };
};

const hunkBefore = (test, check) => {
    return test.oldStart < check.oldStart && test.oldStart + test.oldLines < check.oldStart;
};

const cloneHunk = (hunk, offset) => ({
    oldStart: hunk.oldStart,
    oldLines: hunk.oldLines,
    newStart: hunk.newStart + offset,
    newLines: hunk.newLines,
    lines: hunk.lines
});

const conflict = (hunk, mine, their) => {
    hunk.conflict = true;
    hunk.lines.push({
        conflict: true,
        mine,
        theirs: their
    });
};

const insertLeading = (hunk, insert, their) => {
    while (insert.offset < their.offset && insert.index < insert.lines.length) {
        const line = insert.lines[insert.index++];
        hunk.lines.push(line);
        insert.offset++;
    }
};

const insertTrailing = (hunk, insert) => {
    while (insert.index < insert.lines.length) {
        const line = insert.lines[insert.index++];
        hunk.lines.push(line);
    }
};

const collectChange = (state) => {
    const ret = [];
    let operation = state.lines[state.index][0];

    while (state.index < state.lines.length) {
        const line = state.lines[state.index];

        // Group additions that are immediately after subtractions and treat them as one "atomic" modify change.
        if (operation === "-" && line[0] === "+") {
            operation = "+";
        }

        if (operation === line[0]) {
            ret.push(line);
            state.index++;
        } else {
            break;
        }
    }

    return ret;
};

const collectContext = (state, matchChanges) => {
    const changes = [];
    const merged = [];
    let matchIndex = 0;
    let contextChanges = false;
    let conflicted = false;

    while (matchIndex < matchChanges.length && state.index < state.lines.length) {
        let change = state.lines[state.index];
        const match = matchChanges[matchIndex];

        // Once we've hit our add, then we are done
        if (match[0] === "+") {
            break;
        }

        contextChanges = contextChanges || change[0] !== " ";

        merged.push(match);
        matchIndex++;

        // Consume any additions in the other block as a conflict to attempt
        // to pull in the remaining context after this
        if (change[0] === "+") {
            conflicted = true;

            while (change[0] === "+") {
                changes.push(change);
                change = state.lines[++state.index];
            }
        }

        if (match.substr(1) === change.substr(1)) {
            changes.push(change);
            state.index++;
        } else {
            conflicted = true;
        }
    }

    if ((matchChanges[matchIndex] || "")[0] === "+" && contextChanges) {
        conflicted = true;
    }

    if (conflicted) {
        return changes;
    }

    while (matchIndex < matchChanges.length) {
        merged.push(matchChanges[matchIndex++]);
    }

    return {
        merged,
        changes
    };
};

const removal = (hunk, mine, their, swap) => {
    const myChanges = collectChange(mine);
    const theirChanges = collectContext(their, myChanges);

    if (theirChanges.merged) {
        hunk.lines.push(...theirChanges.merged);
    } else {
        conflict(hunk, swap ? theirChanges : myChanges, swap ? myChanges : theirChanges);
    }
};

const allRemoves = (changes) => changes.reduce((prev, change) => prev && change[0] === "-", true);

const skipRemoveSuperset = (state, removeChanges, delta) => {
    for (let i = 0; i < delta; i++) {
        const changeContent = removeChanges[removeChanges.length - delta + i].substr(1);
        if (state.lines[state.index + i] !== ` ${changeContent}`) {
            return false;
        }
    }

    state.index += delta;
    return true;
};

const arrayStartsWith = (array, start) => {
    if (start.length > array.length) {
        return false;
    }

    for (let i = 0; i < start.length; i++) {
        if (start[i] !== array[i]) {
            return false;
        }
    }

    return true;
};

const arrayEqual = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }

    return arrayStartsWith(a, b);
};

const mutualChange = (hunk, mine, their) => {
    const myChanges = collectChange(mine);
    const theirChanges = collectChange(their);

    if (allRemoves(myChanges) && allRemoves(theirChanges)) {
        // Special case for remove changes that are supersets of one another
        if (
            arrayStartsWith(myChanges, theirChanges) &&
            skipRemoveSuperset(their, myChanges, myChanges.length - theirChanges.length)
        ) {
            hunk.lines.push(...myChanges);
            return;
        } else if (
            arrayStartsWith(theirChanges, myChanges) &&
            skipRemoveSuperset(mine, theirChanges, theirChanges.length - myChanges.length)
        ) {
            hunk.lines.push(...theirChanges);
            return;
        }
    } else if (arrayEqual(myChanges, theirChanges)) {
        hunk.lines.push(...myChanges);
        return;
    }

    conflict(hunk, myChanges, theirChanges);
};

const calcLineCount = (hunk) => {
    let conflicted = false;

    hunk.oldLines = 0;
    hunk.newLines = 0;

    hunk.lines.forEach((line) => {
        if (!is.string(line)) {
            conflicted = true;
            return;
        }

        if (line[0] === "+" || line[0] === " ") {
            hunk.newLines++;
        }
        if (line[0] === "-" || line[0] === " ") {
            hunk.oldLines++;
        }
    });

    if (conflicted) {
        delete hunk.oldLines;
        delete hunk.newLines;
    }
};

const mergeLines = (hunk, mineOffset, mineLines, theirOffset, theirLines) => {
    const mine = { offset: mineOffset, lines: mineLines, index: 0 };
    const their = { offset: theirOffset, lines: theirLines, index: 0 };
    // This will generally result in a conflicted hunk, but there are cases where the context
    // is the only overlap where we can successfully merge the content here.

    // Handle any leading content
    insertLeading(hunk, mine, their);
    insertLeading(hunk, their, mine);

    // Now in the overlap content. Scan through and select the best changes from each.
    while (mine.index < mine.lines.length && their.index < their.lines.length) {
        const mineCurrent = mine.lines[mine.index];
        const theirCurrent = their.lines[their.index];

        if ((mineCurrent[0] === "-" || mineCurrent[0] === "+") && (theirCurrent[0] === "-" || theirCurrent[0] === "+")) {
            // Both modified ...
            mutualChange(hunk, mine, their);
        } else if (mineCurrent[0] === "+" && theirCurrent[0] === " ") {
            // Mine inserted
            hunk.lines.push(...collectChange(mine));
        } else if (theirCurrent[0] === "+" && mineCurrent[0] === " ") {
            // Theirs inserted
            hunk.lines.push(...collectChange(their));
        } else if (mineCurrent[0] === "-" && theirCurrent[0] === " ") {
            // Mine removed or edited
            removal(hunk, mine, their);
        } else if (theirCurrent[0] === "-" && mineCurrent[0] === " ") {
            // Their removed or edited
            removal(hunk, their, mine, true);
        } else if (mineCurrent === theirCurrent) {
            // Context identity
            hunk.lines.push(mineCurrent);
            mine.index++;
            their.index++;
        } else {
            // Context mismatch
            conflict(hunk, collectChange(mine), collectChange(their));
        }
    }

    // Now push anything that may be remaining
    insertTrailing(hunk, mine);
    insertTrailing(hunk, their);

    calcLineCount(hunk);
};

export const mergePatches = (mine, theirs, base) => {
    mine = loadPatch(mine, base);
    theirs = loadPatch(theirs, base);

    const ret = {};

    // For index we just let it pass through as it doesn't have any necessary meaning.
    // Leaving sanity checks on this to the API consumer that may know more about the
    // meaning in their own context.
    if (mine.index || theirs.index) {
        ret.index = mine.index || theirs.index;
    }

    if (mine.newFileName || theirs.newFileName) {
        if (!fileNameChanged(mine)) {
            // No header or no change in ours, use theirs (and ours if theirs does not exist)
            ret.oldFileName = theirs.oldFileName || mine.oldFileName;
            ret.newFileName = theirs.newFileName || mine.newFileName;
            ret.oldHeader = theirs.oldHeader || mine.oldHeader;
            ret.newHeader = theirs.newHeader || mine.newHeader;
        } else if (!fileNameChanged(theirs)) {
            // No header or no change in theirs, use ours
            ret.oldFileName = mine.oldFileName;
            ret.newFileName = mine.newFileName;
            ret.oldHeader = mine.oldHeader;
            ret.newHeader = mine.newHeader;
        } else {
            // Both changed... figure it out
            ret.oldFileName = selectField(ret, mine.oldFileName, theirs.oldFileName);
            ret.newFileName = selectField(ret, mine.newFileName, theirs.newFileName);
            ret.oldHeader = selectField(ret, mine.oldHeader, theirs.oldHeader);
            ret.newHeader = selectField(ret, mine.newHeader, theirs.newHeader);
        }
    }

    ret.hunks = [];

    let mineIndex = 0;
    let theirsIndex = 0;
    let mineOffset = 0;
    let theirsOffset = 0;

    while (mineIndex < mine.hunks.length || theirsIndex < theirs.hunks.length) {
        const mineCurrent = mine.hunks[mineIndex] || { oldStart: Infinity };
        const theirsCurrent = theirs.hunks[theirsIndex] || { oldStart: Infinity };

        if (hunkBefore(mineCurrent, theirsCurrent)) {
            // This patch does not overlap with any of the others, yay.
            ret.hunks.push(cloneHunk(mineCurrent, mineOffset));
            mineIndex++;
            theirsOffset += mineCurrent.newLines - mineCurrent.oldLines;
        } else if (hunkBefore(theirsCurrent, mineCurrent)) {
            // This patch does not overlap with any of the others, yay.
            ret.hunks.push(cloneHunk(theirsCurrent, theirsOffset));
            theirsIndex++;
            mineOffset += theirsCurrent.newLines - theirsCurrent.oldLines;
        } else {
            // Overlap, merge as best we can
            const mergedHunk = {
                oldStart: Math.min(mineCurrent.oldStart, theirsCurrent.oldStart),
                oldLines: 0,
                newStart: Math.min(mineCurrent.newStart + mineOffset, theirsCurrent.oldStart + theirsOffset),
                newLines: 0,
                lines: []
            };
            mergeLines(
                mergedHunk,
                mineCurrent.oldStart, mineCurrent.lines,
                theirsCurrent.oldStart, theirsCurrent.lines
            );
            theirsIndex++;
            mineIndex++;

            ret.hunks.push(mergedHunk);
        }
    }

    return ret;
};
