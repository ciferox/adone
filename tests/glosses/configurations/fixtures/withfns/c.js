export default {
	str: "value1",
	nowTm: new Date(),
	sub1: {
		func1() {
			return this.str;
		},
		sub2: {
			func1() {
				return this.nowTm;
			}
		}
	}
};
