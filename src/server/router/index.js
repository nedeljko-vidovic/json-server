const express = require("express");
const methodOverride = require("method-override");
const _ = require("lodash");
const lodashId = require("lodash-id");
const low = require("lowdb");
const fileAsync = require("lowdb/lib/storages/file-async");
const bodyParser = require("../body-parser");
const validateData = require("./validate-data");
const plural = require("./plural");
const nested = require("./nested");
const singular = require("./singular");
const mixins = require("../mixins");



module.exports = (source, customOpts = {}, entityBehaviorDescriptor, securityProvider) => {
	var opts = {
		foreignKeySuffix: "Id",
		serveWholeDb: false,
		autoRenderSuccessfulResponse: true,
		autoRenderFailureResponse: true,
		mandatoryEntityBehaviorDescriptors: false
	};

	Object.assign(opts, customOpts);

	// Create router
	const router = express.Router();

	// Add middlewares
	router.use(methodOverride());
	router.use(bodyParser);

	// Create database
	let db;
	if (_.isObject(source)) {
		db = low();
		db.setState(source);
	} else {
		db = low(source, { storage: fileAsync });
	}

	var ebds;
	if (entityBehaviorDescriptor) {
		ebds = entityBehaviorDescriptor;

		_.forIn(ebds, (entityEbd, entityKey) => {
			_.forIn(entityEbd, (ebdValue, ebdKey) => {
				if (Array.isArray(ebdValue)) {
					if (!securityProvider) {
						throw new Error("EntityBehaviorDescriptor for entity " + entityKey + " specifies a list of authorizations. You must provide a SecurityProvider to use that functionality.");
					}
				}
			});
		});
	}

	validateData(db.getState());

	// Add lodash-id methods to db
	db._.mixin(lodashId);

	// Add specific mixins
	db._.mixin(mixins);

	// Expose database
	router.db = db;

	// Expose render
	router.render = (req, res) => {
		res.jsonp(res.locals.data);
		// res.end();
		// req.connection.destroy();
		console.log("destroyed");
	};

	// GET /db
	if (opts.serveWholeDb) {
		router.get("/db", (req, res) => {
			res.jsonp(db.getState());
		});
	}

	// Handle /:parent/:parentId/:resource
	router.use(nested(opts));

	// Create routes
	db
		.forEach((value, key) => {
			var defaultEbd = {
				list: true,
				get: true,
				post: true,
				put: true,
				patch: true,
				delete: true
			};
			var ebd;
			if (ebds) {
				ebd = ebds[key];
				if (!ebd) {
					if (opts.mandatoryEntityBehaviorDescriptors) {
						throw new Error(`Mandatory entity behavior descriptor not found for entity [${key}]`);
					} else {
						ebd = defaultEbd;
					}
				}
			} else if (opts.mandatoryEntityBehaviorDescriptors) {
				throw new Error("Mandatory entity behavior descriptor file/object not provided.");
			} else {
				ebd = defaultEbd;
			}

			if (_.isPlainObject(value)) {
				router.use(`/${key}`, singular(db, key, ebd, securityProvider));
				return;
			}

			if (_.isArray(value)) {
				router.use(`/${key}`, plural(db, key, ebd, securityProvider, opts));
				return;
			}

			const msg =
				`Type of "${key}" (${typeof value}) ${_.isObject(source)
					? ""
					: `in ${source}`} is not supported. ` +
				"Use objects or arrays of objects.";

			throw new Error(msg);
		})
		.value();

	router.use((req, res, next) => {
		if (res.locals.myError) {
			res.status(res.locals.myError.status);
			res.locals.data = { message: res.locals.myError.message };

			if (opts.autoRenderFailureResponse) {
				router.render(req, res, next);
			} else {
				next();
			}
		} else {
			if (!res.locals.data) {
				res.status(404);
				res.locals.data = { message: "No resource found." };
			}

			if (opts.autoRenderSuccessfulResponse) {
				router.render(req, res, next);
			} else {
				next();
			}
		}
	});

	router.use((err, req, res, next) => {
		console.error(err.stack);

		if (opts.autoRenderFailureResponse) {
			res.status(500).send(err.stack);
		} else {
			next();
		}
	});

	return router;
};
