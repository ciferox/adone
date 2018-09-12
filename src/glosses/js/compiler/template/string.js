import { normalizeReplacements } from "./options";
import parseAndBuildMetadata from "./parse";
import populatePlaceholders from "./populate";

export default function stringTemplate(
    formatter,
    code,
    opts,
) {
    code = formatter.code(code);

    let metadata;

    return (arg) => {
        const replacements = normalizeReplacements(arg);

        if (!metadata) {
            metadata = parseAndBuildMetadata(formatter, code, opts);
        }

        return formatter.unwrap(populatePlaceholders(metadata, replacements));
    };
}
