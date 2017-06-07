require("./node.setup");

let currentListener = null;
let currentError = null;

beforeEach((done) => {
    currentError = null;
    currentListener = function (error) {
        currentError = error;
    };
    testUtils.addUnhandledRejectionListener(currentListener);
    done();
});

afterEach((done) => {
    testUtils.removeUnhandledRejectionListener(currentListener);
    done(currentError);
});
