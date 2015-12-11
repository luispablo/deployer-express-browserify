#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var chalk = require('chalk');
var prompt = require('prompt');
var q = require('q');
var browserify = require('browserify');
var babelify = require("babelify");
var versionify = require("browserify-versionify");
var ProgressBar = require('progress');
var Client = require('ssh2').Client;

var NPM_CONF_FILENAME = "package.json";
var DEPLOY_CONF_FILENAME = "deployer.json";

program.parse(process.argv);

try {
	// Check in a NPM project
	fs.statSync(NPM_CONF_FILENAME);
} catch (e) {
	if (e.code === 'ENOENT') {
		console.log(chalk.red.bold("No "+ NPM_CONF_FILENAME +" file found. Are you in a NPM project?"));
		process.exit(1);
	}
}

try {
	// First check if config file exists
	fs.statSync(DEPLOY_CONF_FILENAME);
	doDeploy();
} catch (e) {
	if (e.code === 'ENOENT') buildConfigFile(doDeploy);
}

function splitAndTrim (value) {
	return value.split(",").map(function (string) { 
		return string.trim(); 
	}); 
}

function buildConfigFile (callback) {
	var schema = {
		properties: {
			servers: {
				description: 'Comma-separated list of possible servers to deploy to', 
				type: 'string', 
				required: true, 
				before: splitAndTrim
			},
			appDirInServer: {
				description: "Directory of the application in the server",
				type: "string",
				required: true
			},
			serviceName: {
				description: "Service name (in the server) to start/stop/restart the application",
				type: "string",
				required: true
			},
			entryFile: {
				description: "The entry point file to build the JS bundle",
				type: "string",
				required: true
			},
			outputFile: {
				description: "The bundle JS file that will be generated for the browser with browserify",
				type: "string",
				required: true
			},
			filesToUpload: {
				description: "Comma-separated list of directories to upload when deploying",
				type: "string",
				required: true,
				before: splitAndTrim
			}
		}
	};

	prompt.get(schema, function (err, result) {
		var stringContent = JSON.stringify(result, null, '\t');
		fs.writeFileSync(DEPLOY_CONF_FILENAME, stringContent);
		console.log("Built config file for you ("+ DEPLOY_CONF_FILENAME +")", chalk.bold.cyan(stringContent));
		callback();
	});
}

function doDeploy () {
	var pkg = JSON.parse(fs.readFileSync(NPM_CONF_FILENAME, 'utf8'));
	var config = JSON.parse(fs.readFileSync(DEPLOY_CONF_FILENAME, 'utf8'));
	var data = {pkg: pkg, config: config};

	transpile(data)
		.then(askVersion)
		.then(selectTarget)
		.then(uploadFiles)
		.then(installModulesRestart)
		.fail(function (error) {
			console.log(chalk.bold('Error deploying'), chalk.red(error));
		})
		.done();
}

function selectTarget (data) {
	var deferred = q.defer();

	data.config.servers.forEach(function (serverName, index) {
		console.log(chalk.bold(index), serverName);
	});
	prompt.start();
	prompt.get({properties: {
						server: {
							required: true, 
							default: 0, 
							description: 'Select server to deploy to',
							type: 'number', 
							enum: [0, 1]
						}
					}}, function (err, result) {
		data.selectedServer = result.server;
		deferred.resolve(data);
	});

	return deferred.promise;
}

function askVersion (data) {
	var deferred = q.defer();

	prompt.start();
	prompt.get({properties: {version: {
								required: true, 
								default: data.pkg.version, 
								description: 'Version to deploy', 
								type: 'string'
							}}}, function (err, result) {

		if (result.version !== data.pkg.version) {
			data.pkg.version = result.version;
			fs.writeFileSync(NPM_CONF_FILENAME, JSON.stringify(data.pkg, null, '\t'));
		}
		var serverName = data.config.servers[data.selectedServer];
		deferred.resolve(data);
	});

	return deferred.promise;
}

function transpile (data) {
	var deferred = q.defer();
	var writeStream = fs.createWriteStream(data.config.outputFile);
	var babel = babelify.configure({presets: ["react", "es2015"]});

	console.log("Building JS client file...");
	browserify(data.config.entryFile, {debug: false})
		.transform([babel, versionify])
		.bundle()
		.on("error", function (err) { console.log(chalk.red(err)); })
		.pipe(writeStream);

	writeStream.on('finish', function () { 
		console.log(chalk.bold('Done!'));
		deferred.resolve(data) 
	});

	return deferred.promise;
}

function uploadFiles (data) {
	var deferred = q.defer();
	var filesToUpload = getAllFilesInTree(data.config.filesToUpload);
	var serverName = data.config.servers[data.selectedServer];

	console.log('Please provide SSH credentials for server '+ serverName);
	prompt.start();
  	prompt.get({properties: {username: {}, password: {hidden: true}}}, function (err, result) {
		console.log('Connecting to '+ serverName);
		var conn = new Client();
		data.sshConnection = conn;

		conn.on('ready', function() {
			console.log('Done.');
			conn.sftp(function(err, sftp) {
				if (err) throw err;
				var uploadedFilesQuantity = 0;
				var barOpts = {width: 20, total: filesToUpload.length};
				var bar = new ProgressBar('Uploading files [:bar]', barOpts);
				bar.tick();

				filesToUpload.forEach(function (file) { 
					var localFile = process.cwd() +"/"+ file;
					var remoteFile = data.config.appDirInServer +"/"+ file;

					sftp.fastPut(localFile, remoteFile, function (err) {
						if (err) console.log(chalk.blue(file), chalk.red(err));
						bar.tick();
						if (++uploadedFilesQuantity === filesToUpload.length) deferred.resolve(data);
					});
				});
			});
		}).connect({
			host: serverName,
			port: 22,
			username: result.username,
			password: result.password
		});
  	});

  	return deferred.promise;
}

function promiseCommand (cmd) {
	return function (data) {
		var deferred = q.defer();
		
		console.log("Executing command", chalk.blue(cmd));
		data.sshConnection.exec(cmd, function (err, stream) {
			if (err) throw err;

			stream.on("close", function (code, signal) {			
				console.log(chalk.bold("Done!"));
				deferred.resolve(data);
			}).on("data", function (data) {
				console.log(chalk.green(data));
			}).stderr.on("data", function (data) {
				console.log(chalk.red.bold(data));
			});
		});

		return deferred.promise;
	};
}

function installModulesRestart (data) {
	var deferred = q.defer();
	var npmInstallCommand = "cd "+ data.config.appDirInServer +" && npm install --production";
	var restartServiceCommand = "initctl restart "+ data.config.serviceName;

	promiseCommand(npmInstallCommand)(data)
		.then(promiseCommand(restartServiceCommand))
		.then(function (data) {
			data.sshConnection.end();
		});

	return deferred.promise;
}

function getAllFilesInTree (pathItems) {
	var files = [];

	for (var i = 0; i < pathItems.length; i++) {
		var pathItem = pathItems[i];

		if (fs.statSync(pathItem).isDirectory()) {
			var dirPathItems = fs.readdirSync(pathItem).map(function (dirPathItem) { 
				return pathItem +"/"+ dirPathItem; 
			});
			files = files.concat(getAllFilesInTree(dirPathItems));
		} else {
			files.push(pathItem);
		}
	}

	return files;
}