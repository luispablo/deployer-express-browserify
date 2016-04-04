var Promise = require("es6-promise").Promise;
var fs = require("fs");
var babelify = require("babelify");
var browserify = require("browserify");
var versionify = require("browserify-versionify");
var chalk = require("chalk");

module.exports = function (entryFileName, outputFileName) {
	return new Promise(function (resolve) {
		if (entryFileName && outputFileName) {
			var writeStream = fs.createWriteStream(outputFileName);
			var babel = babelify.configure({presets: ["react", "es2015"]});

			console.log("Building JS client file...");
			browserify(entryFileName, {debug: false})
				.transform([babel, versionify])
				.bundle()
				.on("error", function (error) { console.log(chalk.red(error)); })
				.pipe(writeStream);

			writeStream.on("finish", function () {
				console.log(chalk.bold("Done!"));
				resolve();
			});
		} else {
			console.log(chalk.yellow("No entryFile and/or outputFile set. If you want to transpile, set them."));
		}
	});
};
