var fs = require("fs");
var Promise = require("es6-promise").Promise;
var prompt = require("prompt");
var trimedSplit = require("./trimedSplit")(",");

module.exports = function (configFileName) {
	return new Promise(function (resolve, reject) {
		var schema = {
			properties: {
				servers: {
					description: "Comma-separated list of possible servers to deploy to",
					type: "string",
					required: true,
					before: trimedSplit
				},
				appDirInServer: {
					description: "Directory of the application in the server",
					type: "string",
					required: true
				},
				restartCommand: {
					description: "The linux command to restart the deployed app",
					type: "string",
					required: true
				},
				entryFile: {
					description: "The entry point file to build the JS bundle",
					type: "string",
					required: false
				},
				outputFile: {
					description: "The bundle JS file that will be generated for the browser with browserify",
					type: "string",
					required: false
				},
				filesToUpload: {
					description: "Comma-separated list of directories to upload when deploying",
					type: "string",
					required: true,
					before: trimedSplit
				}
			}
		};

		prompt.get(schema, function (error, result) {
			if (error) {
				reject(error);
			} else {
				var stringContent = JSON.stringify(result, null, "\t");
				fs.writeFileSync(configFileName, stringContent);
				resolve(stringContent);
			}
		});
	});
};
