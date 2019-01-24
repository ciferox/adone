import * as zone from "./zone/zone";
import * as impl from "./zone/zone-impl";

import * as platform from "./runtime/platform";

const binding = require("./binding");

// This variable is either defined by napa runtime, or not defined (hence node runtime)
// declare var __in_napa: boolean;

/// <summary> Creates a new zone. </summary>
/// <summary> A unique id to identify the zone. </summary>
/// <param name="settings"> The settings of the new zone. </param>
export const create = function (id, settings = zone.DEFAULT_SETTINGS) {
    platform.initialize();
    return new impl.ZoneImpl(binding.createZone(id, settings));
};

/// <summary> Returns the zone associated with the provided id. </summary>
export const get = function (id) {
    platform.initialize();
    return new impl.ZoneImpl(binding.getZone(id));
};

/// TODO: add function getOrCreate(id, settings): Zone.

/// <summary> Define a getter property 'current' to retrieve the current zone. </summary>
export let current;

Object.defineProperty(exports, "current", {
    get() {
        platform.initialize();
        return new impl.ZoneImpl(binding.getCurrentZone());
    }
});

/// <summary> Define a getter property 'node' to retrieve node zone. </summary>
export let node;
Object.defineProperty(exports, "node", {
    get() {
        platform.initialize();
        return new impl.ZoneImpl(binding.getZone("node"));
    }
});

export * from "./zone/zone";
