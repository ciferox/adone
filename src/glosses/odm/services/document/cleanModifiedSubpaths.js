module.exports = function cleanModifiedSubpaths(doc, path) {
    const _modifiedPaths = Object.keys(doc.$__.activePaths.states.modify);
    const _numModifiedPaths = _modifiedPaths.length;
    let deleted = 0;
    for (let j = 0; j < _numModifiedPaths; ++j) {
        if (_modifiedPaths[j].indexOf(`${path}.`) === 0) {
            delete doc.$__.activePaths.states.modify[_modifiedPaths[j]];
            ++deleted;
        }
    }
    return deleted;
};
