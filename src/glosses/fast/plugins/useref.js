import _useref from "useref";

export default function plugin() {
    const { x } = adone;

    return function useref(options = {}) {
        return this.throughSync(function (file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            const output = _useref(file.contents.toString(), options);

            file.contents = Buffer.from(output[0]);
            this.push(file);
        });
    };
}
