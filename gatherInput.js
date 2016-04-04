var Promise = require("es6-promise").Promise;
var chalk = require("chalk");
var prompt = require("prompt");

function selectServer (serverNames) {
	return new Promise(function (resolve, reject) {
		// Show server names
		console.log("Servers available:");
		serverNames.forEach(function (serverName, index) { console.log(chalk.bold(index), "-", serverName); });

		var properties = { properties: { server: {
			required: true,
			default: 0,
			description: "Select target server index",
			type: "number",
			enum: serverNames.map(function (item, index) { return index; })
		}}};

		prompt.start();
		prompt.get(properties, function (error, result) {
			if (error) reject(error);
			else resolve(serverNames[result.server]);
		});
	});
}

function askServerSSHCredentials (serverName) {
	return new Promise(function (resolve, reject) {
		console.log("Please provide SSH credentials for server "+ serverName);

		var properties = {properties: {username: {}, password: {hidden: true}}};

		prompt.start();
		prompt.get(properties, function (error, result) {
			if (error) reject(error);
			else resolve({
				serverName: serverName,
				username: result.username,
				password: result.password
			});
		});
	});
}

module.exports = function (serverNames) {
	return function () {
		return new Promise(function (resolve, reject) {
			selectServer(serverNames).then(askServerSSHCredentials).then(function (input) {
				resolve(input);
			}).catch(function (error) {
				reject(error);
			});
		});
	};
};
