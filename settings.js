var express 		= require('express'),
	assert			= require('assert'),
	fs				= require('fs'),
	path			= require('path'),
	redis 			= require("redis/index"),
	RedisStore 		= require('connect-redis')(express),
	engines			= require('consolidate'),
	handlebars		= require('handlebars'),
	stylus 			= require('stylus'),
	ejs				= require('ejs'),
	SendGrid		= require('sendgrid').SendGrid,
	nib 			= require('nib');
	
	exports.boot = function(app){
	   bootApplication(app)
	}

	// The port that this express app will listen on
	console.log("app_port:"+app_port)
	
	var port 			= process.env.PORT || app_port;

	// Your client ID and secret from http://dev.singly.com/apps
	var clientId 		= process.env.SINGLY_CLIENT_ID;
	var clientSecret 	= process.env.SINGLY_CLIENT_SECRET;

	//var hostBaseUrl 	= (process.env.HOST || 'http://localhost:' + port);
	var hostBaseUrl 	= 'http://localhost:' + port;
	var apiBaseUrl 		= process.env.SINGLY_API_HOST || 'https://api.singly.com';
	var redisURL 		= process.env.REDISTOGO_URL;

	var sengrid_user	= process.env.SENDGRID_USER;
	var sengrid_key		= process.env.SENDGRID_KEY;

	console.log('clientId:'+clientId)
	console.log('clientSecret:'+clientSecret)
	console.log('hostBaseUrl:'+hostBaseUrl)
	console.log('apiBaseUrl:'+apiBaseUrl)
	console.log('port:'+port)

	assert(clientId, 	"set SINGLY_CLIENT_ID in your ENV")
	assert(clientSecret, "set SINGLY_CLIENT_SECRET in your ENV")

	assert(sengrid_user, "set SENDGRID_USER in your ENV")
	assert(sengrid_key, "set SENDGRID_KEY in your ENV")
	
	// Pick a secret to secure your session storage
	var sessionSecret = 'Aggrefit-PGC-2012-02';
	
	// connect to SendGrid
	app.sendgrid = new SendGrid(sengrid_user, sengrid_key);

// =========================================
// settings

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib());
}
	
