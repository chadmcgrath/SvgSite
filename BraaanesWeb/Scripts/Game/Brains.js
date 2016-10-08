
//var deepqlearn = require("deepqlearn.js");
//var async = require("async.js");
// node-webkit
//var gui = require("nw.gui");
//var filesystem = require('fs');

//var win = gui.Window.get();
//win.setResizable(true);
// show devtools to debug, this sometimes slows things down, certainly when a breakpoint is set
//win.showDevTools();

// copyright chad mcgrath 2016

var canvas = null;
var canvasWidth = window.innerWidth;
var canvasHeight = window.innerHeight;
var agentList = [];

// A 2D vector utility
var Vec = function (x, y) {
    this.x = x;
    this.y = y;
}
Vec.prototype = {

    // utilities
    dist_from: function (v) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); },
    length: function () { return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)); },

    // new vector returning operations
    add: function (v) { return new Vec(this.x + v.x, this.y + v.y); },
    sub: function (v) { return new Vec(this.x - v.x, this.y - v.y); },
    rotate: function (a) {  // CLOCKWISE
        return new Vec(this.x * Math.cos(a) + this.y * Math.sin(a),
                       -this.x * Math.sin(a) + this.y * Math.cos(a));
    },
    // in place operations
    scale: function (s) { this.x *= s; this.y *= s; },
    normalize: function () { var d = this.length(); this.scale(1.0 / d); }

}
function vector(x, y) {

    this.x = x;
    this.y = y;
    var point = this;
    this.toString = function toString() {
        return point.x + "," + point.y;
    }
    this.add = function (pos) {
        var x = point.x + pos.x;
        var y = point.y + pos.y;
        return new vector(x, y);
    }
    this.subtract = function (pos) {
        var x = point.x - pos.x;
        var y = point.y - pos.y;
        return new vector(x, y);
    }
    this.multiply = function multiply(scalar) {
        var x = point.x * scalar;
        var y = point.y * scalar;
        return new vector(x, y);
    }
    this.magnitude = function magnitude() {
        return Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));
    }
    this.unit = function unit() {
        var mag = point.magnitude();
        if (mag === 0)
            return point;
        return point.multiply(1 / mag);
    }
    this.angle = function angle() {
        return Math.atan2(y, x);
    }

}
function CheckRecoil(x, y)
{
    var recoiled = false;
    canvas.buildings.forEach(function (building) {
        var b = building.attrs;
        if (b.x <= x && x <= (b.x + b.width) && b.y <= y && y <= (b.y + b.height)) {
            recoiled = true;
            return;
        }
        if (canvasWidth <= x || x <= 0 || canvasHeight <= y || y <= 0) {
            recoiled = true;
            return;
        }
    });
    return recoiled;
}

// recoil off the sides of the window
function Recoil(agent) {
    var recoil = -1 * (agent.engine + 2);

    var movement = "t" + recoil + "," + 0;

    var currentState = agent.shape.matrix.toTransformString();

    agent.shape.transform(currentState + movement);

    agent.setPoints(agent.angle());

    agent.handleRelationships(movement);

    agent.painSignal += -.5;

}

