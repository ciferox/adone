export const convertChangesToDMP = (changes) => {
    const ret = [];
    let operation;
    for (const change of changes) {
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
};

export const convertChangesToXML = (changes) => {
    const ret = [];
    for (const change of changes) {
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
};
