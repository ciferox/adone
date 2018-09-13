import traverseFast from "../traverse/traverseFast";
import removeProperties from "./removeProperties";

export default function removePropertiesDeep(tree, opts) {
    traverseFast(tree, removeProperties, opts);

    return tree;
}
