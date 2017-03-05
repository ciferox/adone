// @flow

import adone from "adone";
import useref from "useref";

const { x, fast: { Fast } } = adone;

export default function (options = {}) {
    return new Fast(null, {
        transform(file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            const output = useref(file.contents.toString(), options);

            file.contents = new Buffer(output[0]);
            this.push(file);
        }
    });
}
