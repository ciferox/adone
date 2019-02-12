/// <summary> In Napa.JS, transporting objects across isolates is required for multi-thread collaborations.
/// 
/// A JavaScript value is transportable, if
/// 1) it is a built-in JavaScript types, which includes primitive types, plain objects (whose constructor name is 'Object') and arrays.
/// 2) or a class implements Transportable.
/// 3) or it is a composite of #1 and #2.
/// 
/// </summary>

import * as transport from "./transport";
import * as v8 from "../v8";

// import { Shareable } from "../memory/shareable";
// import { Handle } from "../memory/handle";

const {
    is,
    std: { path }
} = adone;

// /// <summary> Transport context carries additional information needed to unmarshall 
// /// objects, besides the payload itself. Currently, only std::shared_ptr<T> is transported via TransportContext,
// /// since their lifecycle are beyond an V8 isolate thus cannot be managed only via payload.
// /// TransportContext is a C++ add-on and only accessed from C++ thus no method is exposed to JavaScript world.
// /// </summary>
// /// <remarks> Reference: napa::binding::TransportContextWrapImpl. </remarks>
// export interface TransportContext {
//     /// <summary> Save a shared_ptr for later load in another isolate. </summary>
//     saveShared(object: Shareable): void;

//     /// <summary> Load a shared_ptr from previous save in another isolate. </summary>
//     loadShared(handle: Handle): Shareable;

//     /// <summary> Number of shared object saved in this TransportContext. </summary> 
//     readonly sharedCount: number;
// }

// /// <summary> Interface for transportable non-built-in JavaScript types. </summary> 
// export interface Transportable {
//     /// <summary> Get Constructor ID (cid) for transportable object. </summary>
//     cid();

//     /// <summary> Marshall object into plain JavaScript object. </summary>
//     /// <param name='context'> Transport context for saving shared pointers, only usable for C++ addons that extends napa::module::ShareableWrap. </param>
//     /// <returns> Plain JavaScript value. </returns>
//     marshall(context);

//     /// <summary> Unmarshall object from payload, which is a plain JavaScript value, and a transport context. </summary>
//     /// <param name='payload'> Payload to read from, which already have inner objects transported. </param>
//     /// <param name='context'> Transport context for loading shared pointers, only needed for C++ addons that extends napa::module::ShareableWrap. </param>
//     unmarshall(payload, context): void
// }

/// <summary> Abstract class for transportable objects. 
/// Subclass' obligations:
/// 1) Constructor should accept zero parameters .
/// 2) Implement save()/load() to marshall/unmarshall internal state.
/// 3) Register with transport with a Constructor ID (cid) via one of following methods:
///    - declare class decorator: @cid() use '<module-name>.<class-name>' as cid.
///    - declare class decorator: @cid('<guid>') use the specified GUID as cid.
/// </summary>
export class TransportableObject {
    /// <summary> Get Constructor ID (cid) for this object. </summary>
    cid() {
        return Object.getPrototypeOf(this).constructor._cid;
    }

    /// <summary> Subclass to save state to payload. </summary>
    /// <param name='payload'> Payload to write to. 
    /// The sub-class should always serialize states into the payload 
    /// if they are required to load the sub-class instance. </param>
    /// <param name='context'> Transport context for saving shared pointers, only usable for C++ addons that extends napa::module::ShareableWrap. </param>
    save(payload, context) {
        throw new adone.error.NotImplementedException("Method 'save()' is not implemented");
    }

    /// <summary> Subclass to load state from payload. </summary>
    /// <param name='payload'> Payload to read from, which already have inner objects transported. </param>
    /// <param name='context'> Transport context for loading shared pointers, only usable for C++ addons that extends napa::module::ShareableWrap. </param>
    load(payload, context) {
        throw new adone.error.NotImplementedException("Method 'load()' is not implemented");
    }

    /// <summary> Marshall object into plain JavaScript object. </summary>
    /// <returns> Plain JavaScript value. </returns>
    marshall(context) {
        const payload = {
            _cid: this.cid()
        };
        this.save(payload, context);
        return payload;
    }

    /// <summary> Unmarshall object from payload, which is a plain JavaScript value, and a transport context. </summary>
    /// <param name='payload'> Payload to read from, which already have inner objects transported. </param>
    /// <param name='context'> Transport context for looking up shared pointers. </param>
    unmarshall(payload, context) {
        this.load(payload, context);
    }
}

/// <summary> Base class for JavaScript class that is auto transportable. 
/// A JavaScript class can be auto transportable when 
/// 1) it has a default constructor.
/// 2) members are transportable types.
/// 3) register via class decorator @cid or transport.register.
/// </summary>
export class AutoTransportable extends TransportableObject {
    /// <summary> Automatically save own properties to payload. </summary>
    /// <param name='payload'> Plain JS object to write to. </param>
    /// <param name='context'> Transport context for saving shared pointers, only usable for C++ addons that extends napa::module::ShareableWrap. </param>
    save(payload, context) {
        for (const property of Object.getOwnPropertyNames(this)) {
            payload[property] = transport.marshallTransform(this[property], context);
        }
    }

    /// <summary> Automatically load own properties from payload. </summary>
    /// <param name='payload'> Payload to read from, which already have inner objects transported. </param>
    /// <param name='context'> Transport context for loading shared pointers, only usable for C++ addons that extends napa::module::ShareableWrap. </param>
    load(payload, context) {
        // Members have already been unmarshalled.
        for (const property of Object.getOwnPropertyNames(payload)) {
            this[property] = payload[property];
        }
    }
}

/// <summary> Tell if a jsValue is transportable. </summary>
export const isTransportable = function (jsValue) {
    if (is.array(jsValue)) {
        // Traverse array.
        for (const element of jsValue) {
            if (!isTransportable(element)) {
                return false;
            }
        }
    } else if (typeof jsValue === "object") {
        const constructor = Object.getPrototypeOf(jsValue).constructor;
        if (constructor.name === "Object") {
            // Traverse object.
            for (const property in jsValue) {
                if (!isTransportable(jsValue[property])) {
                    return false;
                }
            }
        } else if (!is.function(jsValue.cid)) {
            return false;
        }
    }
    return true;
};

const NODE_MODULE_PREFIX = "node_modules/";

/// <summary> Extract module name from module.id.</summary>
const extractModuleName = function (moduleId) {
    moduleId = moduleId.replace("\\\\", "/");
    if (moduleId.endsWith(".js")) {
        moduleId = moduleId.substr(0, moduleId.length - 3);
    }

    const moduleRootStart = moduleId.lastIndexOf(NODE_MODULE_PREFIX);
    if (moduleRootStart >= 0) {
        // module is under node_modules.
        return moduleId.substr(moduleRootStart + NODE_MODULE_PREFIX.length);
    }

    // module is located using absolute or relative path.
    return path.relative(process.cwd(), moduleId).replace("\\\\", "/");
};

/// <summary> Decorator 'cid' to register a transportable class with a 'cid'. </summary>
/// <param name="guid"> If specified, use this GUID as cid. </param>
export const cid = function (guid) {
    let moduleName = null;
    if (!guid) {
        moduleName = extractModuleName(v8.currentStack(2)[1].getFileName());
    }

    return (constructor) => {
        const cid = moduleName ? `${moduleName}.${constructor.name}` : guid;
        constructor._cid = cid;
        transport.register(constructor);
    };
};
