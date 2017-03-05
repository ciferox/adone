export default function functionName(func) {
    let name = func.displayName || func.name;
    let matches;

    // Use function decomposition as a last resort to get function
    // name. Does not rely on function decomposition to work - if it
    // doesn't debugging will be slightly less informative
    // (i.e. toString will say 'spy' rather than 'myFunc').
    if (!name && (matches = func.toString().match(/function ([^\s\(]+)/))) {
        name = matches[1];
    }

    return name;
}
