const { is, util, schema: { __ } } = adone;

export default () => {
    const RULES = [
        {
            type: "number",
            rules: [{ maximum: ["exclusiveMaximum"] },
            { minimum: ["exclusiveMinimum"] }, "multipleOf", "format"]
        },
        {
            type: "string",
            rules: ["maxLength", "minLength", "pattern", "format"]
        },
        {
            type: "array",
            rules: ["maxItems", "minItems", "uniqueItems", "contains", "items"]
        },
        {
            type: "object",
            rules: ["maxProperties", "minProperties", "required", "dependencies", "propertyNames",
                { properties: ["additionalProperties", "patternProperties"] }]
        },
        { rules: ["$ref", "const", "enum", "not", "anyOf", "oneOf", "allOf"] }
    ];

    const ALL = ["type"];
    const KEYWORDS = [
        "additionalItems", "$schema", "id", "title",
        "description", "default", "definitions"
    ];
    const TYPES = ["number", "integer", "string", "array", "object", "boolean", "null"];
    RULES.all = __.util.toHash(ALL);
    RULES.types = __.util.toHash(TYPES);

    RULES.forEach((group) => {
        group.rules = group.rules.map((keyword) => {
            let implKeywords;
            if (is.object(keyword)) {
                const key = util.keys(keyword)[0];
                implKeywords = keyword[key];
                keyword = key;
                for (const k of implKeywords) {
                    ALL.push(k);
                    RULES.all[k] = true;
                }
            }
            ALL.push(keyword);
            const rule = RULES.all[keyword] = {
                keyword,
                code: __.ruleModules[keyword],
                implements: implKeywords
            };
            return rule;
        });

        if (group.type) {
            RULES.types[group.type] = group;
        }
    });

    RULES.keywords = __.util.toHash(ALL.concat(KEYWORDS));
    RULES.custom = {};

    return RULES;
};