function isOnCanvas(x, y) {
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight)
        return false;
    return true;
}
var agent = function agent(shape, id, team, height, width, gunPower, engine, turnRate, shieldMax, brain) {
    var that = this;
    this.type = 1;
    this.brain = brain;
    this.acceleration = new vector(0, 0);
    this.shieldRadius = 14;
    this.isUserControlled = false;
    this.height = height;
    this.width = width;
    this.accelerating = false;
    this.id = id;
    this.pointTotal = 0;
    if (!this.pointText) {
        this.pointText = canvas.text(90, 130 + 20 * id, 0).attr({ fill: '#FFFFFF' });
        this.pointText.attr({ "font-size": 12 });
    }
    this.runningKillTotal = 0;
    this.kills = 0;
    this.victim = null;
    this.currentTarget = null;
    this.dead = false;
    this.shape = shape;
    this.level = 1;
    this.team = team;
    this.acceleration = null;
    this.gun = new gun;

    function gun() {
        this.set = function set(power) {
            this.power = power;
            this.range = this.power * 400;
        }
        this.line = null;
        this.color = null;
    }
    this.gun.set(gunPower);
    this.color = null;
    this.setColors = function setColors() {
        if (that.team == 1) {

            that.gun.color = "blue";
            that.color = "blue";
        }
        else if (that.team == 2) {

            that.gun.color = "green";
            that.color = "green";
        }
        else {
            that.gun.color = "green";
            that.color = "green";
        }
        that.shape.attr("fill", that.color);
    }

    this.setColors();
    this.isLeader = false;
    this.turnRate = turnRate;
    // to do, encapsulate shield;
    this.shieldMax = shieldMax;
    this.shield = shieldMax;
    this.shieldRegenerate = 1;
    this.engine = engine;
    this.velocity = new vector(0, 0);
    this.circle = null;
    this.attackAngle = 40;

    this.getLocation = function getLocation() {

        var rect = that.shape[0];

        var matrix = rect.getCTM();
        var svg = rect.ownerSVGElement;
        // transform a point using the transformed matrix
        var point = svg.createSVGPoint();

        var box = that.shape.node.getBBox();
        point.x = box.x;
        point.y = box.y;

        point = point.matrixTransform(matrix);
        return point;
    }
    this.angle = function angle() {
        var m = this.shape.matrix;
        var r = m.split().rotate;
        if (r < 0) {
            r = r + 360;
        }
        return r;

    }
    this.setPoints = function setPoints(angle) {

        that.center.set();
        that.front.set(that.center, angle);
    }
    this.front = new vector(0, 0);
    this.front.set = function set(center, angle) {

        var newAngleRads = Raphael.rad(angle);
        var sin = Math.sin(newAngleRads);// y points down on this grid
        var cos = Math.cos(newAngleRads);

        this.x = center.x + cos * height / 2;
        this.y = center.y + sin * height / 2;

    }

    this.center = new vector(0, 0);

    this.center.set = function set() {

        var rect = that.shape;
        var box = rect.getBBox();
        this.x = box.x + box.width / 2;
        this.y = box.y + box.height / 2;
    }

    this.setPoints(this.angle());

    this.attack = function attack() {
        
        this.createBeams();
    }

    this.fight = function fight() {
        if (this.dead == true) {
            this.drift(this.circle);
            return true;
        }
        this.recoiled = false;
        var angle = this.angle();
       
        var x = this.center.x;
        var y = this.center.y;
        var goVector = this.getBestAgentTarget();
        //var recoiled = CheckRecoil(x,y);
        
        //if (recoiled === false) {
            this.homeIn(angle, goVector);
        //}  
        // reset engine in case they were slowed down by a shot.
            this.engine = $("#engine").val();
        return true;

    }
    this.drift = function drift(shape) {

        var shape = that.shape;
        var velocityString = "T" + that.velocity.toString();

        var currentState = shape.matrix.toTransformString();

        var movement = velocityString;

        shape.transform(currentState + movement);

        that.center.set();

        that.handleRelationships(movement);
    }
    this.getTurnAngle = function (shapeAngle, posX, posY) {
        // ugly ugly
        var rads = Math.atan2(posY, posX);
        var direction = rads * 180 / Math.PI;
        if (direction > 180)
            direction = direction - 360;

        if (shapeAngle > 180)
            shapeAngle = shapeAngle - 360;

        var degreeDiff = direction - shapeAngle;

        while (degreeDiff > 180)
            degreeDiff = degreeDiff - 360;
        while (degreeDiff < -180)
            degreeDiff = degreeDiff + 360;

        var turn = that.turnRate;

        var absDiff = Math.abs(degreeDiff);

        if (absDiff < Math.abs(turn))
            turn = degreeDiff;
        else if (degreeDiff < 0)
            turn = turn * -1;

        return turn;
    }
    this.homeIn = function homeIn(shapeAngle, targetVector) {
        
        var shape = that.shape;

        // ugly ugly
        var rads = targetVector.angle();
        var direction = rads * 180 / Math.PI;
        if (direction > 180)
            direction = direction - 360;

        if (shapeAngle > 180)
            shapeAngle = shapeAngle - 360;

        var degreeDiff = direction - shapeAngle;

        while (degreeDiff > 180)
            degreeDiff = degreeDiff - 360;
        while (degreeDiff < -180)
            degreeDiff = degreeDiff + 360;

        var turn = that.turnRate;

        var absDiff = Math.abs(degreeDiff);

        if (absDiff < Math.abs(turn))
            turn = degreeDiff;
        else if (degreeDiff < 0)
            turn = turn * -1;


        var transform = "";
        var newAngle = shapeAngle + turn;

        var angleString = "r" + turn;

        var accelerationString = "";

        if (absDiff < 90) {
            var rads = newAngle * Math.PI / 180;
            var sin = Math.sin(rads);// y is backwards on the grid
            var cos = Math.cos(rads);

            var velocityY = sin * that.engine;
            var velocityX = cos * that.engine;

            var newVelocity = new vector(velocityX, velocityY);
            this.acceleration = newVelocity;
            that.velocity = that.velocity.add(newVelocity);

            accelerationString = "t" + that.engine + "," + 0;

        }

        //var velocityString = "T" + that.velocity.toString();
        var destination = this.acceleration.add(this.front);
        var recoil = CheckRecoil(destination.x, destination.y);
        var currentState = shape.matrix.toTransformString();

        var movement = angleString;
        if (recoil == false)
            movement = movement + accelerationString;

        shape.transform(currentState + movement);

        that.setPoints(newAngle);

        that.handleRelationships(movement);

    }

    this.handleRelationships = function handleRelationships(movement) {

        var thatCenter = that.center;

        var shield = that.circleShield;

        if (shield != null && that.circleShield.attr("opacity") > .001)
            shield.attr({
                cx: thatCenter.x,
                cy: thatCenter.y
            })
        if (that.dead == true) {
            var circle = that.circle;

            if (circle != null && circle.attr("opacity") > .001) {
                circle.attr({
                    cx: thatCenter.x,
                    cy: thatCenter.y
                })
                that.circle = circle;
            }
        }
    }
    this.findEnemy = function findEnemy(angle, attackAngle) {

        var range = that.gun.range;
        var enemy = null;
        var thatCenter = that.center;
        var currentTargetDistance = 99999999;
        var thatX = thatCenter.x;
        var thatY = thatCenter.y;
        // if (thatX < 0 || thatX > canvasWidth || thatY < 0 || thatY > canvasHeight) {
        // that.victim = enemy;
        // return currentTargetDistance;
        // }
        for (var i = 0; i < agentList.length; ++i) {

            var agent = agentList[i];

            if (that.team != 0 && that.team == agent.team)
                continue;
            if (agent.dead == true || agent.id == that.id)
                continue;
            if (enemy != null && enemy.team != 0 && agent.team == 0)
                continue;// attack opposing team preferentially, rather than team 0 (the jerk team)
            var agentCenter = agent.center;
            var displacement = new vector(agentCenter.x - thatCenter.x, agentCenter.y - thatCenter.y);
            var distance = that.getMagnitudeFromVector(displacement);
            if (distance < currentTargetDistance && that.id != agent.id && distance < range) {
                var rads = Math.atan2(displacement.y, displacement.x);
                var degs = Raphael.deg(rads);
                if (degs < 0) {
                    degs = degs + 360;
                }
                var adjustedForagentAngle = Math.abs(degs - angle);
                if (adjustedForagentAngle < attackAngle / 2) {
                    enemy = agent;
                    currentTargetDistance = distance;
                }
            }
        }
        that.victim = enemy;
        return currentTargetDistance;
    }


    this.getBestAgentTarget = function getBestAgentTarget() {
        var agent = this;
        var center = agent.center;
        var thisX = center.x;
        var thisY = center.y;
        var closest = null;
        humanList.forEach(function (h) {
            if (h.dead === true)
                return;
            var wallProximity = 999999;
            var v = h.center.subtract(center);
            var res = checkCollisions(center, h.center, walls, null, agent, true);
            if (res)
                wallProximity = res.up.dist_from(agent.center);           
            var mag = v.magnitude();
            if (mag < wallProximity && (!closest || mag < closest.magnitude())) {
                closest = v;
            }
        });
        if (closest)
            return closest;

        // see if it tries to herd
        //if (Math.random() < .2) {
        //    zombieList.forEach(function (z) {
        //        if (z.dead === true)
        //            return;
        //        var wallProximity = 999999;
        //        var v = z.center.subtract(center);
        //        var res = checkCollisions(center, z.center, walls, null, agent, true);
        //        if (res)
        //            wallProximity = res.up.dist_from(agent.center);
        //        var mag = v.magnitude();
        //        if (mag < wallProximity && (!closest || mag < closest.magnitude()) && mag < (2 * agent.shieldRadius)) {
        //            closest = v;
        //        }
        //    });
        //}
        
        if (!closest) {
            
            var random = new vector(Math.random() * 2 - 1, Math.random() * 2 - 1);                        
            return random;
        }
        return closest;      
    }

    this.getBestTarget = function getBestTarget(thisX, thisY) {

        var targetFactor = 0;
        var shortest = 0;
        var attackVector = null;
        var currentagent = null;


        var targetsInCanvas = false;

        // go toward middle  with some slight braking action (angling slightly away from the centre in the opposite direction of travel)if there are no agents in canvas      
        var attackVector = displacement;
        for (var i = 0; i < agentList.length; ++i) {

            var agent = agentList[i];

            if (this.team != 0 && that.team == agent.team)
                continue;
            if (agent.dead == true || agent.id == that.id)
                continue;
            var agentCenter = agent.center;
            var agentX = agentCenter.x;
            var agentY = agentCenter.y; 

            if (agentX < 0 || agentX > canvasWidth || agentY < 0 || agentY > canvasHeight) {
                continue;
            }

            displacement = new vector(agentX - thisX, agentY - thisY);

            var distance = displacement.magnitude();

            if (distance === 0)
                distance = .00000000001;
           
            if (attractionFactor > targetFactor) {
                currentagent = agent;
                currentagentCenter = agentCenter;
                attackVector = displacement;
                targetFactor = attractionFactor;
                targetsInCanvas = true;
            }
        }

        that.currentTarget = currentagent;

        // turn agent to apply some breaking if it's out of bounds and it's chasing a agent
        if (targetsInCanvas == true && (thisY < 0 || thisY > canvasHeight || thisX < 0 || thisX > canvasWidth)) {
            attackVector.x = attackVector.x - 5 * velX;
            attackVector.y = attackVector.y - 5 * velY;
        }

        return attackVector;
    }

    this.getMagnitudeFromVector = function getMagnitudeFromVector(displacement) {
        var distance = Math.sqrt(Math.pow(displacement.x, 2) + Math.pow(displacement.y, 2));
        return distance;
    }
    this.positionToString = function positionToString(pos) {
        var string = pos.x + "," + pos.y;
        return string;
    }
    this.createBeams = function () {
        var gun = that.gun;
        var power = gun.power;
        var enemy = that.victim;
        var magnitude = this.eyes[0].proximity;
        var angle = this.angle();
        var rads = angle * Math.PI / 180;
        var v = new vector(magnitude * Math.cos(rads), magnitude * Math.sin(rads));

        var damage = 1;// * power - (power) * distance / gun.range;
        //var front = that.front;
        //var enemyCenter = enemy.center;
        var pt1 = that.positionToString(this.center);
        var pt2 = that.positionToString(this.center.add(v));      

        if (!this.beam) {
            this.beam = canvas.path("M" + pt1 + " L" + pt2);
            this.beam.attr("stroke", "red");
            //line.translate(0.5, 0.5);
            this.beam.attr("stroke-width", 1);
           
        } else {
            this.beam.attr("path", "M" + pt1 + " L" + pt2);
            this.beam.attr("opacity", 1);;
        }
        this.beam.animate({ opacity: 0 }, 500);
        //gun.line = line;
        //var blast = new position((enemyCenter.x - front.x)*damage *.001, (enemyCenter.y - front.y)*damage*.001);
        if (!this.target)
            return;
        enemy = this.target;
        var reward = damage;// * (enemy.shieldMax - enemy.shield + 1);
        
        enemy.takeHit(damage, gun.color, damage);
        if (damage <= 0)
            return;
        if (enemy.dead == true) {
            that.kills = that.kills + 1;
            //reward += 5000;
        }
        if(this.target.team === this.team)
        {
            reward = -2 * reward;
        }
        this.deliverySignal += reward;
        this.pointTotal += reward;
        this.pointText.attr({ text: this.pointTotal });
        //enemy.painSignal -= reward;
        //enemy.pointTotal -= reward;
        enemy.pointText.attr({ text: enemy.pointTotal })
        //    that.levelUp(1,gun.power)

    }

    this.levelUp = function levelUp(factor, gunPower) {
        that.level = that.level + factor;
        that.gun.set(gunPower + factor);
        //that.turnRate = that.turnRate + factor;
        that.engine = that.engine + factor;
    }

    this.takeHit = function takeHit(damage, color, blast) {
        // hack todo hacky hack hack let's give the quick a chance 
        
        if (blast && that.team === 2) {           
            that.engine = this.engine - blast;
        }

        var circleColor = "red";
        if (color)
            circleColor = "white";
        that.shield = that.shield - damage;

        var shape = that.shape;
        var center = that.center;
        var x = center.x;
        var y = center.y;

        
        //var circle = canvas.circle(x, y, (4 * damage))       
        //circle.attr("fill", circleColor);
        //circle.animate({ opacity: 1 }, 1500, function () { this.remove(); });
        

        var colorShield = "rgb(0,0,255)";
        var circleShield = that.circleShield;
        if (circleShield == null) {
            circleShield = canvas.circle(x, y, that.shieldRadius);
            circleShield.insertBefore(shape);
            circleShield.attr("opacity", .3);
        }
        else {
            colorShield = colorBleed(that.shield, that.shieldMax);
            circleShield.show();
            circleShield.attr("opacity", .3);
        }

        circleShield.attr("fill", colorShield);

        that.circleShield = circleShield;

        //that.velocity.add(blast);

        if (that.shield <= 0) {
            that.explode();
        }
    }

    this.explode = function explode() {
        that.dead = true;
        console.info(that.id + " dead");

        that.circleShield.remove();
        var circle = canvas.circle(that.center.x, that.center.y, 4)
        circle.attr("fill", "red");
        that.circle = circle;
        circle.animate({ opacity: 0, transform: 's20' }, 1000, function () {
            this.remove();
            circle.remove();
            that.shape.remove();
            that.circle.remove();
        });
        if (this.eyes && this.eyes[0].line) {
            this.eyes.forEach(function (e) {              
                    e.line.remove();
            });
        }
        var color = that.team;
        if (that.isUserControlled)
            color = "white";
        iterateCountText(color, -1);
        return this;
    }
}

