const priorities = {};

export function addUnitPriority(unit, priority) {
    priorities[unit] = priority;
}

export function getPrioritizedUnits(unitsObj) {
    const units = [];
    for (const u in unitsObj) {
        units.push({ unit: u, priority: priorities[u] });
    }
    units.sort((a, b) => {
        return a.priority - b.priority;
    });
    return units;
}
