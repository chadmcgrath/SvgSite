"use strict";
// copyright chad mcgrath 2016
//todo: jslint, minify

var utilities = function () {
    // this transforms a color through from blue to red. it's based soley on rbg values, so doen't really map to light's frequency.
    var colorBleed = function (current, max) {

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
    this.vector = function vector(x, y) {

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
}
var page = function () {
    var thisPage = this;
    var canvas = null;
    var distort = null;
    var mainSvg = null;
    this.loadDistortion = function () {
        var el = document.getElementById('svg');
        thisPage.distort = new DVG(el, DVG.STATIC_INTERPOLATION, 4);
    };
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.changeHeight = function (h) {
        thisPage.mainSvg.attrs({ height: h });
        thisPage.canvas.attrs({ height: h });
        thisPage.canvasHeight = h;
    }
    this.center = new utilities.vector(parseInt(window.innerWidth / 2), parseInt(window.innerHeight / 2));
    this.getRectCenter = function(item, point, scale){
        if(!scale){
            scale = 1;
        }
        var box = item.getBBox();
        var offsetX = parseFloat(box.width)/ 2 * scale;                               
        var offsetY = parseFloat(box.height)/ 2 * scale;                    
        var translate = (point.x - offsetX) + "," + (point.y - offsetY);
        return translate;
    }
    this.topic = function (name, description, color, radius) {
        var topic = this;
        this.id = name,
        this.name = name,
        this.description = description,
        this.shape = null,
        this.color = color,
        this.subTopics = [],
        this.callback = null,
        this.ease = d3.easeElastic,
        this.vector = null,
        this.radius = radius,
        this.topicClick = function (event) {
            //thisPage.rotateTopics(); 
            var subTopics = topic.subTopics;
            var heights = subTopics.map(function (a) { return a.height; });
            var navHeight = heights.reduce((a, b) => a + b, 0);
            var nav = $(".nav-left");
            var navPos = nav.position();
            var dest = new utilities.vector(navPos.left, navPos.top + navHeight);
            nav.animate({ height: navHeight }, 500,
                topic.callback.call(this, [topic, subTopics, dest]));
        }

    }
    this.resetAll = function (topic, duration, setGears) {
        thisPage.changeHeight(window.innerHeight);
        d3.selectAll(".gear").attr("visibility", "visible");
        if (!duration)
            duration = 0;
        var c = thisPage.center;
        var v = topic.vector;

        topic.shape
       .attr("data-selected", 0)
       .attrs({
           cx: c.x,
           cy: c.y,
           r: topic.radius,//function(d) { return r; },
           transform: function () { return "translate(" + v.x + ", " + v.y + ")"; }
       })
            .transition()
            .duration(duration)
            .ease(d3.easeExp)
            .on("end", function () {
                thisPage.popCircle(topic.shape, topic.radius);
            });
        if (setGears) {
            thisPage.setGears(thisPage.gears, setGears, 0);
        }
    }
    this.stretch = function (heightDiff) {
        var newHeight = this.canvasHeight + heightDiff;
        //var stretchGroup = thisPage.canvas.append("g")
        //.attr("id","stretch")
        //.attr("class","stretch")
        //.attr("height", heightDiff);
        thisPage.changeHeight(newHeight);
    }

    this.topics = []
    this.animate = function () {
        if (path.getTotalLength() <= counter) {   //break as soon as the total length is reached
            clearInterval(animation);
            return;
        }
        var pos = path.getPointAtLength(counter);   //get the position (see Raphael docs)
        e.attrs({ cx: pos.x, cy: pos.y });  //set the circle position

        counter++; // count the step counter one up
    };
    this.spiral = function (center, group, rotations, duration) {
        var c = thisPage.center;
        rotations = 360 * rotations;
        var smallRad = 15;
        group.data(thisPage.topics)
            .attr("r", smallRad)          
            .each(cycle);
        var ease = d3.easeExp;
        //var t1 = d3.transition().duration(duration).ease(ease);
        function cycle() {
            var g = d3.select(this);
            var circle = g.select("circle");
            g
                .transition()
                .duration(duration)
                .ease(d3.easeExp)
                .attr("r", function (d) { return d.radius })
                .attrTween("transform", function (d) {
                    var s1 = "rotate(0, " + c.x + ", " + c.y + ") translate(0, 0)";
                    var s2 = "rotate(" + rotations + ", " + c.x + ", " + c.y + ") translate(" + d.vector.x + ", " + d.vector.y + ")";
                    return d3.interpolateString(s1, s2);
                });
            circle.attr("r", smallRad)
                .transition()
                .duration(duration)
                .ease(d3.easeExp)
                .attr("r", function (d) { 
                    return d.radius ;
                })
                .on("end", function(d){
                    thisPage.popCircle(circle, circle.attr("r"));
                });
                
            }
       
    }  
    this.popCircle = function (el, r) {
        var el = el.transition()
					.duration(100)
					.attr("r", r * 1.5)
					.transition()
					.duration(50)
					.attr("r", r)
        //.ease(d3.easeBounce)
    }
    this.orbit = function (bigRadius, count, rotations, time, scaleBig, scaleSmall) {
        var rad = bigRadius * 1;
        var dr = Math.PI / count;
        var center = thisPage.center;

        d3.selectAll(".topicCircle")
            .each(function (d, i) {

                var direction = i % 2;
                if (direction === 0) {
                    direction = -1;
                }
                var addMe = new utilities.vector(Math.cos(dr * i), Math.sin(dr * i)).multiply(rad).multiply(direction);
                var start = center.add(addMe);
                var end = center.subtract(addMe);

                var c = d3.select(this);
                var circleRad = parseInt(c.attr("r"));
                var small = scaleSmall * circleRad;
                var big = scaleBig * circleRad;
                var mid = (big + small) / 2;
                var pathData = [{ p: start, s: mid, d: 250, e: "exp" }, { p: center, s: small, d: 150, e: "linear" }
                   , { p: end, s: mid, d: 250, e: "exp" }, { p: center, s: big, d: 150, e: "linear" }];
                c
                .transition()
                .duration(0)
                .attrs({ "transform": "translate(0, 0)" })
                .each(function () {
                    repeat(pathData, rotations, 0);
                });

                function repeat(pathData, rotations, i) {

                    var delay = 0;

                    var x = i % pathData.length;
                    ++i;
                    //var isCentering = i%2;
                    var p = pathData[x];
                    if (i > rotations) {
                        thisPage.resetAll(c.data()[0]);
                        return;
                    } else if (i === 1) {
                        delay = Math.random() * 300;
                    }
                    c.transition()
                    .delay(delay)
                    .duration(p.d)
                    .ease(d3.easeLinear)
                        //.attrs({"transform" : "translate(" + p.p.x + "," + p.p.y + ")"})
                        .attrs({
                            'r': p.s,
                            'cx': p.p.x,
                            'cy': p.p.y,
                        })
                    .on("end", function () {
                        repeat(pathData, rotations, i);

                    });
                }
            });
    }
    this.populateTopics = function (bigRadius, radius) {

        var work = new thisPage.topic("Work", "People I've worked with.", "navy", radius);
        work.callback = this.dropToPage;
        this.topics.push(work);

        var ai = new thisPage.topic("Simulations", "Some simple machine learning demos.", "#FF5000", radius);
        ai.callback = thisPage.superNova;
        this.topics.push(ai);

        //var likes = new thisPage.topic("Likes", "Some sites I like.", "#2170589", radius);
        //likes.callback = thisPage.throwItems;
        //this.topics.push(likes);

        var likes = new thisPage.topic("Likes", "Some sites I like.", "#FFBF00", radius);
        likes.callback = thisPage.throwItems;
        this.topics.push(likes);

        var qualifications = new thisPage.topic("Qualifications", "Resume and profile link.", "#265C00", radius);
        qualifications.callback = thisPage.throwItems;
        this.topics.push(qualifications);

        var about = new thisPage.topic("About", "About this website.", "maroon", radius);
        about.callback = thisPage.throwItems;
        this.topics.push(about);

        for (var i = 0; i < this.topics.length; ++i) {
            const topic = this.topics[i];
            var angle = Math.PI * 2 / this.topics.length * i;
            topic.vector =
                new utilities.vector(Math.sin(angle) * bigRadius, -1 * Math.cos(angle) * bigRadius);
        }
    }
    this.populateGradients = function (defs, data) {

        var radialGradients = defs.selectAll("radialGradient")
            .data(data)
	        .enter().append("radialGradient")
	        .attr("id", function (d) { return "gradient-" + d.id; }) //unique id per planet
	        .attr("cx", "35%")	//Move the x-center location towards the left
	        .attr("cy", "35%")	//Move the y-center location towards the top
	        .attr("r", "60%");	//Increase the size of the "spread" of the gradient
        radialGradients.append("stop")
	        .attr("offset", "0%")
	        .attr("stop-color", function (d) { return d3.rgb(d.color).brighter(1); });
        //Then the actual color almost halfway
        radialGradients.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", function (d) { return d.color; });
        //Finally a darker color at the outside
        radialGradients.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", function (d) { return d3.rgb(d.color).darker(3); });

        var sunGradient = defs.append("radialGradient")
        .attr("id", "sun-gradient")
        .attr("cx", "50%")    //The x-center of the gradient, same as a typical SVG circle
        .attr("cy", "50%")    //The y-center of the gradient
        .attr("r", "50%");   //The
        sunGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#FFF76B");
        sunGradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#FFF845");
        sunGradient.append("stop")
            .attr("offset", "75%")
            .attr("stop-color", "#FFDA4E");
        sunGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#FB8933");

        var blackHoleGradient = defs.append("radialGradient")
       .attr("id", "blackhole-gradient")
        .attr("cx", "50%")    //The x-center of the gradient, same as a typical SVG circle
        .attr("cy", "50%")    //The y-center of the gradient
        .attr("r", "50%");   //The
        blackHoleGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "black");
        blackHoleGradient.append("stop")
        .attr("offset", "96%")
        .attr("stop-color", "black");
       
        blackHoleGradient.append("stop")
            .attr("offset", "96%")
            .attr("stop-color", "red");
        blackHoleGradient.append("stop")
            .attr("offset", "98%")
            .attr("stop-color", "white");
       

        var pageGradient = defs.append("radialGradient")
        .attr("id", "page-gradient")
        .attr("cx", "50%")    //The x-center of the gradient, same as a typical SVG circle
        .attr("cy", "50%")    //The y-center of the gradient
        .attr("r", "30%");   //The

        sunGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#FFF76B");
        sunGradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#FFF845");
        sunGradient.append("stop")
            .attr("offset", "90%")
            .attr("stop-color", "#FFDA4E");
        sunGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#FB8933");
    }
    this.globeSwallow = function () {
        var sphere = thisPage.sphere;
    }
    this.dropToPage = function (args) {
        var topic = args[0], subTopics = args[1], topics = thisPage.topics;
        getSubTopics();
        var duration = 750;
        var originalHeight = thisPage.canvasHeight;
        thisPage.stretch(originalHeight);
        var ease = d3.easeBounce;

        d3.selectAll(".topicCircle").each(function (d, i) {
            var delay = Math.random() * 400;
            if (this.id == topic.Id) {
                delay = 0;
            }
            scroll(document.body.getBoundingClientRect().height - window.innerHeight, ease);
            var v = d.vector;
            var translate = v.x + ", " + (thisPage.canvasHeight * .75 - d.radius);

            d3.select(this)
                .transition()
                .delay(delay)
                .duration(duration)
                .ease(ease)
                .attrs({ "transform": "translate(" + translate + ")" })
                .attr("data-selected", 0)
                .transition()
                .delay(1000)
            .on("end", function () {
                var resetSpeed = 250;
                scroll(document.body.getBoundingClientRect().height - window.innerHeight, d3.easeExp);
                thisPage.resetAll(d, duration, true);
                d3.selectAll(".gear").attr("visibility", "hidden");
            });

        });
        function scroll(y, e) {
            d3.transition()
           .delay(0)
           .duration(duration)
                .ease(e)
           .tween("scroll", scrollTween(y))

            function scrollTween(offset) {
                return function () {
                    var i = d3.interpolateNumber(window.pageYOffset || document.documentElement.scrollTop, offset);
                    return function (t) { scrollTo(0, i(t)); };
                };
            }
        }

        function getSubTopics() {

            var workTopic = function (name, link, image) {
                this.name = name;
                this.link = link;
                this.image = image;
            }
            var list = [];
            var folder = "img\\logos\\";

            //list.push(new workTopic("allergan"));
            //list.push(new workTopic("cme"));
            list.push(new workTopic("doe"));
            //list.push(new workTopic("kfc"));
            //list.push(new workTopic("tacobell"));
            //list.push(new workTopic("latisse"));
            //list.push(new workTopic("mnr"));
            //list.push(new workTopic("natrelle"));
            //list.push(new workTopic("nissan"));
            //list.push(new workTopic("shell"));
            //list.push(new workTopic("telegraph"));
            //list.push(new workTopic("ipc"));

            var imgs = thisPage.canvas.selectAll("image").data(list);
            imgs.enter()
            .append("svg:image")
            .attr("xlink:href", function (d) { return folder + d.name + ".jpg" })
                .attr("x", "60")
                .attr("y", "60")
            .attr("width", "200")
            .attr("height", "200");
        }

        //function getSubTopics(){
        //    var folder ="img/logos/";           
        //    $.ajax({
        //        url : folder,
        //        success: function (data) {
        //            $(data).find("a").attr("href", function (i, val) {
        //                if( val.match(/\.(jpe?g|png|gif)$/) ) { 
        //                    var imgs = svg.selectAll("image").data([0]);
        //                    imgs.enter()
        //                    .append("svg:image")
        //                    .attr("xlink:href", folder + d)
        //                        .attr("x", "60")
        //                        .attr("y", "60")
        //                        .attr("width", "20")
        //                        .attr("height", "20");
        //                }
        //            })
        //        }
        //    });
        //}
    }

    this.blackHole = function (args) {
        //$(".sphere-rotating").hide();
        var expandDuration = 800;
        thisPage.gearTimer.stop();
        var t = args[0];
        var c = thisPage.center;
        var scale = .1;
        var items = d3.selectAll("g").filter(function (d, i)
        { 
            var g = $(this);
            return g.hasClass("gear") || g.hasClass("sphere-rotating") || g.hasClass("circle-container")});
        // && this.id != "topicCircles" });
        
        
        items.each(function (d, i) {
            var x, y;
            var item = d3.select(this);
            var translate = c.x + "," + c.y;
           
            x = item.attr("cx");
            y = item.attr("cy");
            if(x){
                var factor  = scale -1;
                translate = (-1*c.x *factor ) + "," + (-1 *c.y * factor );
            }
            //var translate = thisPage.getRectCenter(this, c, scale);
            item.transition()
            .duration(expandDuration)
            .ease(d3.easeLinear)
             .attrs({ "transform": "translate(" + translate + ") scale(" + scale + ") " })
            
            //.each("end", function(){thisPage.wormHole.call(this, args);});	
        });
        var expandRad = Math.min(thisPage.canvasWidth / 2, thisPage.canvasHeight / 2);

        var blackCircle = thisPage.mainSvg.append("circle")
            .attrs({
                id : "blackhole",
                cx: c.x,
                cy: c.y,
                fill: "url(#blackhole-gradient)" 
            })
        .transition()
        .duration(expandDuration)
        .ease(d3.easeExp)
        .attrs({ r: expandRad })
            
        .on("end", function () {

            //thisPage.warpField(thisTopic, expandDuration * 3, expandRad);
            //thisPage.launchImages(this.blackHole, expandDuration * 3, expandRad);

        });
        //var thisTopic = null;
        //topics.each(function (d, i) {
        //    var expandRad = Math.min(thisPage.canvasWidth / 2, thisPage.canvasHeight / 2);
        //    var translate = 0 + "," + 0;
        //    if (t.id === d.id) {

        //        thisTopic = d3.select(this);
        //        thisTopic
        //        .transition()
        //        .duration(expandDuration)
        //        .ease(d3.easeExp)
        //        .attrs({ "transform": "translate(" + translate + ")", r: expandRad })
        //        return;
        //    }
        //    var rad = d.radius * scale;
        //    var el = d3.select(this);

        //    //var translate = -this.vector.x + "," + -this.vector.x;
        //    el
        //    .transition()
        //    .delay(300)
        //    .duration(650)
        //    .ease(d3.easeExp)
        //    .attrs({ "transform": "translate(" + translate + ")", r: rad })
            
        //    //"transform" : "translate(" + c.x + "," + c.y + ")"});

        //});


        ////Gear.updateGears(thisPage.gears);


    }
    this.warpField = function (el, duration) {
        http://www.kevs3d.co.uk/dev/warpfield/     
        // requestAnimFrame shim
            window.requestAnimFrame = (function () {
                return window.requestAnimationFrame ||
                        window.webkitRequestAnimationFrame ||
                        window.mozRequestAnimationFrame ||
                        window.oRequestAnimationFrame ||
                        window.msRequestAnimationFrame ||
                        function (callback) {
                            window.setTimeout(callback);
                        };
            })();


        var G = thisPage.mainSvg;
        var canvas = thisPage.mainSvg;
        var width = thisPage.canvasWidth;
        var height = thisPage.canvasHeight;
        var c = thisPage.center;
        var mousex = c.x, mousey = c.y;
        // setup aliases
        var Rnd = Math.random,
            Sin = Math.sin,
            Floor = Math.floor;

        // constants and storage for objects that represent star positions
        var warpZ = 12,
            units = 500,
            stars = [],
            cycle = 0,
            Z = 0.025 + (1 / 25 * 2);


        // function to reset a star object
        function resetstar(a) {
            a.x = (Rnd() * width - (width * 0.5)) * warpZ;
            a.y = (Rnd() * height - (height * 0.5)) * warpZ;
            a.z = warpZ;
            a.px = 0;
            a.py = 0;
        }

        // initial star setup
        for (var i = 0, n; i < units; i++) {
            n = {};
            resetstar(n);
            stars.push(n);
        }

        // star rendering anim function
        var rf = function (items) {
            // clear background


            //mouse position to head towards
            var cx = (mousex - width / 2) + (width / 2),
                cy = (mousey - height / 2) + (height / 2);

            // update all stars
            var sat = Floor(Z * 500);       // Z range 0.01 -> 0.5
            if (sat > 100) sat = 100;
            for (var i = 0; i < units; i++) {
                var n = stars[i],            // the star
                    xx = n.x / n.z,          // star position
                    yy = n.y / n.z,
                    e = (1.0 / n.z + 1) * 2;   // size i.e. z

                if (n.px !== 0) {
                    if (!n.line) {
                        n.line = canvas.append("line");
                    }
                    n.line
                                    .attr("x1", xx + cx)
                                    .attr("y1", yy + cy)
                                     .attr("x2", n.px + cx)
                                     .attr("y2", n.py + cy)
                .attr('stroke-width', function (d) { return e })
            .attr("stroke", "hsl(" + ((cycle * i) % 360) + "," + sat + "%,80%)")
            .attr('opacity', function (d) { return .5 });

                    // hsl colour from a sine wave
                }
                Z += 1 / 100000;
                // update star position values with new settings
                n.px = xx;
                n.py = yy;
                n.z -= Z;

                // reset when star is out of the view field
                if (n.z < Z || n.px > width || n.py > height) {
                    resetstar(n);
                }
            }
            // colour cycle sinewave rotation
            cycle += 0.01;

        };
        var timer = d3.timer(function (elapsed) {


            rf();
            if (elapsed > duration) {
                timer.stop();
            }
        });

    }
    this.launchImages = function (el, duration) {

        var c = thisPage.center;
        var matts = {
            images: ["sadMatthew.jpg"],// "spaceMatthew.jpg", "sexyMatthew.jpg"],
            sent: false,
            delay: 0,
            scale: 1000,
            vector: new utilities.vector(c.x - 1000 / 2, c.y - 1000 / 2),
            duration: 1000
        };
        var socks = {
            images: ["sock3.png", "sock2.png", "sock.png"],
            sent: false,
            delay: 0,
            vector: null,
            scale: 500,
            duration: 500
        };
        var misc = {
            images: ["illuminati.png", "cthulu.png", "tardis.jpg"],
            sent: false,
            delay: 0,
            vector: null,
            scale: thisPage.canvasWidth / 5,
            duration: 500
        };
        var imageSet = [misc, socks, matts];
        //var imageSet = matts.images.concat(socks.images.concat(misc.images));
        launchImages(imageSet, 0, 300);

        function launchImages(itemSet, iterator, delay, total) {
            var items = itemSet[iterator];

            var scale = items.scale;

            //items.sent = true;
            var images = items.images;
            //var images = itemSet;
            var count = images.length;
            var folder = "img\\blackhole\\";
            var imgs = thisPage.mainSvg.selectAll("image")
                .data(images, function (d) { return d; });
            imgs.enter()
                .append("svg:image")
            .attr("xlink:href", function (d) { return folder + d })
                .transition()
        .delay(delay)
                .attr("x", c.x)
                .attr("y", c.y)
            .attr("width", "10")
            .attr("height", "10")
            .transition()
             .duration(function (d) {
                 if (items.duration) {
                     return items.duration;
                 }
                 return duration / 5;
             })
             .ease(d3.easeLinear)
                //.attr("transform", function(d) {
                //    var angle = i * Math.PI * 2 / count;
                //    var mag1 = thisPage.canvasWidth / 2.5;
                //    var mag2 = thisPage.canvasHeight / 2.5;
                //    var v = c.add(new utilities.vector(mag1 * Math.sin(angle) - scale/2, mag2 * Math.cos(angle)- scale/2));
                //    //return "rotate(180,"+c.x+","+c.y+") translate(" + v.x + ", " + v.y+ ")"
                //    return "translate(" + v.x + ", " + v.y+ ")"
                //})      
                .attr("x", function (d, i) {
                    var angle = i * Math.PI * 2 / count;
                    var mag = thisPage.canvasWidth / 2.5;
                    var v = c.add(new utilities.vector(mag * Math.sin(angle) - scale / 2, mag * Math.cos(angle) - scale / 2));
                    if (items.vector)
                        v = items.vector;
                    return v.x
                })
                .attr("y", function (d, i) {
                    var angle = i * Math.PI * 2 / count;
                    var mag = thisPage.canvasHeight / 2.5;
                    var v = c.add(new utilities.vector(mag * Math.sin(angle) - scale / 2, -1.2 * mag * Math.cos(angle) - scale / 2))
                    if (items.vector)
                        v = items.vector;
                    return v.y
                })
            .attr("width", scale)
            .attr("height", scale)
            .on("end", function () {
                ++iterator;
                if (itemSet[iterator]) {
                    launchImages(itemSet, iterator, 0);
                }
                else {
                    //open likes
                }
                imgs.transition()

                .attr("opacity", 0)
                .remove();
            });
        }
        //function endall(transition, callback) { 
        //    var n = 0; 
        //    transition 
        //        .each(function() { ++n; }) 
        //        .each("end", function() { if (!--n) callback.apply(this, arguments); }); 
        //} 


    }
    this.superNova = function (args) {
        //thisPage.loadDistortion();
        var t = args[0];
        var c = t.shape;
        var r = t.radius / 2;
        c
            .transition()
            .duration(500)
            .ease(d3.easeExp)

            .attrs({
                fill: "url(#sun-gradient)",
                r: (t.radius * 10)
            })
            .transition()
            .duration(100)
            .ease(d3.easeExp)
            .attrs({
                fill: "white",
                r: thisPage.canvasWidth
            })
            .transition()
            .duration(300)
            .ease(d3.easeExp)
            .attrs({
                fill: "black",
                r: r
            })
            .on("end", function () {
                //        var foreign = d3.select("#Simulations").append("foreignObject")
                //    .attr("id", "foreignobject")
                //.attr("width", thisPage.canvasWidth)
                //.attr("height", thisPage.canvasHeight);
                //        var div = foreign.append("div").attr("id", "starfield")
                //        .attr("width", thisPage.canvasWidth)
                //        .attr("height", thisPage.canvasHeight);
                //        $("#foreignobject").starfield({ starDensity: 1.0, mouseScale: 1.0 });
                thisPage.blackHole.call(this, args);
            });

    }
    this.isWithinBox = function (el, p) {
        if (el.left <= p.x && el.right > p.x && el.top <= p.y && el.bottom >= p.y)
            return true;
        return false;
    }
    this.createTopicShapes = function (bigRadius, radius) {


        var x = thisPage.center.x;// + radius;//+ (Math.sin(angle)) * bigRadius;
        var y = thisPage.center.y;// + radius;// + (Math.cos(angle)) * bigRadius;
        var xPadding = 300;
        var yPadding = 30;
        var translate = x + "," + y;
        var container = 
        thisPage.mainSvg.append("g")

            .attr("id", "topicCircles")
            .selectAll("circle")
        .data(thisPage.topics)
        .enter()
        ;
       
        var g = container.append("g")
        .attr("id", function (d) { return "container-" + d.id; })
        .attr("class", "circle-container")
        .attr("data-selected", 0)
        .attrs({
            cx: x,
            cy: y,
            r: radius,
            transform: function (d) { return "translate(" + d.vector.x + ", " + d.vector.y + ")"; }
        });

        g.attr("data-selected", 0)
        .append("circle")
        .attr("class", function (d) { return "topicCircle"; })
        .attr("id", function (d) { return "topic-" + d.id; })       
        .attrs({
            cx: x,
            cy: y,
            r: radius,
            fill: function (d) { return "url(#gradient-" + d.id + ")"; },
           
        })
        ;g
        .on("click", function (d) {
            var c = d3.select(this);

            var center = thisPage.center;
            if (c.attr("data-selected") == 1) {
               
                thisPage.orbit(bigRadius, thisPage.topics.length, 8, 1000, .60, .04);
                return;
            }
            d3.selectAll(".circle-container").each(function (d2, i) {
                if (d.id != this.id) {
                    var p = d2.vector;
                    var translate = p.x + "," + p.y;
                    d3.select(this)
                    .transition()
                    .duration(1500)
                    .ease(d2.ease)
                    .attrs({ "transform": "translate(" + translate + ")" })
                    .attr("data-selected", 0)

                }
            });
            var translate = 0 + "," + 0;
            c
                .transition()
                .duration(250)
                .ease(d.ease)
                .attrs({ "transform": "translate(" + translate + ")" })
                .attr("data-selected", 1)
				.on("end", d.topicClick);
        })
        ;g 
        .append("text")
            .text(function (d) { return d.name; })
            .attrs({
                x: x,
                y: y,
                stroke: "white",
                dy: "6em",
                "text-anchor" : "middle"
                //text: (function (d) { return d.name; })
                //r: radius,
                //fill: function(d) { return "url(#gradient-" + d.id + ")"; },
                //transform : function(d) {return "translate(" + d.vector.x + ", " + d.vector.y+ ")";}
            })

        //brittle
        var circles = thisPage.mainSvg.selectAll(".topicCircle");
        var nodes = circles.nodes();
        var count = thisPage.topics.length;

        for (var i = 0; i < count; ++i) {
            const topic = thisPage.topics[i];
            topic.shape = d3.select(nodes[i]);

        }
        thisPage.spiral(thisPage.center, d3.selectAll(".circle-container"), 1, 1500);

        function subTopic(name, width, height) {
            this.name = name,
            this.height = height
            var shape = thisPage.canvas.append("rect")
                                        .attr("x", 0)
                                        .attr("y", 0)
                                        .attr("width", width)
                                        .attr("heigth", height)
            shape.attrs({
                stroke: 'darkblue',
                'stroke-width': 3,
                fill: 'silver'
            });
        }
        function getSubTopics(i, topic) {
            if (i === 0) {
                var h = 10;
                var w = 50;
                var a = new subTopic("TacoBell", w, h);
                var b = new subTopic("KFC", w, h);
                var c = new subTopic("Allargan", w, h);
                var d = new subTopic("Latisse", w, h);
                return [a, b, c, d];
            }
            return [];
        }
    }
    this.throwItems = function (args) {
        return;
        var items = args[0];
        var start = args[1];
        var destination = args[2];
        for (var i = 0; i < items.length; ++i) {
            var item = items[i];
            var newDestination = destination;
            if (i != 0) {
                newDestination.y = ++item.height;
            }
            var curve = thisPage.curve(start.x, start.y, 500, -500, newDestination.x, newDestination.y, "red");
        }
    }
    this.curve = function (ax, ay, bx, by, zx, zy, color) {
        var path = "M," + ax + "," + ay + " C" + ax + "," + ay + " " + bx + "," + by + " " + zx + "," + zy;
        thisPage.canvas.append("svg:path")
            .attr("d", path)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("stroke-opacity", 0.2)
    },
    this.openMenu = function (topic) {

    }
    this.createGears = function (bigRadius, topicRadius) {
        var radius = bigRadius + topicRadius / 2;
        var gear1 = Gear.create(thisPage.gearGroup, {
            radius: radius,
            teeth: radius / 4,
            x: thisPage.center.x,
            y: thisPage.center.y,
            holeRadius: bigRadius - topicRadius / 2,
            addendum: 8,
            dedendum: 3,
            thickness: .6,
            profileSlope: .5,
            speed: .01,
        });
        var gears = [gear1];
        Gear.setPower(gear1, 0.01);

        var options = {
            radius: 16,
            holeRadius: 0.4,
            transition: true,
            speed: 0.01,
            autoShuffle: false,
            number: thisPage.canvasWidth * 3 / 200,
            addendum: 8,
            dedendum: 3,
            thickness: 0.6,
            profileSlope: 0.5
        };

        var gearFactors = [64, 64, 96, 96, 96, 96, 112, 256];
        var holeRadius,
            teeth,
            radius,
            factor,
            newGear,
            innerRadius;

        //_gearStyles = Gear.Utility.arrayShuffle(_gearStyles);

        for (var i = 0; i < options.number; i++) {
            factor = gearFactors[i % gearFactors.length];
            radius = factor / 2;
            teeth = radius / 4;
            innerRadius = radius - options.addendum - options.dedendum;
            holeRadius = factor > 96 ? innerRadius * 0.5 + innerRadius * 0.5 * options.holeRadius : innerRadius * options.holeRadius;

            gears.push(newGear = Gear.create(thisPage.gearGroup, {
                radius: radius,
                teeth: teeth,
                x: 0,
                y: 0,
                holeRadius: holeRadius,
                addendum: options.addendum,
                dedendum: options.dedendum,
                thickness: options.thickness,
                profileSlope: options.profileSlope
            }));

            //newGear.call(_dragBehaviour);
            //gear1.classed("silv", true);
        }

        return gears;
    }
    this.setGears = function (gears, transition, duration) {
        var placed = gears[0];

        //gears = Gear.Utility.arrayShuffle(gears);
        Gear.randomArrange(gears, thisPage.center.x, thisPage.center.y, null, null, [placed]);
        Gear.setPower(gears[0], 0.01);
        //Gear.updateGears(gears);


        thisPage.gearGroup.selectAll('.gear')
            .each(function (d, i) {
                if (transition) {
                    d3.select(this)
                        .transition()
                        .ease(d3.easeElastic)
                        .delay(i * 80 + Math.random() * 80)
                        .duration(duration)
                        .attr('transform', function (d) {
                            return 'translate(' + [d.x, d.y] + ')';
                        });
                } else {
                    d3.select(this)
                        .attr('transform', function (d) {
                            return 'translate(' + [d.x, d.y] + ')';
                        });
                }
            });
    }
    this.startGears = function (gears) {
        thisPage.gearTimer = d3.timer(function () {
            thisPage.gearGroup.selectAll('.gear-path')
                .attr('transform', function (d) {
                    d.angle += d.speed;
                    return 'rotate(' + d.angle * (180 / Math.PI) + ')';
                });
        });
        Gear.updateGears(gears);
    }

    this.createSphere = function (id, x, y, scale, vx, vy, vz, rx, ry, rz, hasGrat, fill) {
        var rotate = [rx, ry, rz],
        time = Date.now(),
        svg = thisPage.mainSvg;
        self = this;

        this.velocity = [vx, vy, vz];
        this.scale = scale;
        this.projection = d3.geoOrthographic()
            .scale(scale)
            .translate([x, y])
            .clipAngle(160)
            .precision(.3);

        var projection = this.projection;
        var path = d3.geoPath()
            .projection(projection);
        var graticule = d3.geoGraticule();

        var g = svg.append("g")
        .attr("class", "sphere-rotating")
        .attr("id", "sphere-rotating-" + id)
        .attrs({
            cx: x,
            cy: y
           
        });

        g.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "sphere")
            .attr("d", path)
        .attr("fill", fill);;
        if (hasGrat) {

            g.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path);
        }
        this.strokeWdith = 8;
        g.append("path")
            .datum({ type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] })
            .attr("class", "equator")
            .attr("stroke-width", this.strokeWdith)
            .attr("d", path);

        var sphere = svg.selectAll("#sphere-rotating-" + id + " path");
        this.tick = function () {
            var velocity = self.velocity;
            var dt = Date.now() - time;
            projection.rotate([rotate[0] + velocity[0] * dt, rotate[1] + velocity[1] * dt, rotate[2] + velocity[2] * dt]);
            sphere.attr("d", path);
        }

        return this;
    }
    this.createRings = function (c, fill) {
        var s = [];

        var sphere1 = new thisPage.createSphere(1, c.x, c.y, 1000, 0, .15, 0,
        0, 0, 90, false, fill);

        var sphere2 = new thisPage.createSphere(2, c.x, c.y, 1000, 0, .15, 0,
        0, 0, 135, false, fill);
        var sphere3 = new thisPage.createSphere(3, c.x, c.y, 1000, 0, .15, 0,
            0, 0, 0, false, fill);

        s.push(sphere1);
        s.push(sphere2);
        s.push(sphere3);
        return s;
    }
    this.rings = function (c, topicRad, bigRad, fill) {

        var spheres = thisPage.createRings(c, fill);
        d3.selectAll(".sphere-rotating").data(spheres)
            .each(function (d, i) {

                var ring = d3.select(this);
                var scale = (bigRad - topicRad) * 5 - 6;
                var speed = Math.max.apply(null, d.velocity);
                var startingVelocity = d.velocity.slice(0);
                ring
                .transition()
                .duration(1000)
                .ease(d3.easeLinear)
                .tween("scaleChange", function () {
                    var i = d3.interpolate(scale, scale / 5);
                    return function (t) {

                        d.projection.scale(i(t));
                    };

                })
                //.transition()
                //.delay(200)
                //.duration(1000)
                //.ease(d3.easeExpIn)
                //.tween("rotationSpeed", function() {

                //    var i = d3.interpolateNumber(speed, speed * 5);

                //    return function(t) {
                //        console.log(t);
                //        console.log("---"+i(t))
                //        var res = i(t);
                //        var newV = startingVelocity.map(function(x) { if(x) {return res;}else {return 0}; });
                //        d.velocity = newV;
                //    };

                // });


            });

        var timer = d3.timer(function () {
            spheres.forEach(function (s, i) {
                s.tick();
            });
        });

        //d3.selectAll(".gear").attr("visibility", "hidden");
    }
    this.initialize = new function () {

        var c = thisPage.center;
        $(".nav-left").menu();
        thisPage.mainSvg = d3.select("body").append("svg")
            .attr("id", "svg")
            .attr("width", thisPage.canvasWidth)
            .attr("height", thisPage.canvasHeight);
        var defs = thisPage.mainSvg.append("defs");
        thisPage.canvas = thisPage.mainSvg.append("g").attrs({ id: "mainGroup" });
        thisPage.likes = thisPage.mainSvg.append("g").attrs({ id: "likesGroup" });
        thisPage.gearGroup = thisPage.mainSvg.append("g").attrs({ id: "gearGroup" });

        var bigRadius = Math.round(Math.min(thisPage.canvasWidth, thisPage.canvasHeight) / 3);
        var topicRadius = Math.round(bigRadius / 4);

        var gears = thisPage.createGears(bigRadius, topicRadius);
        thisPage.setGears(gears, true, 800);
        thisPage.startGears(gears);
        thisPage.populateTopics(bigRadius, topicRadius);
        thisPage.populateGradients(defs, thisPage.topics);
       
        thisPage.createTopicShapes(bigRadius, topicRadius);
        thisPage.rings(c, topicRadius, bigRadius, "blue");

        thisPage.gears = gears;
    }

}
var utilities = new utilities();
var windowPage = new page();
//windowPage.initialize();