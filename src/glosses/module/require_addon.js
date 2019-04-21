export default (addonPath) => {
    if (!adone.path.isAbsolute(addonPath)) {
        throw Error("Path to addon should be absolute");
    }
    require(addonPath);
};
