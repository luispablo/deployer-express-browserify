# Express + Browserify deployer

*(yeah, I know, an awfull name)*

Small script to:
* Transpile your client JS code (with JSX by default)
* Handle version number (taken from `package.json`)
* Select target server to deploy to
* Upload files via SSH
* Install NPM dependencies in target server
* Restart service hosting the deployed service

## Installation
```
npm install -g deployer-express-browserify
```

**Pay special attention to:**

> If you are working with NVM, you may have some problems with global NPM modules (as I had)  
> To fix it you should set the environment variable NODE_PATH to the exact location where your node modules are being installed to.  
> Mine was in /home/&lt;me&gt;/.nvm/versions/node/v0.12.7/lib/node_modules

## Usage
Sitting in your app dir, having there the code you want to deploy type:
```
deploy
```
That easy? YES, that's the idea.

### Configuration
Well, actually it's not so so simple, first you need to have some configuration in place.  
The script will look for the file `deploy.json`, in your app root directory (usually, there you have the `package.json` file. If such file is not present, the script will ask you for the values it was expecting to find there, and afterwards will write the `deploy.json` file for you.   
The `deploy.json` file should look something like:
```json
{
	"servers": ["svrname1", "svrname2"],
	"appDirInServer": "/opt/yourawesomeapp",
	"serviceName": "yourawesomeapp_service",
	"entryFile": "./app/browserapp.js",
	"outputFile": "./public/js/bundle.js",
	"filesToUpload": [
		"app/routes", 
		"app/models",
		"public", 
		"config.js", 
		"package.json", 
		"server.js"
	]
}
```
OK, what are we looking at here? Lets see:
* **servers**: this is an array containing the names of the servers you may deploy to (ie: staging and production servers)
* **appDirInServer**: this is the directory where your app will be located in the previously defined servers (by now it must be the same in all the servers defined)
* **serviceName**: currently we support the `systemd` linux service, so with the name defined here the script will try to run `initctl <serviceName> restart` in the last step of the deploy process.
* **entryFile**: the root file of your client JS app (this was built with React, ES2015 and browserify in mind)
* **outputFile**: the browserify output file.
* **fileToUpload**: which files and folders, of the directory you're standing at, you want to upload to the defined servers.

## Contributing
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D


## Credits

[@luispablo](https://twitter.com/luispablo)
