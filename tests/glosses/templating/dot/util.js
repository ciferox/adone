export const doT = adone.templating.dot;

export const test = (templates, data, result) => {
    templates.forEach((tmpl) => {
        const fn = doT.template(tmpl);
        assert.strictEqual(fn(data), result);
    });
};
