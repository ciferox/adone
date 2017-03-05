import nock from "../../../helpers/nock";
import Dummy from "../../../helpers/spy";

const { request } = adone.net;

describe.skip("progress events", function () {
    it("should add a download progress handler", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "{\"foo\": \"bar\"}");

        var progressSpy = new Dummy();

        request("http://example.org/foo", { onDownloadProgress: progressSpy.callback }).then((response) => {
            console.log(response);
            expect(progressSpy.calls).to.be.at.least(1);
            done();
        });
    });

    it("should add a download progress handler from instance config", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "{\"foo\": \"bar\"}");

        var progressSpy = new Dummy();

        var instance = request.create({
            onDownloadProgress: progressSpy,
        });

        instance.get("http://example.org/foo").then(() => {
            expect(progressSpy.calls).to.be.at.least(1);
            done();
        });
    });

    it.skip("should add a upload progress handler from instance config", function (done) {
        var progressSpy = new Dummy();

        var instance = request.create({
            onUploadProgress: progressSpy,
        });

        instance.get("http://example.org/foo");

        getAjaxRequest().then(function (request) {
            // expect(progressSpy).toHaveBeenCalled();
            done();
        });
    });

    it.skip("should add upload and download progress handlers from instance config", function (done) {
        var downloadProgressSpy = jasmine.createSpy("downloadProgress");
        var uploadProgressSpy = jasmine.createSpy("uploadProgress");

        var instance = request.create({
            onDownloadProgress: downloadProgressSpy,
            onUploadProgress: uploadProgressSpy,
        });

        instance.get("http://example.org/foo");

        getAjaxRequest().then(function (request) {
            // expect(uploadProgressSpy).toHaveBeenCalled();
            expect(downloadProgressSpy).not.toHaveBeenCalled();
            request.respondWith({
                status: 200,
                responseText: "{\"foo\": \"bar\"}"
            });
            expect(downloadProgressSpy).toHaveBeenCalled();
            done();
        });
    });
});