// ===========================
// App settings and middleware
function bootApplication(app) {
	app.use(stylus.middleware({
	    src: __dirname
	  , compile: compile
	}));

	// load config
	app.config = JSON.parse(fs.readFileSync("./config/config.yaml"));
	
	app.set('clientId', clientId)
	app.set('clientSecret', clientSecret)
	
	
	if( app.settings.env == 'production') {
		app.set('hostBaseUrl', config.hostBaseUrl)
	} else {
		app.set('hostBaseUrl', hostBaseUrl)		
	}
	
	app.set('apiBaseUrl', apiBaseUrl)
	app.set('port', port)
	
	// Require and initialize the singly module
	expressSingly = require('express-singly')(app, app.get('clientId'), app.get('clientSecret'),
	  app.get('hostBaseUrl'), app.get('hostBaseUrl') + '/callback');

	app.configure(function() {
		expressSingly.configuration();
	})

	
	// define a custom res.message() method
	// which stores messages in the session
	app.response.message = function(msg){
	  // reference `req.session` via the `this.req` reference
	  var sess = this.req.session;
	  // simply add the msg to an array for later
	  sess.messages = sess.messages || [];
	  sess.messages.push(msg);
	  return this;
	};
	
	// serve static files
	app.use(express.static(__dirname + '/public'));

	app.set('views', __dirname + '/app/views')
	app.set('helpers', __dirname + '/app/helpers/')
	
	app.set('client_side_layout', __dirname + '/app/views/clientside_layout.ejs')

	//@TODO use some caching and compiled templates
	engines.hdb = function(filename, options, fn) {	
		console.log("engines.hdb:"+filename)	
		try {
	 		fs.readFile( filename, "utf-8", function(err, template) {
				if( err ) throw err

				// load helpers
				var arr = filename.split('/')
				var controller = arr[arr.length-2]
				var helper_name = app.get('helpers')+controller+".js"
				if( fs.existsSync( helper_name )) {
					options.helper		= fs.readFileSync(helper_name, "utf-8")
				} else {
					console.log("Could not find:"+helper_name)
					options.helper		= ""
				}
				
				options.template 	= template
				
				// load layout
				var layout 			= app.get('views')+'/'+options.layout+".ejs"
				if( fs.existsSync(layout)) {
			 		fs.readFile( layout, "utf-8", function(err, estr) {
						if( err ) throw err
						var str = ejs.render( estr, options);
						fn(null, str)
					})
				} else {
					fn(null, "")
				}
			})	
		} catch(err) {
			fn(err)
		}
	}
	
	app.engine('html', engines.ejs);
	app.engine('hdb',  engines.hdb);
	app.engine('jade', engines.jade)

	
	// set default view engine
	//app.set('view engine', 'jade')
	app.set('view engine', 'html')
	//app.set('view options', { layout: false })

	// cookieParser should be above session
	app.use(express.cookieParser())

	// bodyParser should be above methodOverride
	app.use(express.bodyParser())
	app.use(express.methodOverride())

	// Configure the database
	// Needs this to store sessions across servers
	
	if( app.settings.env == 'production') {
		// jitsu databases create redis rip2
		// jitsu databases list and update config.yaml
		// var conn_url = 'redis://nodejitsu:ff6691395536b4d5636a81627530830d@drum.redistogo.com:9774/';
		var redisUrl 	= url.parse(process.env.REDISTOGO_URL),
		    redisAuth 	= redisUrl.auth.split(':');

		console.log(redisURL)

		app.set('redisHost', 	redisUrl.hostname);
		app.set('redisPort', 	redisUrl.port);
		app.set('redisDb', 		redisAuth[0]);
		app.set('redisPass', 	redisAuth[1]); 

		app.db				    = redis.createClient(redisUrl.port, redisUrl.hostname);
		app.db.auth(redisAuth[1]);
		app.db.debugMode 	= true; 
		app.db.on("error", function (err) {
		    console.log("Production Redis Database Error " + err);
		});
			
		app.use(express.session({
		  secret: sessionSecret,
		  cookie: { maxAge: new Date(Date.now() + 360000)}, //1 Hour
		  store: new RedisStore({
		        host: app.get('redisHost'),
		        port: app.get('redisPort'),
		        db: app.get('redisDb'),
		        pass: app.get('redisPass')
		    })
		}))

	} else {
		console.log("* Connecting to localhost redis...");
		app.db			 = redis.createClient();
		app.db.on("error", function (err) {
		    console.log("Local Redis Database Error " + err);
		});
		app.use(express.session({
		  secret: sessionSecret,
		  cookie: { maxAge: new Date(Date.now() + 360000)}, //1 Hour
		  store: new RedisStore()
		}))
	}

	app.use(express.favicon())
	
	// routes should be at the last
	app.use(app.router)
	expressSingly.routes();
	
	// expose the "messages" local variable when views are rendered
	app.use(function(req, res, next){
	  var msgs = req.session.messages || [];

	  // expose "messages" local variable
	  res.locals.messages = msgs;

	  // expose "hasMessages"
	  res.locals.hasMessages = !! msgs.length;

	  /* This is equivalent:
	   res.locals({
	     messages: msgs,
	     hasMessages: !! msgs.length
	   });
	  */

	  // empty or "flush" the messages so they
	  // don't build up
	  req.session.messages = [];
	  next();
	});
	
	// Error Handling
	app.use(function(err, req, res, next){
	  // treat as 404
	  if (~err.message.indexOf('not found')) return next()

	  // log it
	  console.error(err.stack)

	  // error page
	  res.status(500).render('500')
	})

	// assume 404 since no middleware responded
	app.use(function(req, res, next){
	  res.status(404).render('404', { url: req.originalUrl })
	})
}
 