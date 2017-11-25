const { x } = adone.orm;

describe("errors", () => {
    it("should maintain stack trace with message", () => {
        const errorsWithMessage = [
            "ValidationError", "UnknownConstraintError", "InstanceError",
            "EmptyResultError", "EagerLoadingError", "AssociationError", "QueryError"
        ];

        errorsWithMessage.forEach((errorName) => {
            const throwError = () => {
                throw new x[errorName]("this is a message");
            };
            let err;
            try {
                throwError();
            } catch (error) {
                err = error;
            }
            expect(err).to.exist;
            const stackParts = err.stack.split("\n");
            expect(stackParts[0]).to.equal(`${errorName}: this is a message`);
            expect(stackParts[1]).to.match(/^ {4}at throwError \(.*errors.test.js:\d+:\d+\)$/);
        });
    });

    it("should maintain stack trace without message", () => {
        const errorsWithoutMessage = [
            "ConnectionError", "ConnectionRefusedError", "ConnectionTimedOutError",
            "AccessDeniedError", "HostNotFoundError", "HostNotReachableError", "InvalidConnectionError"
        ];

        errorsWithoutMessage.forEach((errorName) => {
            const throwError = () => {
                throw new x[errorName](null);
            };
            let err;
            try {
                throwError();
            } catch (error) {
                err = error;
            }
            expect(err).to.exist;
            const stackParts = err.stack.split("\n");

            expect(stackParts[0]).to.equal(errorName);
            expect(stackParts[1]).to.match(/^ {4}at throwError \(.*errors.test.js:\d+:\d+\)$/);
        });
    });
});
