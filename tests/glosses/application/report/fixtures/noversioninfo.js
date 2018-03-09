// Tamper with the process object
delete process.version;
delete process.versions;

adone.application.report.triggerReport();
