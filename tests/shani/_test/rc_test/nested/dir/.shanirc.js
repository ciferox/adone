export default (ctx) => {
    ctx.before("second before", function () {});

    ctx.beforeEach("second beforeEach", function () {});

    ctx.afterEach("second afterEach", function () {});

    ctx.after("second after", function () {});
};