

export default {
    val: 777,
    async afn(adone) {
        await adone.promise.delay(10);
        return this.val;
    }
};
