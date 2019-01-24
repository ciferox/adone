const binding = require("../binding");
import { log } from "../log";


// /// <summary> 
// ///     Describes the available platform settings.
// /// </summary>
// export interface PlatformSettings {

//     /// <summary> The logging provider to use when outputting logs. </summary>
//     loggingProvider?: string;

//     /// <summary> The metric provider to use when creating/setting metric values. </summary>
//     metricProvider?: string;
// }

/// <summary> Initialization of napa is only needed if we run in node. </summary>
let _initializationNeeded = (typeof __in_napa === "undefined");

/// <summary> Empty platform settings. </summary>
let _platformSettings = {};

export const initialize = function () {
    if (_initializationNeeded) {
        // Guard initialization, should only be called once.
        binding.initialize(_platformSettings);
        _initializationNeeded = false;
    }
};

/// <summary> Sets the platform settings. Must be called from node before the first container is created. </summary>
export const setPlatformSettings = function (settings) {
    if (!_initializationNeeded) {
        // If we don't need to initialize we can't set platform settings.
        log.err("Cannot set platform settings after napa was already initialized");
        return;
    }

    _platformSettings = settings;
    initialize();
};
