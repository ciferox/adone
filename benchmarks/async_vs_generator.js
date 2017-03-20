
async function asyncSum(a, b) {
    return a + b;
}

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }


let generatorSum = (() => {
        var _ref2 = _asyncToGenerator(function* (a, b) {
            return a + b;
        });

        return function generatorSum(_x2, _x3) {
            return _ref2.apply(this, arguments);
        };
    })();

export default {
    async: [(defer) => {
        asyncSum(1, 2).then(() => defer.resolve());
    }, { defer: true }],
    generator: [(defer) => {
        generatorSum(1, 2).then(() => defer.resolve());
    }, { defer: true }]
};
