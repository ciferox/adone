const {
    fs2: { graceful }
} = adone;

export default (options) => {
    const methods = [
        "unlink",
        "chmod",
        "stat",
        "lstat",
        "rmdir",
        "readdir"
    ];
    methods.forEach((m) => {
        options[m] = options[m] || graceful[m];
        m = `${m}Sync`;
        options[m] = options[m] || graceful[m];
    });

    options.maxBusyTries = options.maxBusyTries || 3;
};