// this transforms a color through from blue to red. it's based soley on rbg values, so doen't really map to light's frequency.
var colorBleed = function colorBleed(current, max) {

    var factor = current / max;
    var blue = red = green = 0;

    var colorProduct = 255 * 4;

    if (factor > .75) {
        blue = 255;
        green = (1 - factor) * colorProduct;//green
    }
    else if (factor > .5) {
        green = 255;
        blue = (factor - .5) * colorProduct;
    }
    else if (factor > .25) {
        green = 255;
        red = (.5 - factor) * colorProduct;
    }
    else {
        red = 255;
        var green = factor * colorProduct;
    }
    var ret = "rgb(" + red + "," + green + "," + blue + ")";
    return ret;
}

Raphael.fn.triangle = function (x, y, height, width) {
    var path = ["M", x, y];
    path = path.concat(["L", (x + height), (y + width / 2)]);
    path = path.concat(["L", (x), (y + width)]);
    return this.path(path.concat(["z"]).join(" "));
};
$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (!results) {
        return 0;
    }
    return results[1] || 0;
}
var isViewing = true;
$(document).ready(function () {
    document.onkeypress = function (event) {
        if (event.which == 118) {
            event.preventDefault();
            isViewing = !isViewing;
        }
    }
    var rep = $.urlParam('rep');
    if (rep) {
        rep = parseInt(rep);
        ++rep;
        fetchInputAndOpenCanvas(rep);
        $("#dialog").hide();
        return;
    }
    begin();
});

