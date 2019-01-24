// import { Shareable } from "../memory/shareable";

// /// <summary>
// /// ShareableWrap of SerializedData.
// /// </summary>
// export interface SerializedData extends Shareable {
// }

export const serializeValue = function (jsValue) {
    return require("../binding").serializeValue(jsValue);
};

export const deserializeValue = function (serializedData) {
    return require("../binding").deserializeValue(serializedData);
};
