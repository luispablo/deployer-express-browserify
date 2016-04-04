var Promise = require("es6-promise").Promise;
var ProgressBar = require("progress");
var allFilesInTree = require("all-files-in-tree");

function mkDir (sftp, dir) {
	return new Promise(function (resolve, reject) {
		var correctedDir = (dir.lastIndexOf("/") === dir.length - 1) ? dir.substring(0, dir.length - 1) : dir;

		sftp.stat(correctedDir, function (error) {
			if (error) {
				if (error.code === 2) {
					var parentPath = correctedDir.substring(0, correctedDir.lastIndexOf("/"));

					mkDir(sftp, parentPath).then(function () {
						console.log("Creating new directory", correctedDir);
						sftp.mkdir(correctedDir, function (error) {
							if (error && error.code === 4) resolve();
							else if (error) reject(error);
							else resolve();
						});
					});
				} else {
					reject(error);
				}
			} else {
				resolve();
			}
		});
	});
}

function put (sftp, localFile, remoteFile) {
	return new Promise(function (resolve, reject) {
		sftp.fastPut(localFile, remoteFile, function (error) {
			if (error) reject(error);
			else resolve();
		});
	});
}

function uploadFile (sftp, file, localDirectory, remoteDirectory) {
	return new Promise(function (resolve) {
		var localFile = localDirectory +"/"+ file;
		var remoteFile = remoteDirectory +"/"+ file;
		var directory = remoteFile.substring(0, remoteFile.lastIndexOf("/"));

		mkDir(sftp, directory).then(function () {
			put(sftp, localFile, remoteFile).then(function () { resolve(); });
		});
	});
}

module.exports = function (sshConnection, files, localDir, remoteDir) {
	return function () {
		return new Promise(function (resolve, reject) {
			var filesToUpload = files.map(function (file) {
				return allFilesInTree.sync(file);
			}).reduce(function (previousArray, currentArray) {
				return previousArray.concat(currentArray);
			}, []);

			sshConnection.sftp(function(error, sftp) {
				if (error) {
					reject(error);
				} else {
					var uploadedQuantity = 0;
					var bar = new ProgressBar("Uploading files [:bar]", {width: 20, total: filesToUpload.length});
					bar.tick();

					filesToUpload.forEach(function (file) {
						uploadFile(sftp, file, localDir, remoteDir).then(function () {
							bar.tick();
							if (++uploadedQuantity === filesToUpload.length) resolve();
						});
					});
				}
			});
		});
	};
};
