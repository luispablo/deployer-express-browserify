var Promise = require("es6-promise").Promise;
var fileExists = require("file-exists");
var chalk = require("chalk");
var buildConfigFile = require("./buildConfigFile");

module.exports = function (npmConfFileName, deployConfFileName) {
	return new Promise(function (resolve, reject) {
		if (!fileExists(npmConfFileName)) reject("No "+ npmConfFileName +" file found. Are you in a NPM project?");

		if (fileExists(deployConfFileName)) {
			resolve();
		} else {
			buildConfigFile(deployConfFileName).then(function (content) {
				console.log("Built config file for you ("+ deployConfFileName +")", chalk.bold.cyan(content));
				resolve();
			});
		}
	});
};
