const {
    fs2: { base }
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
        options[m] = options[m] || base[m];
        m = `${m}Sync`;
        options[m] = options[m] || base[m];
    });

    options.maxBusyTries = options.maxBusyTries || 3;
};
