const binding = require("../binding");
// import { cid, TransportContext, TransportableObject } from "../transport";

// export interface Lock {
//     /// <summary>
//     /// Obtain the lock and input function synchronously.
//     /// or throws error if input function throws.
//     /// Lock will be released once execution finishes or an exception is thrown.
//     /// </summary>
//     /// <param name="func"> The input function to run. </summary>
//     /// <param name="params"> Optional. A list of parameters that passed to func. </summary>
//     /// <returns> The value that the input function returns. </returns>
//     /// <remarks> This function will obtain the lock before running the input function. It will wait until the
//     /// lock is available. If the input function throws exception, the exception will be thrown out. </remarks>
//     guardSync(func: (...params: any[]) => any, params?: any[]): any;
// }

export const createLock = function () {
    return binding.createLock();
};
