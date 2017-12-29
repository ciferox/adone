export default (ctx) => {
    ctx.before("first before", function () {});

    ctx.beforeEach("first beforeEach", function () {});

    ctx.afterEach("first afterEach", function () {});

    ctx.after("first after", function () {});
};
