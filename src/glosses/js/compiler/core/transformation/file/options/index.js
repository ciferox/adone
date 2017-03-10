// @flow

import adone from "adone";
import parsers from "./parsers";
import config from "./config";

export { config };

export const normaliseOptions = (options: Object = {}): Object => {
    for (const key in options) {
        let val = options[key];
        if (adone.is.nil(val)) {
            continue;
        }

        let opt = config[key];
        if (opt && opt.alias) {
            opt = config[opt.alias];
        }
        if (!opt) {
            continue;
        }

        const parser = parsers[opt.type];
        if (parser) {
            val = parser(val);
        }

        options[key] = val;
    }

    return options;
};
