var handlebars 	= require('handlebars').create(),
	util		= require('util'),
	uglify 		= require('uglify-js'),
	request 	= require('request'),
	qs 			= require('qs'),
	async		= require('async'),
	fs			= require('fs');
	
module.exports = {
	about: function(req, res) {
		res.render( 'home/about.html', {layout: false});				
	},
	
	contact: function(req, res) {
		res.render( 'home/contact.html', {layout: false});				
	},

	show_profile: function(req, res) {
		console.log("show_profile...%j", req.session)
		if( req.session && req.session.profile ) {
			res.format({
				html: function() {
					console.log("show_profile hdb")
					res.render( 'home/profile.hdb', 
						{	
							layout: 'short_cs_layout', 
							title: 'User Profile',
							url: '/profile',
							config: app.config
						} 
					);
				},
				json: function() {
					console.log("show_profile sending: %j",req.session.profiles)
					res.json( {services: req.session.profiles })
				}
			})
		} else {
			res.redirect('/')
		}
	},
	
	set_profile: function(req, res) {
		console.log("set_profile query:",util.inspect(req.query))
		if( req.session && req.session.profile ) {
			var query = req.query
			req.session.profile.selected = query
			console.log("Selected set to: %j", query)
			var accessToken = req.session.accessToken;
			if( accessToken ) {
				// save it in profile
				var url = app.get('apiBaseUrl')+'/profiles/self?access_token='+accessToken
				var data = { data: query }
				console.log("setting self %j", data)
				request.post( url, data, function(err, response, body ) {
					console.log('err:'+err)
					console.log('body:'+ body);
					res.send("done")
				})
			}
		} else {
			res.redirect( '/');
		}
	},
	get_self: function(req, res ) {
		if(!req.session) res.redirect('/')
		
		var accessToken = req.session.accessToken;
		if( !accessToken ) res.redirect('/')
		var url = app.get('apiBaseUrl')+'/profiles/self?access_token='+accessToken 
		request.get( url, function(err, response, body ) {
			console.log('selfp err:'+err+" self:"+body)
			json = JSON.parse(body);
        	req.session.selfp = json;
			res.send(JSON.stringify(json))
		})	
	},
	index: function(req, res) {
		
		function render_index(req, res) {
			res.format({
				html: function() {
					if( req.session.requested_url ) {
						var requested_url = req.session.requested_url;
						req.session.requested_url = null;
						return res.redirect(requested_url)
					}
					
					console.log('sending html...')
					res.render( 'home/index.hdb', 
						{ 	'layout': 		'clientside_layout',
							'title': 		app.config.application +' Home Page', 
							'url': 			'/',
							'config': 		app.config
						});				
				},
				json: function() {
					console.log('sending json...')
					data = { user_profile: profile };
					res.json(data);
				}
			})
		}
		
		var profile = undefined;
		console.log( util.inspect(req.session))
		if(req.session) {
			
			profile =  req.session.profile;
			if( profile === undefined) {
				console.log("profile:"+profile)
				var accessToken = req.session.accessToken;
				if( accessToken ) {
					async.parallel(
					[
						function(fn) {
							var url1 = app.get('apiBaseUrl')+'/profile?access_token='+accessToken 
							request.get( url1, function(err, response, body ) {
								console.log('profile err:'+err)
								json = JSON.parse(body);
					            req.session.profile = json;
								
								// save token
								var usersRef 	 = app.Firebase.child('users')
								var userRef 	 = usersRef.child(json.id)
								userRef.update({'ac': accessToken} )
								fn(null, json)
							})
						},
						function(fn) {
							//var url = app.get('apiBaseUrl')+'/profiles/self?access_token='+accessToken 
							//request.get( url, function(err, response, body ) {
							//	console.log('selfp err:'+err+" self:"+body)
							//	json = JSON.parse(body);
				            //	req.session.selfp = json;
							var url = app.get('apiBaseUrl')+'/friends?access_token='+accessToken 
							request.get( url, function(err, response, body ) {
								console.log('friends err:'+err+" self:"+body)
								json = JSON.parse(body);
				            	req.session.friends = json;
								fn(null, json)
							})
						},
						
					], function(err, results) {
						console.log("return results")
						render_index(req, res)
					});
				} else {
					console.log("no accessToken")
					render_index(req, res)
				}
			} else {
				console.log("using previous profile")
				render_index(req, res)
			}
		} else {
			console.log("no session")
			render_index(req, res)
		}
	}
};