Object.defineProperty(process, "versions", {
    get() {
        throw new Error("boom");
    }
});

adone.app.report.triggerReport();
