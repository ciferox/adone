export default (str) => {
    // eslint-disable-next-line adone/no-typeof
    if (typeof str !== "string" || str.length === 0) {
        return false;
    }

    let match;
    while ((match = /(\\).|([@?!+*]\(.*\))/g.exec(str))) {
        if (match[2]) {
            return true;
        }
        str = str.slice(match.index + match[0].length);
    }

    return false;
};
