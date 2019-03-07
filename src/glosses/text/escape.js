const {
    is
} = adone;

export const regExpPattern = (str) => str.replace(/([.*+?^${}()|[\]/\\])/g, "\\$1");

export const regExpReplacement = (str) => str.replace(/\$/g, "$$$$");	// This replace any single $ by a double $$

export const format = (str) => str.replace(/%/g, "%%");	// This replace any single % by a double %%

const escapeControlMap = {
    "\r": "\\r",
    "\n": "\\n",
    "\t": "\\t",
    "\x7f": "\\x7f"
};

// Escape \r \n \t so they become readable again, escape all ASCII control character as well, using \x syntaxe
export const control = (str, keepNewLineAndTab = false) => {
    return str.replace(/[\x00-\x1f\x7f]/g, (match) => {
        if (keepNewLineAndTab && (match === "\n" || match === "\t")) {
            return match;
        }
        if (!is.undefined(escapeControlMap[match])) {
            return escapeControlMap[match];
        }
        let hex = match.charCodeAt(0).toString(16);
        if (hex.length % 2) {
            hex = `0${hex}`;
        }
        return `\\x${hex}`;
    });
};

export const jsSingleQuote = (str) => control(str).replace(/'/g, "\\'");

export const jsDoubleQuote = (str) => control(str).replace(/"/g, '\\"');

export const shellArg = (str) => `'${str.replace(/'/g, "'\\''")}'`;

const escapeHtmlMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
};

// Only escape & < > so this is suited for content outside tags
export const html = (str) => str.replace(/[&<>]/g, (match) => {
    return escapeHtmlMap[match];
});

// Escape & < > " so this is suited for content inside a double-quoted attribute
export const htmlAttr = (str) => str.replace(/[&<>"]/g, (match) => {
    return escapeHtmlMap[match];
});

// Escape all html special characters & < > " '
export const htmlSpecialChars = (str) => str.replace(/[&<>"']/g, (match) => {
    return escapeHtmlMap[match];
});
