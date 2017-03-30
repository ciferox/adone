const matchHtmlRegExp = /["'&<>]/;

const escapeHtml = (string) => {
    const str = `${string}`;
    const match = matchHtmlRegExp.exec(str);

    if (!match) {
        return str;
    }

    let escape;
    let html = "";
    let index = 0;
    let lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str[index]) {
            case '"': {
                escape = "&quot;";
                break;
            }
            case "&": {
                escape = "&amp;";
                break;
            }
            case "'": {
                escape = "&#39;";
                break;
            }
            case "<": {
                escape = "&lt;";
                break;
            }
            case ">": {
                escape = "&gt;";
                break;
            }
            default: {
                continue;
            }
        }

        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
};

export default escapeHtml;