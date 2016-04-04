var chalk = require("chalk");
var Promise = require("es6-promise").Promise;

module.exports = function (sshConnection, command) {
	return function () {
		return new Promise(function (resolve, reject) {
			console.log("Executing command", chalk.blue(command));
			sshConnection.exec(command, function (error, stream) {
				if (error) {
					reject(error);
				} else {
					stream.on("close", function () {
						console.log(chalk.bold("Done!"));
						resolve();
					}).on("data", function (data) {
						console.log(chalk.green(data));
					}).stderr.on("data", function (data) {
						console.log(chalk.red(data));
					});
				}
			});
		});
	};
};
