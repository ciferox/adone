const prop = require("./prop");

const {
    is
} = adone;

function id(e) {
    return e; 
}

module.exports = function tester(test) {
    return (
        typeof test === "object" && is.function(test.test) //regexp
            ? function (data) {
                return test.test(data); 
            }
            : prop(test) || id
    );
};
