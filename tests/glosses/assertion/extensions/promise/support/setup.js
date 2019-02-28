const {
    assertion
} = adone;

assertion.use(assertion.extension.promise);

// process.on("unhandledRejection", () => {
//     // Do nothing; we test these all the time.
// });
// process.on("rejectionHandled", () => {
//     // Do nothing; we test these all the time.
// });
