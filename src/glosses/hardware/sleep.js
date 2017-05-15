module.exports = {
    nano: function (ns) {
        const start = process.hrtime();
        while (process.hrtime() < start + ns) { }
    }
};
