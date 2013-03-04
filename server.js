/**
 * Module dependencies.
 */

var express 		= require('express'),
	path			= require('path'),
	util			= require('util'),
	fs				= require('fs'),
	moment			= require('moment'),	
  	
	
	home			= require('./app/controllers/home');
	login			= require('./app/controllers/login');
	svc				= require('./app/controllers/svc');
	teams			= require('./app/controllers/teams');
	players			= require('./app/controllers/players');
		
var app = module.exports = express();

global.app 			= app;
app.root 			= process.cwd();

// we need to configure environment
console.log(util.inspect(app.settings));

var mainEnv 	= app.root + '/config/environment'+'.js';
var supportEnv 	= app.root + '/config/environments/' + app.settings.env+'.js';
require(mainEnv)
require(supportEnv)

// load settings
require('./settings').boot(app)  



// load controllers
require('./lib/boot')(app, { verbose: !module.parent });


// =========================================
// ROUTING
//

// Access Control Function
function restrict(req, res, next) {
 	if( req.session && req.session.profiles && req.session.accessToken ) {
		next();
		return;
  	}
  	// Failed... login
	console.log('Sorry...restricted!')
	if( !req.session) console.log('Sorry...no session!')
	if( req.session && !req.session.profiles) console.log('Sorry...no profiles!')
	if( req.session && !req.session.accessToken) console.log('Sorry...no accessToken!')
	//console.log(req.session)
    res.format({
		html: function(req, res) {
			var redirect_to		= '/login?requested_url='+req.url;
			console.log("unauthorized! redirect to:"+redirect_to);
		    res.redirect(redirect_to, 302);
		},
		json: function() {
			var headers = {
				'Status': 			"Unauthorized",
				'WWW-Authenticate': "OAuth realm='/radarsat'"
			}
			res.send("Unauthorized", headers, 401);
		}
	})
}

// Home page -> app
app.get('/', 													home.index);
app.get('/profile', 											restrict, home.show_profile);
app.get('/set_profile', 										home.set_profile);
app.get('/get_self',	 										home.get_self);
app.get('/contact', 											home.contact);
app.get('/about', 												home.about);

app.get('/svc/add/:id', 										svc.add);
app.get('/svc/del/:id', 										svc.del);

app.get('/svc/FitBit', 											svc.FitBit);
app.get('/svc/FitBitAll/:id',									svc.FitBitAll);
app.get('/svc/FitBitAll', 										svc.FitBitAll);

app.get('/svc/Withings', 										svc.Withings);
app.get('/svc/WithingsAll/:id',									svc.WithingsAll);

app.get('/login', 												login.index);
app.get('/logout', 												login.logout);
app.get('/signup', 												login.index);

app.get('/teams/list',											restrict, teams.list);
app.get('/teams/create', 										restrict, teams.create);
app.post('/teams/invite',										restrict, teams.invite);
app.get('/teams/:id',											restrict, teams.show);

app.get('/teams/join/:id',										restrict, teams.join);
app.get('/teams/edit/:id',										restrict, teams.edit);
app.post('/teams/update/:id',									restrict, teams.update);
app.get('/teams/destroy/:id',									restrict, teams.destroy);
app.get('/teams/share/:id',										restrict, teams.share);
app.get('/teams/join/:id',										restrict, teams.join);

app.post('/teams',												restrict, teams.submit);

app.get('/players/invite',										restrict, players.invite);
app.get('/players/block',										restrict, players.block);

// Firebase
var firebase = require('./lib/firebase-node.js')
app.Firebase = new firebase("https://aggrefit-firebase.firebaseio.com");
var restart  = app.Firebase.child('application');
var now 	 = moment().format()

restart.set({'last-restart': now }, function(error) {
	if (error) {
	    console.log('restart data could not be saved.' + error);
	  } else {
	    console.log('restart date saved successfully.');
	  }
})


// ===========================================================
// port set based on NODE_ENV settings (production, development or test)
console.log("trying to start on port:"+ app.get('port'));

if (!module.parent) {
	app.listen(app.get('port'));
	
	console.log('Aggrefit Server started on port:'+app.get('port'));
}