var request 	= require('request'),
	util		= require('util');

module.exports = {
	// add service to profile
	add: function(req, res) {
		if(!req.session) return res.redirect('/')
		if(!req.session.profile) return res.redirect('/')
		var id = req.params['id'];

		var accessToken = req.session.accessToken;
		var url = app.get('apiBaseUrl')+'/oauth/authenticate?access_token='+accessToken;
		url += "&client_id="+app.get("clientId");
		url += "&redirect_url="+app.get('hostBaseUrl') + '/callback';
		url += "&service="+id;
		res.redirect(url);
	},
	// delete service from profile
	del: function(req, res) {
		if(!req.session) return res.redirect('/')
		if(!req.session.profile) return res.redirect('/')
		var id = req.params['id'];
		
		var user_id = req.session.profiles[id][0]
		
		var url = app.get('apiBaseUrl')+"/profiles?delete="+user_id+"@"+id
		url += '&access_token='+accessToken;
		console.log(url)
		res.send(url)
		// req.post(url)
	},
	Withings: function(req, res) {  
		console.log('Withings...')
		if(!req.session) return res.redirect('/')
		if(!req.session.profile) return res.redirect('/')
		
		var accessToken = req.session.accessToken;
		var url = app.get('apiBaseUrl')+'/services/withings?access_token='+accessToken 
		request.get( url, function(err, response, body ) {
				console.log('err:'+err)
				json = JSON.parse(body);
	            req.session.profile.withings = json;
				
				res.format({
					html: function() {
						console.log('withings sending html... %s', JSON.stringify(json))
					},
					json: function() {
						console.log('withings sending json...')
						data = { withings: json };
						res.json(data);
					}
				})
		})
	},
	
	WithingsAll: function(req, res) {  
		console.log('Withings All...')
		if(!req.session) return res.redirect('/')
		if(!req.session.profile) return res.redirect('/')
		
		var accessToken = req.session.accessToken;
		var url = app.get('apiBaseUrl')+'/services/withings/measures?access_token='+accessToken 
		request.get( url, function(err, response, body ) {
				console.log('err:'+err)
				json = JSON.parse(body);
	            req.session.profile.withings = json;
				
				res.format({
					html: function() {
						console.log('withings sending html... %s', JSON.stringify(json))
					},
					json: function() {
						console.log('withings sending json...')
						data = { withings: json };
						res.json(data);
					}
				})
		})
	},

	FitBit: function(req, res) {  
		console.log('FitBit...')
		
		if(!req.session) return res.redirect('/')
		if(!req.session.profile) return res.redirect('/')
		
		var accessToken = req.session.accessToken;
		var url = app.get('apiBaseUrl')+'/services/fitbit?access_token='+accessToken 
		request.get( url, function(err, response, body ) {
				console.log('err:'+err+" body:"+body)
				json = JSON.parse(body);
	            req.session.profile.fitbit = json;
				
				res.format({
					html: function() {
						console.log('FitBit sending html... %s', JSON.stringify(json))
					},
					json: function() {
						console.log('FitBit sending json...')
						data = { fitbit: json };
						res.json(data);
					}
				})
		})
	},
	
	FitBitAll: function(req, res) {  
		var query 	= req.query;
		var params 	= req.params;
		
		var id = req.params['id']
		
		if(!req.session) return res.redirect('/')
		if(!req.session.profile) return res.redirect('/')
		
		var accessToken = req.session.accessToken;
		if( !accessToken ) return res.redirect('/');
		
		res.format({
			html: function() {
				console.log('FitBitAll sending html')
				res.render('svc/fitbit.hdb',
					{ 	'layout': 		'clientside_layout',
						'title': 		'FitBit Data Page', 
						'url': 			'/',
					});
			},
			json: function() {
				var url = app.get('apiBaseUrl')+'/services/fitbit' 
				if( id ) url += "/"+id
				url += '?access_token='+accessToken
				console.log(url)
				request.get( url, function(err, response, body ) {
					console.log('err:'+err+" body:"+body)
					json = JSON.parse(body);
					req.session.profile.fitbit = json;
					console.log('FitBit sending json...')
					data = { fitbit: json };
					res.json(data);
				})
			}
		})
	}
};