export default function (lib, util) {
    const { is } = adone;
    const { assertion: { config, AssertionError } } = adone;
    const { flag } = util;

    class Assertion {
        constructor(object, msg, stack) {
            flag(this, "ssfi", stack || Assertion);
            flag(this, "object", object);
            flag(this, "message", msg);
        }

        assert(expr, msg, negateMsg, expected, _actual, showDiff) {
            const args = [expr, msg, negateMsg, expected, _actual, showDiff];
            const ok = util.test(this, args);
            if (showDiff !== false) {
                showDiff = true;
            }
            if (is.undefined(expected) && is.undefined(_actual)) {
                showDiff = false;
            }
            if (config.showDiff !== true) {
                showDiff = false;
            }

            if (!ok) {
                msg = util.getMessage(this, args);
                const actual = util.getActual(this, args);
                throw new AssertionError(msg, {
                    actual,
                    expected,
                    showDiff
                }, config.includeStack ? this.assert : flag(this, "ssfi"));
            }
        }

        get _obj() {
            return flag(this, "object");
        }

        set _obj(value) {
            flag(this, "object", value);
        }

        static addProperty(name, fn) {
            util.addProperty(this.prototype, name, fn);
        }

        static addMethod(name, fn) {
            util.addMethod(this.prototype, name, fn);
        }

        static addChainableMethod(name, fn, chainingBehavior) {
            util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
        }

        static overwriteProperty(name, fn) {
            util.overwriteProperty(this.prototype, name, fn);
        }

        static overwriteMethod(name, fn) {
            util.overwriteMethod(this.prototype, name, fn);
        }

        static overwriteChainableMethod(name, fn, chainingBehavior) {
            util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
        }
    }

    lib.Assertion = Assertion;
    lib.getAssertion = (obj, msg, stack) => util.proxify(new Assertion(obj, msg, stack));
}