var whiteCountText;
var greenCountText;
var yellowCountText;
var blueCountText;
var originalAgentList = [];
var inputArray = [];
var humanList = [];
var zombieList = [];

function begin() {

    $("#dialog").dialog({
        resizable: false,
        height: 700,
        width: 800,
        modal: false,
        buttons: {
            "Action!": function () {
                $(this).dialog("close");
            }
        },
        close: function () {
            fetchInputAndOpenCanvas(0);
        }
    });
}
function fetchInputAndOpenCanvas(reps) {

    console.info("Creating canvas at " + new Date().toLocaleTimeString().toString());
    var width = 22;
    var height = 10;
    var gunPower = 1;
    var spin = 20;
    var shield = 1000;
    var engine = 5;
    var isUseragent = false;
    var agents = 35;
    var isTeams = false;
    var learningRate = .01;
    var aggression = 2;
    var isImportedBrain = true;


    // todo: validate
    width = parseInt($("#width").val());
    height = parseInt($("#height").val());
    gunPower = parseFloat($("#gunPower").val());
    spin = parseInt($("#spin").val());
    shield = parseInt($("#shield").val());
    engine = parseFloat($("#engine").val());
    isUseragent = $("#isUseragent").prop('checked');
    agents = parseInt($("#agents").val());
    isTeams = $("#isTeams").prop('checked');
    isImportedBrain = $("#import-brain").prop('checked');

    var teamCount = 1;

    if (isTeams == true) {
        teamCount = 2;
        //teamCount = 3;
    }
    agentList = null;
    agentList = [];

    openCanvas(width, height, gunPower, spin, shield, engine, isUseragent, agents, teamCount, isImportedBrain, reps);

}
function addBuildings(canvas1) {
    buildings = [];
    walls = [];

        var rect1 = canvas1.rect(0, 0, canvasWidth, canvasHeight);
        walls.push ({ p1: { x: 0, y: 0 }, p2: { x: 0 + w, y: canvasHeight } });//top
        walls.push ({ p1: { x: 0, y: 0 }, p2: { x: canvasWidth, y: 0 } });//bottom
        walls.push ({ p1: { x: 0, y: canvasHeight}, p2: { x: canvasWidth, y: canvasHeight } });//left
        walls.push ({ p1: { x: canvasWidth, y: 0 }, p2: { x: canvasWidth, y: canvasHeight } });// right
        rect1.attr({
            stroke: 'darkblue',
            'stroke-width': 20            
        });

    var mainGap = 100;
    var maxSize = mainGap;
    var minSize = mainGap / 4;
    var diff = maxSize - minSize;
    for (var i = 10; i < canvasHeight - 10;) {
        for (var j = 10; j < canvasWidth - 10;) {
            var isBuilding = (.30 >= Math.random());
            var w = minSize + Math.random() * diff;
            if (isBuilding === true) {
                var l = minSize + Math.random() * diff;
                var rect = canvas1.rect(j, i, w, l);
                rect.attr({
                    stroke: 'darkblue',
                    'stroke-width': 3,
                    fill: 'grey'
                });
                buildings.push(rect);
                rect.walls = [];
                var w1 = { p1: { x: j, y: i }, p2: { x: j + w, y: i } };//top
                var w2 = { p1: { x: j, y: i + l }, p2: { x: j + w, y: i + l } };//bottom
                var w3 = { p1: { x: j, y: i }, p2: { x: j, y: i + l } };//left
                var w4 = { p1: { x: j + w, y: i }, p2: { x: j + w, y: i + l } };// right

                walls.push(w1);
                walls.push(w2);
                walls.push(w3);
                walls.push(w4);

                rect.walls.push(w1);
                rect.walls.push(w2);
                rect.walls.push(w3);
                rect.walls.push(w4);
            }
            j = j + w + 0;
        }
        i = i + mainGap;
    }
    buildings.walls = walls;
    canvas1.buildings = buildings;
    canvas1.walls = walls;
}
function openCanvas(width, height, gunPower, spin, shield, engine, isUseragent, agentCount, teamCount, isImportedBrain, reps) {

    whiteCount = 0;
    greenCount = 0;
    yellowCount = 0;
    blueCount = 0;
    if (canvas)
        canvas = null;
   var canvasElement = document.getElementById("raphael");
   canvasElement.innerHTML = "";
   canvas = new Raphael(canvasElement, canvasWidth, canvasHeight);
    var background = canvas.rect(0, 0, canvasWidth, canvasHeight);
    background.attr("fill", "black");
    addBuildings(canvas);
    //whiteCountText = canvas.text(10, 10, 0).attr({ fill: '#FFFFFF' });
    //whiteCountText.attr({ "font-size": 16 });
    greenCountText = canvas.text(10, 50, 0).attr({ fill: '#00FF00' });
    greenCountText.attr({ "font-size": 16 });
    blueCountText = canvas.text(10, 80, 0).attr({ fill: '#0000FF' });
    blueCountText.attr({ "font-size": 16 });
    yellowCountText = canvas.text(10, 110, 0).attr({ fill: '#FFFF00' });
    yellowCountText.attr({ "font-size": 16 });

    agentList = null;
    agentList = [];
    inputArray = [];
    var numNeuro = 10;
    for (var i = 0; i < agentCount; ++i) {
        //for (var i = 0; i < agentCount; ++i) {
        var kills = 0;
        var points = 0;
        var team = 1;
        if (i >= numNeuro) {
            team = 2;
        }

        var newagent = buildagent(width, height, gunPower, canvas, i, team, engine, spin, shield, null);

        if (team === 1) {
            newagent = overrideNeuro(newagent);
            var brain = createBrain(agentCount, newagent, .001);
            brain.learning = false;
            if (i === 0) {
                brain = createBrain(agentCount, newagent, .15);
            }
            if (!originalAgentList || originalAgentList.length < 1) {
                //if(team === 1){	
                try {
                    var buff = null;
                    var json = null;
                    if (isImportedBrain) {
                        if (localStorage) {
                            json = JSON.parse(localStorage.getItem('brain'));
                        }
                        if(!json || json == "")
                            json = JSON.parse($("#netState").val());
                    } else {

                        buf = filesystem.readFileSync("brainState.txt", "utf8");
                        json = JSON.parse(buf);
                    }

                    brain.fromJSON(json);
                    console.info("loaded brain for " + i);
                }
                catch (e) {
                    console.info("No brainState loaded or file does not exist " + i);
                }
                brain.learning = true;
                if (i > 0) {
                    //brain = agentList[0].brain;
                    brain.learning = false;
                }
            }
            else {
                newagent.runningKillTotal = originalAgentList[i].runningKillTotal + originalAgentList[i].kills;
                newagent.pointTotal = originalAgentList[i].pointTotal;
                //newagent.pointText = originalagentList[i].pointText;
                if (i === 0) {
                    brain = originalAgentList[i].brain;
                }
                else //if(originalagentList[i].team === 1) {
                {
                    var brainState = originalAgentList[0].brain.toJSON();
                    var t = JSON.stringify(brainState);
                    var json = JSON.parse(t);

                    brain.fromJSON(json);
                    brain.learning = false;
                }
                console.info("agent " + i + " total: " + originalAgentList[i].pointTotal);
            }
            newagent.brain = brain;
        }
        newagent.setColors();
        addAgent(newagent);
        iterateCountText(team, 1);
    }
    originalAgentList = null
    originalAgentList = agentList;
    humanList = [];
    zombieList = [];
    humanList = agentList.filter(function (elem) {
        return elem.team === 1;
    });
    zombieList = agentList.filter(function (elem) {
        return elem.team === 2;
    });
    
    executeTurn(teamCount, reps);
}
var turnCounter = 0;

