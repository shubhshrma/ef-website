var express = require('express');
var router = express.Router();
var RouteHandler = require('../../handlers/route_handler');

router.get('/', function(req, res) { res.render("login.ejs"); });


module.exports = router;