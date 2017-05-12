const KEYWORDS = [
    "multipleOf",
    "maximum",
    "exclusiveMaximum",
    "minimum",
    "exclusiveMinimum",
    "maxLength",
    "minLength",
    "pattern",
    "additionalItems",
    "maxItems",
    "minItems",
    "uniqueItems",
    "maxProperties",
    "minProperties",
    "required",
    "additionalProperties",
    "enum",
    "format",
    "const"
];

export default (metaSchema, keywordsJsonPointers) => {
    for (const pointer of keywordsJsonPointers) {
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        const segments = pointer.split("/").slice(1);
        let keywords = metaSchema;
        for (const segment of segments) {
            keywords = keywords[segment];
        }

        for (const key of KEYWORDS) {
            const schema = keywords[key];
            if (schema) {
                keywords[key] = {
                    anyOf: [
                        schema,
                        { $ref: "https://raw.githubusercontent.com/epoberezkin/ajv/master/lib/refs/$data.json#" }
                    ]
                };
            }
        }
    }

    return metaSchema;
};