function executeTurn(teamCount, reps) {
    if (!isFinite(teamCount)) {
        teamCount = 2;
    }    
    var keepGoing = false;
    var teamvictory = true;
    var team = null;
    var noBrainagentsLeft = true;
    // there are no team victories with only one team.
    if (teamCount == 1)
        teamvictory = false;
    agentList = jQuery.grep(agentList, function (value) {

        var circle = value.circle;
        var isExploding = circle != null && circle.attr("opacity") > 0;
        if (team != null && value.team != team)
            teamvictory = false;
        team = value.team;

        var removeMe = value.dead == false || isExploding == true;
        //if (value.dead) {
        //    value = null;
        //}
        return removeMe;

    });
    agentList.forEach(function (agent) {
        if (agent.brain !== null && agent.brain.learning === true) {
            noBrainagentsLeft = false;
        }
    });

    if (agentList.length > 1 && teamvictory === false && noBrainagentsLeft === false) {
        agentList.forEach(function (s) {
            s.fight();
        });
        ++turnCounter;
        if (isViewing || turnCounter % 100 === 0) {
            requestAnimationFrame(executeTurn);
        }
        else {
            //asyncTurn(agentList);
            executeTurn();
        }
    }
    else {
        if (originalAgentList[0].brain) {
            var j = originalAgentList[0].brain.toJSON();
            var t = JSON.stringify(j);
            localStorage.setItem("brain", t);
            $("#netStateNew").val(t);
        }
        canvas = null;
        var url = window.location.href;
        if (url.indexOf('?') > -1) {
            document.location.reload(false);
        } else {
            url += '?rep=1'
        }
        window.location.href = url;

        //fetchInputAndOpenCanvas();
        return;
    }
}
function asyncTurn(agents) {
    async.each(agents,
    // 2nd param is the function that each item is passed to
    function (item, callback) {

        item.fight(function () {
            callback();
        });
    },
    function (err) {

    }
  );

}

