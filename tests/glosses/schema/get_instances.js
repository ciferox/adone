export default function getInstances(opts, useOpts = {}) {
    const optsNames = adone.util.keys(opts);
    if (optsNames.length) {
        const useOpts1 = adone.util.clone(useOpts);
        const opt = optsNames[0];
        useOpts1[opt] = opts[opt];
        delete opts[opt];
        return [
            ...getInstances(opts, useOpts),
            ...getInstances(opts, useOpts1)
        ];
    }
    return [new adone.schema.Validator(useOpts)];
}
