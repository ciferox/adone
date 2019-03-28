const testOrder = exports.testOrder = [
    "error",
    "warn",
    "dog",
    "cat",
    "info",
    "verbose",
    "silly",
    "parrot"
];

exports.testLevels = testOrder.reduce((acc, level, i) => {
    acc[level] = {
        id: i
    };
    return acc;
}, {});
