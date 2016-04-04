#!/usr/bin/env node

var fs = require("fs");
var chalk = require("chalk");
var ssh2 = require("ssh2");
var transpile = require("./transpile");
var gatherInput = require("./gatherInput");
var checks = require("./checks");
var uploadFiles = require("./uploadFiles");
var promiseCommand = require("./promiseCommand");

var NPM_CONF_FILENAME = "package.json";
var DEPLOY_CONF_FILENAME = "deployer.json";

var config = JSON.parse(fs.readFileSync(DEPLOY_CONF_FILENAME, "utf8"));
var sshConnection = new ssh2.Client();

checks(NPM_CONF_FILENAME, DEPLOY_CONF_FILENAME)
	.then(gatherInput(config.servers))
	.then(function (input) {
		console.log("Connecting to server", input.serverName);
		sshConnection.on("ready", function () {
			console.log("SSH connection ready");
			transpile(config.entryFile, config.outputFile)
				.then(uploadFiles(sshConnection, config.filesToUpload, process.cwd(), config.appDirInServer))
				.then(promiseCommand(sshConnection, "cd "+ config.appDirInServer +" && npm install --production"))
				.then(promiseCommand(sshConnection, config.restartCommand))
				.then(function () {
					sshConnection.end();
					process.exit(0);
				}).catch(function (error) {
					sshConnection.end();
					console.log(chalk.red(error.stack));
					process.exit(1);
				});
		}).connect({
			host: input.serverName, port: 22,
			username: input.username, password: input.password
		});
	}).catch(function (error) {
		console.log(chalk.red(error.stack));
		process.exit(1);
	});
