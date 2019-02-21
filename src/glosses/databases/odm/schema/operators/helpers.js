const {
    is
} = adone;

const Types = adone.lazify({
    Number: "../number"
}, null, require);

/*!
 * @ignore
 */

exports.castToNumber = castToNumber;
exports.castArraysOfNumbers = castArraysOfNumbers;

/*!
 * @ignore
 */

function castToNumber(val) {
    return Types.Number.prototype.cast.call(this, val);
}

function castArraysOfNumbers(arr, self) {
    arr.forEach((v, i) => {
        if (is.array(v)) {
            castArraysOfNumbers(v, self);
        } else {
            arr[i] = castToNumber.call(self, v);
        }
    });
}
