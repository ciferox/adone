

// See: http://code.google.com/p/google-diff-match-patch/wiki/API
export function convertChangesToDMP(changes) {
    const ret = [];
    let operation;
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        if (change.added) {
            operation = 1;
        } else if (change.removed) {
            operation = -1;
        } else {
            operation = 0;
        }

        ret.push([operation, change.value]);
    }
    return ret;
}

export function convertChangesToXML(changes) {
    const ret = [];
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        if (change.added) {
            ret.push("<ins>");
        } else if (change.removed) {
            ret.push("<del>");
        }

        ret.push(adone.text.escape.htmlSpecialChars(change.value));

        if (change.added) {
            ret.push("</ins>");
        } else if (change.removed) {
            ret.push("</del>");
        }
    }
    return ret.join("");
}
