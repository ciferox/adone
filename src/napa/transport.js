export {
    Transportable,
    TransportableObject,
    TransportContext,
    AutoTransportable,
    isTransportable,
    cid
} from "./transport/transportable";

export * from "./transport/transport";

// import { Handle } from "./memory/handle";
// import { TransportContext } from "./transport/transportable";
import * as functionTransporter from "./transport/function-transporter";

const binding = require("./binding");

/// <summary> Create a transport context. </summary>
export const createTransportContext = function (owning = true, handle = undefined) {
    return new binding.TransportContextWrap(owning, handle);
};

export const saveFunction = functionTransporter.save;
export const loadFunction = functionTransporter.load;
