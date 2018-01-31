const {
    fake
} = adone;

describe("date.js", () => {
    describe("past()", () => {
        it("returns a date N years into the past", () => {
            const date = fake.date.past(75);
            assert.ok(date < new Date());
        });

        it("returns a past date when N = 0", () => {

            const refDate = new Date();
            const date = fake.date.past(0, refDate.toJSON());

            assert.ok(date < refDate); // date should be before the date given
        });

        it("returns a date N years before the date given", () => {

            const refDate = new Date(2120, 11, 9, 10, 0, 0, 0); // set the date beyond the usual calculation (to make sure this is working correctly)

            const date = fake.date.past(75, refDate.toJSON());

            assert.ok(date < refDate && date > new Date()); // date should be before date given but after the current time
        });

    });

    describe("future()", () => {
        it("returns a date N years into the future", () => {

            const date = fake.date.future(75);

            assert.ok(date > new Date());
        });

        it("returns a future date when N = 0", () => {

            const refDate = new Date();
            const date = fake.date.future(0, refDate.toJSON());

            assert.ok(date > refDate); // date should be after the date given
        });

        it("returns a date N years after the date given", () => {

            const refDate = new Date(1880, 11, 9, 10, 0, 0, 0); // set the date beyond the usual calculation (to make sure this is working correctly)

            const date = fake.date.future(75, refDate.toJSON());

            assert.ok(date > refDate && date < new Date()); // date should be after the date given, but before the current time
        });
    });

    describe("recent()", () => {
        it("returns a date N days from the recent past", () => {

            const date = fake.date.recent(30);

            assert.ok(date <= new Date());
        });

    });

    describe("soon()", () => {
        it("returns a date N days into the future", () => {

            const date = fake.date.soon(30);

            assert.ok(date >= new Date());
        });

    });

    describe("between()", () => {
        it("returns a random date between the dates given", () => {

            const from = new Date(1990, 5, 7, 9, 11, 0, 0);
            const to = new Date(2000, 6, 8, 10, 12, 0, 0);

            const date = fake.date.between(from, to);

            assert.ok(date > from && date < to);
        });
    });

    describe("month()", () => {
        it("returns random value from date.month.wide array by default", () => {
            const month = fake.date.month();
            assert.ok(fake.definitions.date.month.wide.indexOf(month) !== -1);
        });

        it("returns random value from date.month.wide_context array for context option", () => {
            const month = fake.date.month({ context: true });
            assert.ok(fake.definitions.date.month.wide_context.indexOf(month) !== -1);
        });

        it("returns random value from date.month.abbr array for abbr option", () => {
            const month = fake.date.month({ abbr: true });
            assert.ok(fake.definitions.date.month.abbr.indexOf(month) !== -1);
        });

        it("returns random value from date.month.abbr_context array for abbr and context option", () => {
            const month = fake.date.month({ abbr: true, context: true });
            assert.ok(fake.definitions.date.month.abbr_context.indexOf(month) !== -1);
        });

        it("returns random value from date.month.wide array for context option when date.month.wide_context array is missing", () => {
            const backup_wide_context = fake.definitions.date.month.wide_context;
            fake.definitions.date.month.wide_context = undefined;

            const month = fake.date.month({ context: true });
            assert.ok(fake.definitions.date.month.wide.indexOf(month) !== -1);

            fake.definitions.date.month.wide_context = backup_wide_context;
        });

        it("returns random value from date.month.abbr array for abbr and context option when date.month.abbr_context array is missing", () => {
            const backup_abbr_context = fake.definitions.date.month.abbr_context;
            fake.definitions.date.month.abbr_context = undefined;

            const month = fake.date.month({ abbr: true, context: true });
            assert.ok(fake.definitions.date.month.abbr.indexOf(month) !== -1);

            fake.definitions.date.month.abbr_context = backup_abbr_context;
        });
    });

    describe("weekday()", () => {
        it("returns random value from date.weekday.wide array by default", () => {
            const weekday = fake.date.weekday();
            assert.ok(fake.definitions.date.weekday.wide.indexOf(weekday) !== -1);
        });

        it("returns random value from date.weekday.wide_context array for context option", () => {
            const weekday = fake.date.weekday({ context: true });
            assert.ok(fake.definitions.date.weekday.wide_context.indexOf(weekday) !== -1);
        });

        it("returns random value from date.weekday.abbr array for abbr option", () => {
            const weekday = fake.date.weekday({ abbr: true });
            assert.ok(fake.definitions.date.weekday.abbr.indexOf(weekday) !== -1);
        });

        it("returns random value from date.weekday.abbr_context array for abbr and context option", () => {
            const weekday = fake.date.weekday({ abbr: true, context: true });
            assert.ok(fake.definitions.date.weekday.abbr_context.indexOf(weekday) !== -1);
        });

        it("returns random value from date.weekday.wide array for context option when date.weekday.wide_context array is missing", () => {
            const backup_wide_context = fake.definitions.date.weekday.wide_context;
            fake.definitions.date.weekday.wide_context = undefined;

            const weekday = fake.date.weekday({ context: true });
            assert.ok(fake.definitions.date.weekday.wide.indexOf(weekday) !== -1);

            fake.definitions.date.weekday.wide_context = backup_wide_context;
        });

        it("returns random value from date.weekday.abbr array for abbr and context option when date.weekday.abbr_context array is missing", () => {
            const backup_abbr_context = fake.definitions.date.weekday.abbr_context;
            fake.definitions.date.weekday.abbr_context = undefined;

            const weekday = fake.date.weekday({ abbr: true, context: true });
            assert.ok(fake.definitions.date.weekday.abbr.indexOf(weekday) !== -1);

            fake.definitions.date.weekday.abbr_context = backup_abbr_context;
        });
    });

});
