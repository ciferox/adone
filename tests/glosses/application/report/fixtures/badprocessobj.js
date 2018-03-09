Object.defineProperty(process, "versions", {
    get() {
        throw new Error("boom");
    }
});

adone.application.report.triggerReport();
