const {
    assertion
} = adone;

assertion.use(assertion.extension.mock);

require("./call_arguments");
require("./call_context");
require("./call_count");
require("./call_order");
require("./calling_with_new");
require("./messages");
require("./regressions");
require("./returning");
require("./throwing");