function buildagent(width, height, gunPower, canvas, i, team, engine, turnRate, shield, brain) {
    // start teams on opposing coreners
    var pos;
    var color = "black";
    var inBuilding = false;
    do {
        if (1 === 1) {
            console.info("creating " + i);
            pos = new vector(10 + Math.random() * (canvasWidth - 20), 10 + Math.random() * (canvasHeight - 20));
            var centerx = pos.x;// + height / 2;
            var centery = pos.y;// + width / 2;
            inBuilding = CheckRecoil(centerx, centery);
            //var el = canvas.getElementByPoint(centerx, centery);
            //if (el) {
            //    color = el.attrs.fill;
            //    if (color != "black") {
            //        console.info("in building");
            //    }
            //} else {
            //}
        }
        //else if (team === 2) {
        //    pos = new vector(canvasWidth - 10 - (Math.random() * (canvasWidth / 4)), canvasHeight - 10 - (Math.random() * (canvasHeight)));
        //}
    } while (inBuilding === true);

    //var pos = new vector(Math.random() * (canvasWidth/2) + canvasWidth/4, Math.random() * (canvasHeight/2) + canvasHeight/4);

    var angle = Math.random() * 360;
    //canvas.font = height + "px FontAwesome";
    //var icon = canvas.text(20, 20, "\f0fb");
    //icon.attr('font-family', 'FontAwesome');
    var icon = canvas.triangle(pos.x, pos.y, height, width);
    icon.transform("r" + angle);

    var newagent = new agent(icon, i, team, height, width, gunPower, engine, turnRate, shield, brain);
    //newagent.velocity = new vector(Math.random() * 10 - 5, Math.random() * 10 - 5);

    newagent.velocity = new vector(0, 0);
    newagent.acceleration = new vector(0, 0);
    return newagent;
}

function createBrain(numagents, newagent, epsilon) {

    //if (!epsilon)
        epsilon = .12;
    var arrayLength = newagent.eyes.length * 2;

    var spec = {}
    spec.update = 'qlearn'; // qlearn | sarsa
    spec.gamma = 0.7; // discount factor, [0, 1)
    spec.epsilon = epsilon;//0.2; // initial epsilon for epsilon-greedy policy, [0, 1)
    spec.alpha = 0.005; // value function learning rate
    spec.experience_add_every = 1; // number of time steps before we add another experience to replay memory
    spec.experience_size = 20000; // size of experience
    spec.learning_steps_per_iteration = 50;
    spec.tderror_clamp = 1.0; // for robustness
    spec.num_hidden_units = arrayLength * 2; // number of neurons in hidden layer

    //newagent.actions = 10;
    newagent.num_states = arrayLength;
    newagent.getNumStates = function () {
        return newagent.num_states;
    },
    newagent.getMaxNumActions = function () {
        return 9;
    }
    var env = newagent;
    brain = new RL.DQNAgent(env, spec);

    return brain;
}

