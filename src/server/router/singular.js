const express = require("express");
const write = require("./write");
const getFullURL = require("./get-full-url");
const delay = require("./delay");

module.exports = (db, name, ebd, securityProvider) => {
	const router = express.Router();
	router.use(delay);

	function show(req, res, next) {
		if( Array.isArray(ebd.get) ){
			if( !securityProvider.isAuthorized(req, ebd.get) ){
				res.locals.myError = { status: 403, message: "You are not authorized to get this resource." };
				next();
				return;
			}
		}

		res.locals.data = db.get(name).value();
		next();
	}

	function create(req, res, next) {
		if( Array.isArray(ebd.post) ){
			if( !securityProvider.isAuthorized(req, ebd.post) ){
				res.locals.myError = { status: 403, message: "You are not authorized to create this resource." };
				next();
				return;
			}
		}

		db.set(name, req.body).value();
		res.locals.data = db.get(name).value();

		res.setHeader("Access-Control-Expose-Headers", "Location");
		res.location(`${getFullURL(req)}`);

		res.status(201);
		next();
	}

	function update(req, res, next) {
		if( Array.isArray(ebd.put) ){
			if( !securityProvider.isAuthorized(req, ebd.put) ){
				res.locals.myError = { status: 403, message: "You are not authorized to update this resource." };
				next();
				return;
			}
		}

		if (req.method === "PUT") {
			db.set(name, req.body).value();
		} else {
			db
				.get(name)
				.assign(req.body)
				.value();
		}

		res.locals.data = db.get(name).value();
		next();
	}

	const w = write(db);
	
	console.log(`[${name}]Behaviors:`, JSON.stringify(ebd));
	if( ebd.get || ebd.post || ebd.patch ){
		var route = router.route("/");
		if( ebd.get ){
			route.get(show);
		}
		if( ebd.post ){
			route.post(create, w);
		}
		if( ebd.put ){
			route.put(update, w);
			route.patch(update, w);
		}		
	}

	return router;
};
