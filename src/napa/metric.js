const binding = require("./binding");

const MetricType = {};
MetricType[MetricType.Number = 0] = "Number";
MetricType[MetricType.Rate = 1] = "Rate";
MetricType[MetricType.Percentile = 2] = "Percentile";

// export interface Metric {
//     readonly section: string;
//     readonly name: string;

//     set(value: number, dimensions?: string[]): void;
//     increment(dimensions?: string[]): void;
//     decrement(dimensions?: string[]): void;
// }

/// <summary> A cache for metric wraps. </summary>
const _metricsCache = {};

export const get = function (section, name, type, dimensions = []) {
    const key = `${section ? section : ""}\\${name ? name : ""}`;

    // Check cache first
    const metric = _metricsCache[key];
    if (metric) {
        return metric;
    }

    // Add to cache
    const metricWrap = new binding.MetricWrap(section, name, type, dimensions);
    metricWrap.section = section;
    metricWrap.name = name;
    _metricsCache[key] = metricWrap;

    return metricWrap;
};
