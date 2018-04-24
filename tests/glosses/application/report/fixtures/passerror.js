adone.app.report.setEvents("exception+fatalerror+signal+apicall");

try {
    throw new Error("Testing error handling");
} catch (err) {
    adone.app.report.triggerReport(err);
}
