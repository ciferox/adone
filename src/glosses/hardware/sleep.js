module.exports = {
    nano(ns) {
        const start = process.hrtime();
        while (process.hrtime() < start + ns) { }
    }
};
