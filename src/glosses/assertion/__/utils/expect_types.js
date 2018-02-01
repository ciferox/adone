const { assertion: $assert } = adone;
const { __: { util } } = $assert;

const vowels = new Set(["a", "e", "i", "o", "u"]);

export default function expectTypes(obj, types) {
    let flagMsg = util.flag(obj, "message");
    const ssfi = util.flag(obj, "ssfi");
    flagMsg = flagMsg ? `${flagMsg}: ` : "";
    obj = util.flag(obj, "object");
    types = types.map((t) => t.toLowerCase());
    types.sort();

    // Transforms ['lorem', 'ipsum'] into 'a lirum, or an ipsum'
    const str = types.map((t, index) => {
        const art = vowels.has(t.charAt(0)) ? "an" : "a";
        const or = types.length > 1 && index === types.length - 1 ? "or " : "";
        return `${or + art} ${t}`;
    }).join(", ");

    const objType = adone.meta.typeOf(obj).toLowerCase();

    if (!types.some((expected) => objType === expected)) {
        throw new $assert.AssertionError(
            `${flagMsg}object tested must be ${str}, but ${objType} given`,
            undefined,
            ssfi
        );
    }
}
