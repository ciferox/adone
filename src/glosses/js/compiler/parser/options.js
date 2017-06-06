// A second optional argument can be given to further configure
// the parser process. These options are recognized:

export const defaultOptions = {
    // Source type ("script" or "module") for different semantics
    sourceType: "script",
    // Source filename.
    sourceFilename: undefined,
    // Line from which to start counting source. Useful for
    // integration with other tools.
    startLine: 1,
    // When enabled, a return at the top level is not considered an
    // error.
    allowReturnOutsideFunction: false,
    // When enabled, import/export statements are not constrained to
    // appearing at the top of the program.
    allowImportExportEverywhere: false,
    // TODO
    allowSuperOutsideMethod: false,
    // An array of plugins to enable
    plugins: [],
    // TODO
    strictMode: null
};

// Interpret and default an options object

export const getOptions = (opts) => {
    const options = {};
    for (const key in defaultOptions) {
        options[key] = opts && key in opts ? opts[key] : defaultOptions[key];
    }
    return options;
};
