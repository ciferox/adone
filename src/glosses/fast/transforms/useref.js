import _useref from "useref";

export default function useref(options = {}) {
    const { x, fast: { Fast } } = adone;

    return new Fast(null, {
        transform(file) {
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
        }
    });
}
