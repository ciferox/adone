
module.exports = {
    buildPreset: function () {
        return {
            plugins: [
                adone.js.compiler.plugin.syntax.decorators,
            ]
        };
    }
};
