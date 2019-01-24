import * as zone from "./zone";
import * as transport from "../transport";
import * as v8 from "../v8";

const {
    is,
    std: { path }
} = adone;

// interface FunctionSpec {
//     module;
//     function;
//     arguments[];
//     options: zone.CallOptions;
//     transportContext;
// }

class Result {
    constructor(payload, transportContext) {
        this._payload = payload;
        this._transportContext = transportContext; 
    }

    get value() {
        if (is.nil(this._value)) {
            this._value = transport.unmarshall(this._payload, this._transportContext);
        }

        return this._value;
    }

    get payload() {
        return this._payload; 
    }

    get transportContext() {
        return this._transportContext; 
    }

     _transportContext;

     _payload;

     _value;
}

/// <summary> Helper function to workaround possible delay in Promise resolve/reject when working with Node event loop.
/// See https://github.com/audreyt/node-webworker-threads/issues/123#issuecomment-254019552
/// </summary>
const runImmediately = function (func) {
    if (typeof __in_napa === "undefined") {
        // In node.
        setImmediate(func);
    } else {
        // In napa workers.
        func();
    }
};

/// <summary> Zone consists of Napa isolates. </summary>
export class ZoneImpl {
    _nativeZone;

    constructor(nativeZone) {
        this._nativeZone = nativeZone;
    }

    get id() {
        return this._nativeZone.getId();
    }

    toJSON() {
        return { id: this.id, type: this.id === "node" ? "node" : "napa" };
    }

    broadcast(arg1, arg2) {
        const spec = this.createBroadcastRequest(arg1, arg2);

        return new Promise((resolve, reject) => {
            this._nativeZone.broadcast(spec, (result) => {
                runImmediately(() => {
                    if (result.code === 0) {
                        resolve();
                    } else {
                        reject(result.errorMessage);
                    }
                });
            });
        });
    }

    broadcastSync(arg1, arg2) {
        const spec = this.createBroadcastRequest(arg1, arg2);
        const result = this._nativeZone.broadcastSync(spec);
        if (result.code !== 0) {
            throw new Error(result.errorMessage);
        }
    }

    execute(arg1, arg2, arg3, arg4) {
        const spec = this.createExecuteRequest(arg1, arg2, arg3, arg4);
        
        return new Promise((resolve, reject) => {
            this._nativeZone.execute(spec, (result) => {
                runImmediately(() => {
                    if (result.code === 0) {
                        resolve(new Result(
                            result.returnValue,
                            transport.createTransportContext(true, result.contextHandle)));
                    } else {
                        reject(result.errorMessage);
                    }
                });
            });
        });
    }

    createBroadcastRequest(arg1, arg2) {
        if (is.function(arg1)) {
            // broadcast with function
            if (is.nil(arg1.origin)) {
                // We get caller stack at index 2.
                // <caller> -> broadcast -> createBroadcastRequest
                //   2           1               0
                arg1.origin = v8.currentStack(3)[2].getFileName();
            }
            return {
                module: "__function",
                function: transport.saveFunction(arg1),
                arguments: (is.nil(arg2)
                    ? []
                    : arg2.map((arg) => transport.marshall(arg, null))),
                options: zone.DEFAULT_CALL_OPTIONS,
                transportContext: null
            };
        } 
        // broadcast with source
        return {
            module: "",
            function: "eval",
            arguments: [JSON.stringify(arg1)],
            options: zone.DEFAULT_CALL_OPTIONS,
            transportContext: null
        };
        
    }

    createExecuteRequest(arg1, arg2, arg3, arg4) {
        let moduleName = null;
        let functionName = null;
        let args = null;
        let options = undefined;

        if (is.function(arg1)) {
            moduleName = "__function";
            if (is.nil(arg1.origin)) {
                // We get caller stack at index 2.
                // <caller> -> execute -> createExecuteRequest
                //   2           1               0
                arg1.origin = v8.currentStack(3)[2].getFileName();
            }

            functionName = transport.saveFunction(arg1);
            args = arg2;
            options = arg3;
        } else {
            moduleName = arg1;
            // If module name is relative path, try to deduce from call site.
            if (!is.nil(moduleName) 
                && moduleName.length !== 0 
                && !path.isAbsolute(moduleName)) {

                moduleName = path.resolve(
                    path.dirname(v8.currentStack(3)[2].getFileName()), 
                    moduleName);
            }
            functionName = arg2;
            args = arg3;
            options = arg4;
        }

        if (is.nil(args)) {
            args = [];
        }

        // Create a non-owning transport context which will be passed to execute call.
        const transportContext = transport.createTransportContext(false);
        return {
            module: moduleName,
            function: functionName,
            arguments: args.map((arg) => transport.marshall(arg, transportContext)),
            options: !is.nil(options) ? options : zone.DEFAULT_CALL_OPTIONS,
            transportContext
        };
    }
}
