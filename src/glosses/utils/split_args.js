export default (input, sep, keepQuotes) => {
    const separator = sep || /\s/g;
    let singleQuoteOpen = false;
    let doubleQuoteOpen = false;
    let tokenBuffer = [];
    const ret = [];

    const arr = input.split("");
    for (let i = 0; i < arr.length; ++i) {
        const element = arr[i];
        const matches = element.match(separator);
        if (element === "'" && !doubleQuoteOpen) {
            if (keepQuotes === true) {
                tokenBuffer.push(element);
            }
            singleQuoteOpen = !singleQuoteOpen;
            continue;
        } else if (element === '"' && !singleQuoteOpen) {
            if (keepQuotes === true) {
                tokenBuffer.push(element);
            }
            doubleQuoteOpen = !doubleQuoteOpen;
            continue;
        }

        if (!singleQuoteOpen && !doubleQuoteOpen && matches) {
            if (tokenBuffer.length > 0) {
                ret.push(tokenBuffer.join(""));
                tokenBuffer = [];
            } else if (sep) {
                ret.push(element);
            }
        } else {
            tokenBuffer.push(element);
        }
    }
    if (tokenBuffer.length > 0) {
        ret.push(tokenBuffer.join(""));
    } else if (sep) {
        ret.push("");
    }
    return ret;
};
