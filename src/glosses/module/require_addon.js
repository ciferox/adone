export default (addonPath) => {
    // special case for KRI
    if (addonPath === "#") {
        return;
    }

    if (!adone.path.isAbsolute(addonPath)) {
        throw Error("Path to addon should be absolute");
    }
    return require(addonPath);
};
