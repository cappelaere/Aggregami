var express = require('express')

app.configure('development', function() {
	console.log("configure development");
  	app.use(express.logger('dev'));
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


app_port=7464;