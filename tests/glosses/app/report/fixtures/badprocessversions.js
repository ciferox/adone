// Tamper with the process object
Object.defineProperty(process.versions, "uv", {
    get() {
        throw new Error("boom");
    }
});

adone.app.report.triggerReport();
