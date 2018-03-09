adone.application.report.setEvents("exception+fatalerror+signal+apicall");

try {
    throw new Error("Testing error handling");
} catch (err) {
    adone.application.report.triggerReport(err);
}
