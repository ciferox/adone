adone.application.report.setEvents("exception+fatalerror+signal+apicall");

const myException = function (request, response) {
    const m = "*** test-exception.js: throwing uncaught Error";
    throw new Error(m);
};

myException();
