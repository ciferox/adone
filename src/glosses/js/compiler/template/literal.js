import { normalizeReplacements } from "./options";
import parseAndBuildMetadata from "./parse";
import populatePlaceholders from "./populate";

const buildTemplateCode = function (tpl, prefix) {
    const names = [];

    let code = tpl[0];

    for (let i = 1; i < tpl.length; i++) {
        const value = `${prefix}${i - 1}`;
        names.push(value);

        code += value + tpl[i];
    }

    return { names, code };
};


const buildLiteralData = function (formatter, tpl, opts) {
    let names;
    let nameSet;
    let metadata;
    let prefix = "";

    do {
        // If there are cases where the template already contains $0 or any other
        // matching pattern, we keep adding "$" characters until a unique prefix
        // is found.
        prefix += "$";
        const result = buildTemplateCode(tpl, prefix);

        names = result.names;
        nameSet = new Set(names);
        metadata = parseAndBuildMetadata(formatter, formatter.code(result.code), {
            parser: opts.parser,

            // Explicitly include our generated names in the whitelist so users never
            // have to think about whether their placeholder pattern will match.
            placeholderWhitelist: new Set(
                result.names.concat(
                    opts.placeholderWhitelist
                        ? Array.from(opts.placeholderWhitelist)
                        : [],
                ),
            ),
            placeholderPattern: opts.placeholderPattern,
            preserveComments: opts.preserveComments
        });
    } while (
        metadata.placeholders.some(
            (placeholder) => placeholder.isDuplicate && nameSet.has(placeholder.name),
        )
    );

    return { metadata, names };
};

export default function literalTemplate(
    formatter,
    tpl,
    opts,
) {
    const { metadata, names } = buildLiteralData(formatter, tpl, opts);

    return (arg) => {
        const defaultReplacements = arg.reduce((acc, replacement, i) => {
            acc[names[i]] = replacement;
            return acc;
        }, {});

        return (arg) => {
            const replacements = normalizeReplacements(arg);

            if (replacements) {
                Object.keys(replacements).forEach((key) => {
                    if (Object.prototype.hasOwnProperty.call(defaultReplacements, key)) {
                        throw new Error("Unexpected replacement overlap.");
                    }
                });
            }

            return formatter.unwrap(
                populatePlaceholders(
                    metadata,
                    replacements
                        ? Object.assign(replacements, defaultReplacements)
                        : defaultReplacements,
                ),
            );
        };
    };
}