function overrideNeuro(agent, isLearning) {
    agent.engine = agent.engine + 3;
    agent.painSignal = 0.0;
    agent.deliverySignal = 0.0;
    var num_states;
    var actions;
    var numEyes = 30;
    agent.type = .2;
    agent.eyes = [];
    agent.beam = null;
    var maxX = Math.min(canvasWidth, 1920);
    var maxY = Math.min(canvasWidth, 1080);
    var maxVactor = new vector(maxX, maxY);
    var hypotenuse = maxVactor.magnitude();
    for (var i = 0; i < numEyes; ++i) {
        var e = {
            originalRads: i * Math.PI * 2 / numEyes,
            rads: i * Math.PI * 2 / numEyes,
            proximity: hypotenuse,
            type: 0,
            maxRange: hypotenuse,
            line: null
        };
        agent.eyes.push(e);
    }
    agent.fight = function fight() {
        if (agent.dead == true) {
            agent.drift(this.circle);
            return true;
        }
        var angle = agent.angle();
               
            var action = this.forward();
            this.move(action, angle);
            agent.updateEyes(agent.angle());        
        var bites = agent.getEnemyContacts().length;
        agent.painSignal -= bites;
        agent.takeHit(bites);
        this.backward();
        return true;

    }
    agent.getEnemyContacts = function()
    {
        if (!agent.collisionList)
            return [];
        var flags = {};
        var unique = agent.collisionList.filter(function (entry) {
            if (flags[entry.id]) {
                return false;
            }
            flags[entry.id] = true;
            return true;
        });
        if (!unique)
            return [];
        var enemies = unique.filter(function (elem) {
            return elem.team != agent.team;
        });
        if (!enemies)
            return [];
        return enemies;
    }
    agent.updateEyes = function (angle) {

        var a = agent;
        var aRads = angle * Math.PI / 180;
        for (var ei = 0, ne = a.eyes.length; ei < ne; ei++) {
            var e = a.eyes[ei];
            e.rads = e.originalRads + aRads;
            //var sr = e.proximity;
            //var v = new vector(sr * Math.cos(e.rads), sr * Math.sin(e.rads));
            //var pt2 = a.center.add(v);
            //var line = canvas.path("M" + a.center + " L" + pt2);
            //line.attr({ opacity: .3 });            
                        
            //if (e.line)
            //    e.line.remove();
            //e.line = line;
            //if (e.type === .5 || e.type === 0) {
            //    line.attr("stroke", "gray"); // wall or nothing
            //}
            //if (e.type === .2) { line.attr("stroke", "yellow"); } // apples
            //if (e.type === 1) { line.attr("stroke", "red"); } // poison
            //if (ei === 0) { line.attr("stroke", "green"); }
            //line.translate(0.5, 0.5);          
        }
    }
    agent.move = function (action, angle) {

        
        var turn = 0;
        var angleString = "";
        var transform = "";

        var accelerationString = "";
        agent.accelerating = true;

        var acc = agent.engine;
        accelerationString = "t" + acc + "," + 0;
        var rads = angle / 180 * Math.PI;
        var sin = Math.sin(rads);// y is backwards on the grid
        var cos = Math.cos(rads);
        var velocityY = sin * acc;
        var velocityX = cos * acc;
        var newVelocity = new vector(velocityX, velocityY);
        this.acceleration = newVelocity;
        turn = agent.doAction(action);
        angleString = "r" + turn;    
        var velocityString = "T" + agent.velocity.toString();
        var currentState = agent.shape.matrix.toTransformString();
        var movement = angleString;
        if (agent.recoil === false && action != 0 && action != 8)
            movement = movement + accelerationString;
        agent.shape.transform(currentState + movement);
        agent.setPoints(angle + turn);
        agent.handleRelationships(movement);

    }
    agent.doAction = function (action) {

        var turn = 0;
        switch (action) {
            case 0:
                turn = 180;
                break;
            case 1:
                turn = -19;
                break;
            case 2:
                turn = -5;
                break;
            case 3:
                turn = -2;
                break;
            case 4:
                turn = 0;
                break;
            case 5:
                turn = 2;
                break;
            case 6:
                turn = 5;
                break;
            case 7:
                turn = 19;
                break;
            case 8:
                agent.attack();// attack or perform an action;
                turn = 0;
                break;
            default:
                alert('action resulted in default in case, this shouldnt happen');
        }

        return turn;
    },
    agent.checkInput = function (i) {

        if (inputArray[i] > 1 || inputArray[i] < 0) {
            console.log("input out of range: " + inputArray[i]);
            console.log("i=" + i);
        }

    },
    agent.forward = function () {
        if (agent.dead) {
            return 0;
        }
        // create sensors for the agent that are concentrated where the person is facing
        // in forward pass the agent simply behaves in the environment
        // create input to brain
        
        var x = agent.center.x;
        var y = agent.center.y;
        this.recoil = false;
        var recoiled = CheckRecoil(agent.front.x, agent.front.y);
        if (recoiled) {
            Recoil(agent);
            agent.painSignal += -.5;
        }
        this.recoil = recoiled;
        
        var a = agent;
        agent.target = null;
        for (var ei = 0, ne = a.eyes.length; ei < ne; ei++) {
            var e = a.eyes[ei];
            var rad = a.angle() / 180 * Math.PI;

            var eyep = new Vec(x + e.maxRange * Math.cos(e.rads),
                               y + e.maxRange * Math.sin(e.rads));
            eyep.id = ei;

            var res = checkCollisions(agent.center, eyep, canvas.walls, agentList, agent);
            if (res) {
                // eye collided
                //superhacky- should not be in this method- remove collision detection outside of forward method               
                e.proximity = res.up.dist_from(a.center);
                e.type = res.type;
            } else {
                e.proximity = e.maxRange;
                e.type = 0;
            }
            inputArray[ei * 2] = e.type;
            inputArray[ei * 2 + 1] = e.proximity / e.maxRange;
            //agent.checkInput(ei);
        }
        //if (this.brain.learning == false)
        //    this.brain.net = agentList[0].brain.net;
        // get action from brain
        var actionix = this.brain.act(inputArray);
        this.actionix = actionix; //back this up       
        return actionix;
    },
    agent.backward = function () {
        if (this.brain.learning !== true) {
            return;
        }
        var deliveryReward = this.deliverySignal * 1;
        var painReward = this.painSignal * 1;
        //var tailedReward

        this.painSignal = 0.0;
        this.deliverySignal = 0.0;

        var reward = deliveryReward + painReward;
        //var oldBrain = this.brain.toJSON();	
        var weights = this.brain.net.W1.w;

        this.brain.learn(reward);


        for (var i = 0; i < 1; ++i) {
            if (!isFinite(weights[i])) {
                debugger;
                var inputDump = " inputDump: ";

                for (var x = 0; x < inputArray.length; ++x) {
                    inputDump += "input" + x + ":" + inputArray[x];
                }
                console.log(consoleDump);
                alert("weight:" + i + " is not finite or NaN");
            }
        }
        this.reward = 0;
    },
    agent.setColors = function setColors() {
        if (agent.team == 1) {

            agent.gun.color = "blue";
            agent.color = "blue";
            if (agent.brain.learning === true) {
                agent.gun.color = "purple";
                agent.color = "purple";
            }
        }
        else if (agent.team == 2) {

            agent.gun.color = "yellow";
            agent.color = "yellow";
            if (agent.brain.learning === true) {
                agent.gun.color = "orange";
                agent.color = "orange";
            }
        }
        else {
            agent.gun.color = "#00FF00";
            agent.color = "#00FF00";
        }
        agent.shape.attr("fill", agent.color);
        //agent.setColors();       
    }
    return agent;
}
// this should be in a prototype
function checkCollisions(p1, p2, walls, items, agent, returnOnFirstLower) {
    
    var minres = null;
    
    if (walls) {
        for (var i = 0, n = walls.length; i < n; i++) {
            var wall = walls[i];
            var res = get_line_intersection(p1, p2, wall.p1, wall.p2);
            if (res) {
                if (returnOnFirstLower)
                    return res;
                res.type = .5; // .5 is wall               
                if (!minres) { minres = res; }
                else {
                    // check if its closer
                    if (res.ua < minres.ua) {
                        // if yes replace it
                        minres = res;
                    }
                }
            }
        }
    }
    // collide with items
    if (items) {
        var targetTeam = 2;
        if (agent.team === 2) {
            targetTeam = 1;
        }
        var eyeId = -1;
        
        eyeId = p2.id;
        var collisionList = [];        
        for (var i = 0, n = items.length; i < n; i++) {
            var it = items[i];
            //rad = it.angle() * 2 * Math.PI / 360;
            var res = line_point_intersect(p1, p2, it.center, it.shieldRadius);
            if (res) {
                var proximity = res.up.dist_from(p1);
                if (proximity < agent.shieldRadius * 1.5) {
                    collisionList.push(res);
                }
                res.type = it.type; // store type of item                               
                if (!minres || res.ua < minres.ua) {
                    minres = res;
                    if (eyeId === 0 && it.team === targetTeam) {
                        agent.target = it;
                    }
                }
            }
        }
    }
    agent.collisionList = collisionList;
    return minres;
}
//function lineRecatngleIntersect (rect)
//    var p = [-vx, vx, -vy, vy];
//    var q = [x - left, right - x, y - top, bottom - y];
//    var u1 =-999999;
//    var u2 = 999999;

//    for (i in 0...4) {
//        if (p[i] == 0) {
//            if (q[i] < 0)
//                return false;
//        }
//        else {
//            var t = q[i] / p[i];
//            if (p[i] < 0 && u1 < t)
//                u1 = t;
//            else if (p[i] > 0 && u2 > t)
//                u2 = t;
//        }
//    }

//    if (u1 > u2 || u1 > 1 || u1 < 0)
//        return false;

//    collision.x = x + u1*vx;
//    collision.y = y + u1*vy;

