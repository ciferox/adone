// ForXStatement
for (var {a, ...b} of []) {}
for ({a, ...b} of []) {}

// skip
for ({a} in {}) {}
for ({a} of []) {}

for (a in {}) {}
for (a of []) {}
