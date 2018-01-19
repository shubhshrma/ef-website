var adBlocker = require('just-detect-adblock');
var express = require('express');
var router = express.Router();
var RouteHandler = require('../../handlers/route_handler');
var User = require('../../repo/mongo/user');
var Utils = require('../../utils');
var userController = require('../../controllers/user');
var donationController = require('../../controllers/donations');
var causeController = require('../../controllers/cause');
var ngoController = require('../../controllers/ngo');
var deferred = require('./../../utils/deferred');
var fn = require('./../../utils/functions');
var constants = require('./../../utils/constants');
var moment = require('moment');
// const prettyMs = require('pretty-ms');


router.get('/mission-selected', continueIfLoggedIn, function(req, res) {
    if (req.query && req.query.cause_id) {
        var start = moment().format('x');
        var end = Utils.getEndTime(start);
        userController.setCause(req.user.user_id, req.query.cause_id, start, end).pipe(function(data) {
            res.redirect('/new-tab');
        });
    } else res.redirect('/new-tab');
});


router.get('/choose-mission', continueIfLoggedIn, function(req, res) {
    causeController.getAllCauses().pipe(function(data) {
        res.render("select-cause.ejs", { data });
    });
});


function redirectForNewUser(user, res) {
    if (user.state === "uninitiated") {

        causeController.getAllCauses().pipe(function(data) {
            res.render("select-cause.ejs", { data });
        });
        return true;
    }
    return false;
}

router.get('/', continueIfLoggedIn, function(req, res) {
    if (redirectForNewUser(req.user, res)) return;

    var def = {
        userCount: userController.getAllUserCount(),
        donationCount: donationController.getAllDonationCount(),
        currentCause: causeController.getCauseFromId(req.user.hearts.current_cause_id),
        previousCause: causeController.getCauseFromId(req.user.previous_donation.previous_cause_id)
    };

    deferred.combine(def).pipe(function(data) {
        constructPayload({
            user: req.user,
            cause: data.currentCause,
            numDonations: data.donationCount,
            numUsers: data.userCount,
            previousCause: data.previousCause
        }).pipe(function(result) {
            res.render("new-tab.ejs", result);
        });
    });

    userController.incrementHearsById(req.user.id);
});

router.get('/theme-toggle', function(req, res) {
    var theme = req.query.currentTheme.replace(" ", "");
    var index = constants.themes.indexOf(theme);
    index++;
    var newTheme = constants.themes[(index) % constants.themes.length];
    userController.changeColorTheme(req.user.user_id, newTheme).pipe(function(data) {
        res.send(newTheme);
    });
});

router.get('/theme-change', function(req, res) {
    var newTheme = req.query.selectedTheme;
    userController.changeColorTheme(req.user.user_id, newTheme).pipe(function(data) {
        res.send(newTheme);
    });
});


function constructPayload(data) {
    var hoursToGo = Utils.timePeriodInHours(data.user.hearts.target_end_time, moment().format('x'));
    var remainingTime = hoursToGo >= 24 ? (hoursToGo / 24 > 1 ? Math.floor(hoursToGo / 24) + " days " : Math.floor(hoursToGo / 24) + " day ") :
        (hoursToGo > 1 ? Math.floor(hoursToGo) + " hours " : "1 hour ");

    var progress = Utils.calculateProgress(data.user.hearts.current_week_hearts, data.cause.total_hearts);
    data.user.progress = progress;

    var shortRemaining = "6d"; //prettyMs(data.user.hearts.target_end_time - moment().format('x'), { compact: true });

    var newdata = {
        user: data.user,
        cause: data.cause,
        previousCause: data.previousCause || {},
        stats: {
            donations: "Rs. " + Utils.getCommaSeparatedMoney(data.numDonations),
            followers: Utils.getCommaSeparatedNumber(50 + data.numUsers),
            remainingTime: remainingTime,
            shortRemaining: shortRemaining.replace("~", "")
        }
    };

    var total_hearts_text = data.user.hearts.total_hearts == 1 ? " heart" : " hearts";

    var daysPassed = Utils.timePeriodInDays(moment().format('x'), data.user.timestamp);

    newdata.timeElapsed = moment().format('x') > data.user.hearts.target_end_time;
    newdata.dailyImage = constants.images[Math.round(daysPassed) % constants.images.length];
    newdata.user.first_name = Utils.firstName(newdata.user.name);
    newdata.user.picture = (newdata.user.picture == null || newdata.user.picture == undefined) ? "/image/user.png" : newdata.user.picture;
    newdata.user.hearts.total_hearts_text = data.user.hearts.total_hearts + total_hearts_text;

    if (data.user.state == 'cause_selection_pending') {
        return ngoController.getNgosFromCauseId(data.previousCause.cause_id).pipe(function(res) {
            newdata.previousCause.ngoList = res;
            return deferred.success(newdata);
        });
    }

    if (newdata.timeElapsed &&
        data.user.state !== "cause_selection_pending" &&
        data.user.state !== 'donate_pending_dismissed') {

        newdata.user.state = "donate_pending";

        return ngoController.getNgosFromCauseId(data.cause.cause_id).pipe(function(res) {
            newdata.cause.ngoList = res;
            return deferred.success(newdata);
        });

    } else return deferred.success(newdata);
}

function continueIfLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}


module.exports = router;