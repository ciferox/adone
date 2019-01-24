import { RuleTester } from "eslint";
import { rules } from "..";

export default (ctx) => {
    const tester = new RuleTester();

    RuleTester.describe = (_, cb) => {
        cb();
    };

    let description;

    RuleTester.it = (name, cb) => {
        it(description, cb);
    };

    ctx.runtime.valid = (name) => {
        if (!rules[name]) {
            throw new Error(`Unknown rule: ${name}`);
        }

        return (_description, obj) => {
            description = _description;

            tester.run(name, rules[name], {
                valid: adone.util.arrify(obj).map((x) => ({
                    parser: "babel-eslint",
                    parserOptions: {
                        "sourceType": "module",
                        "ecmaVersion": 7
                    },
                    ...obj
                })),
                invalid: []
            });
        };
    };

    ctx.runtime.invalid = (name) => {
        if (!rules[name]) {
            throw new Error(`Unknown rule: ${name}`);
        }

        return (_description, obj) => {
            description = _description;

            tester.run(name, rules[name], {
                valid: [],
                invalid: adone.util.arrify(obj).map((x) => ({
                    parser: "babel-eslint",
                    parserOptions: {
                        "sourceType": "module",
                        "ecmaVersion": 7
                    },
                    ...x
                }))
            });
        };
    };
};
