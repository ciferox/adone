import {
    isAnyTypeAnnotation,
    isGenericTypeAnnotation,
    isUnionTypeAnnotation,
    isFlowBaseAnnotation
} from "../../validators/generated";

/**
 * Dedupe type annotations.
 */
export default function removeTypeDuplicates(nodes) {
    const generics = {};
    const bases = {};

    // store union type groups to circular references
    const typeGroups = [];

    const types = [];

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) {
            continue;
        }

        // detect duplicates
        if (types.includes(node)) {
            continue;
        }

        // this type matches anything
        if (isAnyTypeAnnotation(node)) {
            return [node];
        }

        if (isFlowBaseAnnotation(node)) {
            bases[node.type] = node;
            continue;
        }

        if (isUnionTypeAnnotation(node)) {
            if (!typeGroups.includes(node.types)) {
                nodes = nodes.concat(node.types);
                typeGroups.push(node.types);
            }
            continue;
        }

        // find a matching generic type and merge and deduplicate the type parameters
        if (isGenericTypeAnnotation(node)) {
            const name = node.id.name;

            if (generics[name]) {
                let existing = generics[name];
                if (existing.typeParameters) {
                    if (node.typeParameters) {
                        existing.typeParameters.params = removeTypeDuplicates(
                            existing.typeParameters.params.concat(node.typeParameters.params),
                        );
                    }
                } else {
                    existing = node.typeParameters;
                }
            } else {
                generics[name] = node;
            }

            continue;
        }

        types.push(node);
    }

    // add back in bases
    for (const type in bases) {
        types.push(bases[type]);
    }

    // add back in generics
    for (const name in generics) {
        types.push(generics[name]);
    }

    return types;
}
