import { property } from "./sanitize";

const {
    is
} = adone;

export default function setupNamespace(name, root, forAssignment, globals) {
    const parts = name.split(".");
    if (globals) {
        parts[0] =
            (is.function(globals) ? globals(parts[0]) : globals[parts[0]]) ||
                parts[0];
    }
    const last = parts.pop();
    let acc = root;
    if (forAssignment) {
        return parts
            .map((part) => ((acc += property(part)), `${acc} = ${acc} || {}`))
            .concat(`${acc}${property(last)}`)
            .join(", ");
    }
    
    return (`${parts
        .map((part) => ((acc += property(part)), `${acc} = ${acc} || {};`))
        .join("\n")}\n`);
    
}
