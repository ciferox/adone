export default function transferFlags(assertion, object, includeAll) {
    const flags = assertion.__flags || (assertion.__flags = Object.create(null));

    if (!object.__flags) {
        object.__flags = Object.create(null);
    }

    includeAll = arguments.length === 3 ? includeAll : true;

    for (const flag in flags) {
        if (includeAll ||
            (flag !== "object" && flag !== "ssfi" && flag !== "lockSsfi" && flag !== "message")) {
            object.__flags[flag] = flags[flag];
        }
    }
}
