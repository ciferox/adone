export default function (lib, util) {
    lib.string = lib.string || {};

    // eslint-disable-next-line adone/no-typeof
    const isString = (value) => typeof value === "string";

    lib.string.startsWith = function (str, prefix) {
        if (!isString(str) || !isString(prefix)) {
            return false;
        }
        return str.indexOf(prefix) === 0;
    };

    lib.string.endsWith = function (str, suffix) {
        if (!isString(str) || !isString(suffix)) {
            return false;
        }
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    };

    lib.string.equalIgnoreCase = function (str1, str2) {
        if (!isString(str1) || !isString(str2)) {
            return false;
        }
        return str1.toLowerCase() === str2.toLowerCase();
    };

    lib.string.equalIgnoreSpaces = function (str1, str2) {
        if (!isString(str1) || !isString(str2)) {
            return false;
        }
        return str1.replace(/\s/g, "") === str2.replace(/\s/g, "");
    };

    lib.string.containIgnoreSpaces = function (str1, str2) {
        if (!isString(str1) || !isString(str2)) {
            return false;
        }
        return str1.replace(/\s/g, "").indexOf(str2.replace(/\s/g, "")) > -1;
    };

    lib.string.containIgnoreCase = function (str1, str2) {
        if (!isString(str1) || !isString(str2)) {
            return false;
        }
        return str1.toLowerCase().indexOf(str2.toLowerCase()) > -1;
    };

    lib.string.singleLine = function (str) {
        if (!isString(str)) {
            return false;
        }
        return str.trim().indexOf("\n") === -1;
    };

    lib.string.reverseOf = function (str, reversed) {
        if (!isString(str) || !isString(reversed)) {
            return false;
        }
        return str.split("").reverse().join("") === reversed;
    };

    lib.string.palindrome = function (str) {
        if (!isString(str)) {
            return false;
        }
        const len = str.length;
        for (let i = 0; i < Math.floor(len / 2); i++) {
            if (str[i] !== str[len - 1 - i]) {
                return false;
            }
        }
        return true;
    };

    lib.string.entriesCount = function (str, substr, count) {
        let matches = 0;
        if (isString(str) && isString(substr)) {
            let i = 0;
            const len = str.length;
            while (i < len) {
                const indx = str.indexOf(substr, i);
                if (indx === -1) {
                    break;
                } else {
                    matches++;
                    i = indx + 1;
                }
            }
        }
        return matches === count;
    };

    lib.string.indexOf = function (str, substr, index) {
        const indx = !isString(str) || !isString(substr) ? -1 : str.indexOf(substr);
        return indx === index;
    };

    const startsWithMethodWrapper = function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.startsWith(actual, expected),
            `expected ${this._obj} to start with ${expected}`,
            `expected ${this._obj} not to start with ${expected}`
        );
    };

    lib.Assertion.addChainableMethod("startsWith", startsWithMethodWrapper);
    lib.Assertion.addChainableMethod("startWith", startsWithMethodWrapper);

    const endsWithMethodWrapper = function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.endsWith(actual, expected),
            `expected ${this._obj} to end with ${expected}`,
            `expected ${this._obj} not to end with ${expected}`
        );
    };

    lib.Assertion.addChainableMethod("endsWith", endsWithMethodWrapper);
    lib.Assertion.addChainableMethod("endWith", endsWithMethodWrapper);

    lib.Assertion.addChainableMethod("equalIgnoreCase", function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.equalIgnoreCase(actual, expected),
            `expected ${this._obj} to equal ${expected} ignoring case`,
            `expected ${this._obj} not to equal ${expected} ignoring case`
        );
    });

    lib.Assertion.addChainableMethod("equalIgnoreSpaces", function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.equalIgnoreSpaces(actual, expected),
            `expected ${this._obj} to equal ${expected} ignoring spaces`,
            `expected ${this._obj} not to equal ${expected} ignoring spaces`
        );
    });

    lib.Assertion.addChainableMethod("containIgnoreSpaces", function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.containIgnoreSpaces(actual, expected),
            `expected ${this._obj} to contain ${expected} ignoring spaces`,
            `expected ${this._obj} not to contain ${expected} ignoring spaces`
        );
    });

    lib.Assertion.addChainableMethod("containIgnoreCase", function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.containIgnoreCase(actual, expected),
            `expected ${this._obj} to contain ${expected} ignoring case`,
            `expected ${this._obj} not to contain ${expected} ignoring case`
        );
    });

    lib.Assertion.addChainableMethod("singleLine", function () {
        const actual = this._obj;

        return this.assert(
            lib.string.singleLine(actual),
            `expected ${this._obj} to be a single line`,
            `expected ${this._obj} not to be a single line`
        );
    });

    lib.Assertion.addChainableMethod("reverseOf", function (expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.reverseOf(actual, expected),
            `expected ${this._obj} to be the reverse of ${expected}`,
            `expected ${this._obj} not to be the reverse of ${expected}`
        );
    });

    lib.Assertion.addChainableMethod("palindrome", function () {
        const actual = this._obj;

        return this.assert(
            lib.string.palindrome(actual),
            `expected ${this._obj} to be a palindrome`,
            `expected ${this._obj} not to be a palindrome`
        );
    });

    lib.Assertion.addChainableMethod("entriesCount", function (substr, expected) {
        const actual = this._obj;

        return this.assert(
            lib.string.entriesCount(actual, substr, expected),
            `expected ${this._obj} to have ${substr} ${expected} time(s)`,
            `expected ${this._obj} to not have ${substr} ${expected} time(s)`
        );
    });

    lib.Assertion.addChainableMethod("indexOf", function (substr, index) {
        const actual = this._obj;

        return this.assert(
            lib.string.indexOf(actual, substr, index),
            `expected ${this._obj} to have ${substr} on index ${index}`,
            `expected ${this._obj} to not have ${substr} on index ${index}`
        );
    });

    // Asserts
    const assert = lib.assert;

    assert.startsWith = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.startsWith(exp);
    };

    assert.notStartsWith = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.startsWith(exp);
    };

    assert.endsWith = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.endsWith(exp);
    };

    assert.notEndsWith = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.endsWith(exp);
    };

    assert.equalIgnoreCase = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.equalIgnoreCase(exp);
    };

    assert.notEqualIgnoreCase = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.equalIgnoreCase(exp);
    };

    assert.equalIgnoreSpaces = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.equalIgnoreSpaces(exp);
    };

    assert.notEqualIgnoreSpaces = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.equalIgnoreSpaces(exp);
    };

    assert.containIgnoreSpaces = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.containIgnoreSpaces(exp);
    };

    assert.notContainIgnoreSpaces = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.containIgnoreSpaces(exp);
    };

    assert.containIgnoreCase = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.containIgnoreCase(exp);
    };

    assert.notContainIgnoreCase = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.containIgnoreCase(exp);
    };

    assert.singleLine = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.singleLine();
    };

    assert.notSingleLine = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.singleLine();
    };

    assert.reverseOf = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.reverseOf(exp);
    };

    assert.notReverseOf = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.reverseOf(exp);
    };

    assert.palindrome = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.be.palindrome();
    };

    assert.notPalindrome = function (val, exp, msg) {
        new lib.Assertion(val, msg).to.not.be.palindrome();
    };

    assert.entriesCount = function (str, substr, count, msg) {
        new lib.Assertion(str, msg).to.have.entriesCount(substr, count);
    };

    assert.indexOf = function (str, substr, index, msg) {
        new lib.Assertion(str, msg).to.have.indexOf(substr, index);
    };
}