//    return true;
//}
function get_line_intersection(p1, p2, p3, p4)
{
    var s1_x, s1_y, s2_x, s2_y;
    s1_x = p2.x - p1.x;     s1_y = p2.y - p1.y;
    s2_x = p4.x - p3.x;     s2_y = p4.y - p3.y;

    s, t;
    var s = (-s1_y * (p1.x - p3.x) + s1_x * (p1.y - p3.y)) / (-s2_x * s1_y + s1_x * s2_y);
    var t = ( s2_x * (p1.y - p3.y) - s2_y * (p1.x - p3.x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
    {
        // Collision detected

        var i_x = p1.x + (t * s1_x);

        var i_y = p1.y + (t * s1_y);
        return { ua: t, ub: s, up: new Vec (i_x, i_y) };
    }
    return null; // No collision
}

// line intersection helper function: does line segment (p1,p2) intersect segment (p3,p4) ?
var line_intersect = function (p1, p2, p3, p4) {
    var denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0.0) { return null; } // parallel lines
    var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
    if (ua > 0.0 && ua < 1.0 && ub > 0.0 && ub < 1.0) {
        var up = new Vec(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
        return { ua: ua, ub: ub, up: up }; // up is intersection point
    }
    return null;
}
var line_point_intersect = function (p1, p2, p0, rad) {
    var v = new Vec(p2.y - p1.y, -(p2.x - p1.x)); // perpendicular vector
    var d = Math.abs((p2.x - p1.x) * (p1.y - p0.y) - (p1.x - p0.x) * (p2.y - p1.y));
    d = d / v.length();
    if (d > rad) { return null; }

    v.normalize();
    v.scale(d);
    var up = v.add(p0);
    if (Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)) {
        var ua = (up.x - p1.x) / (p2.x - p1.x);
    } else {
        var ua = (up.y - p1.y) / (p2.y - p1.y);
    }
    if (ua > 0.0 && ua < 1.0) {
        return { ua: ua, up: up };
    }
    return null;
}

var findBeamCollision = function findBeamCollision(distance, shooter) {
    var currentDistance = distance;
    var target = shooter.victim;
    var hitShip = target;
    target.beamCollisionPoint = target.center;
    shipList.forEach(function (ship) {
        if (ship.dead === true) {
            return;
        }
        var id = ship.id;
        if (id === shooter.id) {
            return;
        }
        var shooterFront = shooter.front;
        var intercepts = interceptOnCircle(shooterFront, target.center, ship.center, ship.shieldRadius);
        if (intercepts === false)
            return;
        intercepts.forEach(function (intercept) {
            var newVector = new vector(intercept.x, intercept.y);
            var newDistance = newVector.subtract(shooterFront).magnitude();
            if (newDistance < currentDistance) {
                currentDistance = newDistance;
                ship.beamCollisionPoint = newVector;
                hitShip = ship;
            }
        });
    });
    return hitShip;
}

function interceptOnCircle(p1, p2, c, r) {
    //p1 is the first line point
    //p2 is the second line point
    //c is the circle's center
    //r is the circle's radius

    var p3 = { x: p1.x - c.x, y: p1.y - c.y }; //shifted line points
    var p4 = { x: p2.x - c.x, y: p2.y - c.y };

    var m = (p4.y - p3.y) / (p4.x - p3.x); //slope of the line
    var b = p3.y - m * p3.x; //y-intercept of line

    var underRadical = Math.pow(r, 2) * Math.pow(m, 2) + Math.pow(r, 2) - Math.pow(b, 2); //the value under the square root sign 

    if (underRadical < 0) {
        //line completely missed
        return false;
    } else {
        var t1 = (-m * b + Math.sqrt(underRadical)) / (Math.pow(m, 2) + 1); //one of the intercept x's
        var t2 = (-m * b - Math.sqrt(underRadical)) / (Math.pow(m, 2) + 1); //other intercept's x
        var i1 = { x: t1 + c.x, y: m * t1 + b + c.y }; //intercept point 1
        var i2 = { x: t2 + c.x, y: m * t2 + b + c.y }; //intercept point 2
        return [i1, i2];
    }
}

var whiteCount = 0;
var greenCount = 0;
var yellowCount = 0;
var blueCount = 0;

function iterateCountText(color, num) {

    if (color == "white") {
        whiteCount = whiteCount + num;
        whiteCountText.attr({ text: whiteCount });// = canvas.text(10, 10, whiteCount);//.attr({ fill: '#FFFFFF' });
    }
    else if (color == "green" || color == 0) {
        greenCount = greenCount + num;
        greenCountText.attr({ text: greenCount });//.attr({ fill: '#00FF00' });
    }
    else if (color == "blue" || color == "purple" || color == 1) {
        blueCount = blueCount + num;
        blueCountText.attr({ text: blueCount });
    }
    else if (color == "yellow" || color == "orange" || color == 2) {
        yellowCount = yellowCount + num;
        yellowCountText.attr({ text: yellowCount });
    }
}
function addAgent(agent) {
    agentList.push(agent);
}

function draw_net(net_canvas, net_ctx) {

    var W = net_canvas.width;
    var H = net_canvas.height;
    net_ctx.font = "12px Verdana";
    net_ctx.fillStyle = "rgb(0,0,0)";
    net_ctx.fillText("Value Function Approximating Neural Network:", 10, 14);
    net_ctx.clearRect(0, 0, W, H);
    var L = agentList[0].brain.layers;
    var dx = (W - 50) / L.length;
    var x = 10;
    var y = 40;

    for (var k = 0; k < L.length; k++) {
        if (typeof (L[k].out_act) === 'undefined') continue; // maybe not yet ready
        var kw = L[k].out_act.w;
        var n = kw.length;
        var dy = (H - 50) / n;
        net_ctx.fillStyle = "rgb(0,0,0)";
        net_ctx.fillText(L[k].layer_type + "(" + n + ")", x, 35);
        for (var q = 0; q < n; q++) {
            var v = Math.floor(kw[q] * 100);
            if (v >= 0) net_ctx.fillStyle = "rgb(0,0," + v + ")";
            if (v < 0) net_ctx.fillStyle = "rgb(" + (-v) + ",0,0)";
            net_ctx.fillRect(x, y, 10, 10);
            y += 12;
            if (y > H - 25) { y = 40; x += 12 };
        }
        x += 50;
        y = 40;
    }
}

function savenet() {
    var j = agentList[0].brain.toJSON();
    var t = JSON.stringify(j);
    document.getElementById('netState').value = t;
}

function loadnet() {
    var t = document.getElementById('netState').value;
    var j = JSON.parse(t);
    agentList[0].brain.fromJSON(j);

}





