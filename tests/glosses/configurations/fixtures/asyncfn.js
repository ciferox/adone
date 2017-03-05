"use strict";

export default {
    val: 777,
    afn: async function(adone) {
        await adone.promise.delay(10);
        return this.val;
    }
};