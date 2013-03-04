var request 	= require('request'),
	async		= require('async'),
	moment		= require('moment'),
	util		= require('util');

module.exports = {
	list: function(req, res) {
		var userid 	= req.session.profile.id
		res.format({
			html: function() {
				console.log('sending html...')
				res.render( 'teams/list.hdb', 
					{ 	'layout': 		'short_cs_layout',
						'title': 		'My Teams', 
						'url': 			'/teams/list',
						'config': 		app.config
					});				
			}, 
			json: function() {
				var usersRef 	 = app.Firebase.child('users')
				var userRef 	 = usersRef.child(userid)
				var list 		 = []
				var teams		 = []
				
				console.log("Teams for:", userid)
				
				var userTeamsRef = userRef.child('teams').once( 'value', function(snapshot ) {
					snapshot.forEach(function(msgSnapshot) {
					  	var data = msgSnapshot.val();
						var teamName = data['owns'] || data['member']
						teams.push(teamName)
					})
					console.log("user teams:", teams)
					
					// setup the callback
					var getTeamInfo = function( team, cb ) {
						var teamsRef = app.Firebase.child('teams');
						var teamRef  = teamsRef.child(team);
						teamRef.once('value', function(team_data) {
							var hash = team_data.val()
							hash['ref']=team_data.name()
							console.log("team hash:", util.inspect(hash))
							var members = []
							for( m in hash.members) {
								var item = hash.members[m];
								var userid = item['member']
								console.log('member:', userid, ' team:', teamRef.name())
								members.push(userid)
							}
							
							hash['users'] = [];
							
							// retrieve the profile for each member of the team
							var getProfileInfo = function(member, cb) {
								// let's retrieve the ac for that member
								var ac = userRef.child('ac');
								ac.once('value', function(data) {
									var accessToken = data.val();
									var url1 = app.get('apiBaseUrl')+'/profile?access_token='+accessToken 
									request.get( url1, function(err, response, body ) {
										hash['users'].push(JSON.parse(body))
										cb(null);
									})
								})								
							};
							
							async.each(members, getProfileInfo, function(err) {
								list.push(hash);
								cb(null);								
							})
							
						})
					}
					// go through all teams
					async.each(teams, getTeamInfo, function(err) {
						console.log('list teams create json...%j', list)
						data = { list: list };
						res.json(data);					
						
					})
				})
			}
		})
		
	},
	// join team
	join: function(req, res) {
		var teamid 		= req.params['id'];
		var userid 		= req.session.profile.id;
		
		console.log("user:", userid, " joins team:", teamid)
		
		var teamsRef 	= app.Firebase.child('teams');
		var teamRef  	= teamsRef.child(teamid);
		var membersRef 	= teamRef.child('members')
		
		// make sure that this user is not already a member of that team
		var teamMember = false;
		membersRef.once('value', function(members) {
			members.forEach(function(item) {
				var data 		= item.val();
				var member_id 	= data['member'];
				if( member_id == userid ) {
					console.log('team already a member', userid, teamid)
					teamMember = true
				}
			})
			// not a team member, add it
			if( !teamMember) {
				console.log('add it to the team...')
				var member 		= membersRef.push()
				member.update( {member: userid })
			}
			
			teamMember = false; // reset for next check
			
			// let add the team to that user
			var usersRef 	= app.Firebase.child('users');
			var userRef  	= usersRef.child(userid);
			var teamsRef 	= userRef.child('teams')
			
			// check if user is not already
			teamsRef.once('value', function(members) {
				members.forEach(function(item) {
					var data 		= item.val();
					var member_id 	= data['member'] || data['owns'];
					if( member_id == userid ) {
						console.log('user already a member', userid, teamid)
						teamMember = true
					}			
				})
			})
			
			if( !teamMember) {
				console.log('add team to the user...')
				var member 		= teamsRef.push()
				member.update( {member: teamid })
			}
			
			res.redirect('/')
		})
	},
	
	// show team info
	show: function(req, res) {
		var teamid = req.params['id'];
		res.format({
			html: function() {
				console.log('sending html...')
				res.render( 'teams/show.hdb', 
					{ 	'layout': 		'short_cs_layout',
						'title': 		'Show Team', 
						'url': 			'/teams/'+teamid,
						'config': 		app.config
					});				
			},
			json: function() {
				var teamsRef = app.Firebase.child('teams');
				var teamRef  = teamsRef.child(teamid);
				console.log("pulling team:", teamRef.toString())
				teamRef.once('value', function(team_data) {
					var hash = team_data.val()
					hash['ref']=team_data.name()
					console.log("got team:", hash)
					console.log('sending teams show json...%j', hash)
					data = { team: hash };
					res.json(data);					
				})
				
			}
		})
	},
	// edit exsiting team metadata
	edit: function(req, res) {
		var teamid = req.params['id']
		res.format({
			html: function() {
				console.log('sending html...')
				res.render( 'teams/edit.hdb', 
					{ 	'layout': 		'short_cs_layout',
						'title': 		'Edit Team', 
						'url': 			'/teams/edit/'+teamid,
						'config': 		app.config
					});				
			},
			json: function() {
				var teamsRef = app.Firebase.child('teams');
				var teamRef  = teamsRef.child(teamid);
				teamRef.once('value', function(team_data) {
					var hash = team_data.val()
					hash['ref']=team_data.name()
					console.log('sending teams show json...%j', hash)
					data = { 	user: req.session.profile, 
								team: hash };
					res.json(data);					
				})
				
			}
		})
		
	},
	// send invite to a friend to join the team
	share: function(req, res) {
		var teamid = req.params['id']
		res.format({
			html: function() {
				console.log('sending html...')
				res.render( 'teams/share.hdb', 
					{ 	'layout': 		'short_cs_layout',
						'title': 		'Send Invite To The Team', 
						'url': 			'/teams/share/'+teamid,
						'config': 		app.config
					});				
			},
			json: function() {
				var teamsRef = app.Firebase.child('teams');
				var teamRef  = teamsRef.child(teamid);
				console.log("pulling team:", teamRef.toString())
				teamRef.once('value', function(team_data) {
					var hash 	= team_data.val()
					hash['ref'] = teamid
					console.log('sending teams show json...%j', hash)
					data = { 	team: hash,
						 		profile: req.session.profile,
								config: app.config
					};
					
					console.log('sending teams show json...%j', data)
					
					res.json(data);					
				})
				
			}
		})
	},
	// send invite email
	invite: function(req, res) {
		console.log("invite %j", req.body);
	
		if( req.body['cancel']) return res.redirect('/')
		
		var id 		= req.session.profile.id;
		var email 	= req.session.profile.email;
		
		app.sendgrid.send({
		  to: req.body.email,
		  from: req.body.from,
		  subject: req.body.subject,
		  text: req.body.description
		}, function(success, message) {
			if (!success) {
		    	console.log(message);
				res.send("email sent")
			} else {
				res.send("email error")
			}
		})
	},
	// destroy exisiting team
	destroy: function(req, res) {
		var teamid = req.params['id']
		res.send('destroy:'+teamid)
	},
	// create new team
	create: function(req,res) {
		res.format({
			html: function() {
				console.log('sending html...')
				res.render( 'teams/create.hdb', 
					{ 	'layout': 		'short_cs_layout',
						'title': 		'Create New Team', 
						'url': 			'/teams/create',
						'config': 		app.config
					});				
			},
			json: function() {
				console.log('sending teams create json...%j', req.session.profile)
				data = { user: req.session.profile };
				res.json(data);
			}
		})
	},
	// update team metadata
	update: function(req, res) {
		var teamid 	= req.params['id'];
		var now		= moment().format();
		var userid 	= req.session.profile.id
		
		var team = {
			name: 			req.body.name,
			location: 		req.body.location,
			logo: 			req.body.url,
			description: 	req.body.description,
			created_at: 	req.body.created_at,
			updated_at: 	now,
			owner: 			userid
		}
		var teamsRef = app.Firebase.child('teams');
		var teamRef  = teamsRef.child(teamid);
		teamRef.set(team, function(error) {
			console.log("team updated error:"+error)
		})
		res.redirect('/')
	},
	
	// new team
	submit: function(req,res) {		
		var userid 	= req.session.profile.id
		var now		= moment().format();
		
		var team = {
			name: 			req.body.name,
			location: 		req.body.location,
			logo: 			req.body.url,
			description: 	req.body.description,
			created_at: 	now,
			updated_at: 	now,
			owner: 			userid
		}
		
		var teamsRef = app.Firebase.child('teams');
		var newTeam  = teamsRef.push();
		console.log("newTeam: %j" + team)

		newTeam.set(team, function(error) {
			console.log("team saved error:"+error)
		})
		
		// update user teams
		var usersRef 	 = app.Firebase.child('users')
		var userRef 	 = usersRef.child(userid)
		var userTeamsRef = userRef.child('teams')
		var uTeam = userTeamsRef.push()
		uTeam.update( {owns: newTeam.name() })
		
		res.send("team created: %j", team)
	}
}