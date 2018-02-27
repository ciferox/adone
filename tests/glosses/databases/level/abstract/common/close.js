export const close = function (leveldown, testCommon) {
    it("close()", async () => {
        const db = leveldown(testCommon.location());

        await db.open();
        await db.close();
    });
};
