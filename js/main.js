"use strict";
// copyright chad mcgrath 2016
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

    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.center = new utilities.vector(parseInt(window.innerWidth/2), parseInt(window.innerHeight/2));

    this.topic = function(name, description, color, shape){
        var topic = this;
        this.id = name,
        this.name = name,       
        this.description = description,
        this.shape = shape,
        this.color = color,
        this.subTopics =[],
        this.callback = null,
        this.ease = "elastic"
        this.topicClick = function (event) {
            //thisPage.rotateTopics(); 
            var subTopics = topic.subTopics;
            var heights = subTopics.map(function (a) { return a.height; });
            var navHeight = heights.reduce((a, b) => a + b, 0);
            var nav = $(".nav-left");
            var navPos = nav.position();
            var dest = new utilities.vector(navPos.left, navPos.top + navHeight);
            nav.animate({height: navHeight }, 500,  
                topic.callback.call(this, [subTopics, topic.shape.node().getBBox(), dest]));       
        }
    }
    this.topics = []
    this.animate = function(){
        if(path.getTotalLength() <= counter){   //break as soon as the total length is reached
            clearInterval(animation);
            return;
        }
        var pos = path.getPointAtLength(counter);   //get the position (see Raphael docs)
        e.attr({cx: pos.x, cy: pos.y});  //set the circle position
    
        counter++; // count the step counter one up
    };
    this.spiral = function(el, r, dr, speed , v, rMax)
    {
        var da = speed * dr/ r *2 * Math.PI;
        var x = 0;

        const totalSteps = rMax + rMax - r;
        const px = parseInt(el.attr("cx"));
        const py= parseInt(el.attr("cy")); 
        const tr = new utilities.vector(px,py);
        const smallR = parseInt(el.attr("r"));

        requestAnimationFrame(function(){
            animateSpiral(el, totalSteps, dr, v, x, da, rMax, smallR);
        });

        function animateSpiral(el, totalSteps, dr, v, x, da, rMax, smallR)
        {
            x = x + dr;
            var d = 0;
            if(x >= rMax)  {
                var stepsDown = x -rMax; 
                d = rMax- stepsDown;
            } else{
                d = x;
            }                
            var angle = v.angle() + da;
            v = new utilities.vector(Math.cos(angle) * d , Math.sin(angle) * d);
            var pos = v.add(tr); 

            var r = 2* rMax - totalSteps;
            var cRad = smallR *(d/r);
            el.attr("r", cRad);
            el.attr("cx", pos.x);
            el.attr("cy", pos.y); 
            if(x >= totalSteps){
                return;
            }
            requestAnimationFrame(function(){
                animateSpiral(el, totalSteps , dr, v, x, da, rMax, smallR);
            });
        }           
    }
    this.orbit = function(bigRadius, count, rotations, time, scaleBig, scaleSmall)
    { 
        var rad = bigRadius *  1;
        var dr = Math.PI / count;
        var center = thisPage.center;
        d3.selectAll(".topicCircle").each(function(d, i){
            var direction =i%2;
            if(direction === 0){
                direction = -1;
            }  
            var addMe = new utilities.vector(Math.cos(dr*i), Math.sin(dr*i)).multiply(rad).multiply(direction);
            var start = center.add(addMe);
            var end = center.subtract(addMe);
            // var c = d3.select(this);
            var c = d3.select(this);
            var circleRad = parseInt(c.attr("r"));
            var small = scaleSmall * circleRad;
            var big = scaleBig * circleRad;
            var mid = (big + small)/2;
            var pathData = [{p:center, s: big, d: 250}, {p:start, s: mid, d: 330}, {p:center, s: small, d: 250}, {p:end, s: mid, d: 250}];
            repeat.call(null, [pathData, rotations, 0]);
            
            function repeat(args) {
                var pathData = args[0],  rotations = args[1], i = args[2];
                ++i;
                var x = i % pathData.length;
                if(i > rotations ){
                    return;
                }
                c
                .transition()
                .duration(200)
                .ease("linear")
                    .attr({
                        'r': pathData[x].s,
                        'cx': pathData[x].p.x,
                        'cy': pathData[x].p.y,                    
                    })
                .each("end", function(){
                    repeat.call(null, [pathData, rotations, i])
                });
                 
                
            }
            
        });
    }
    this.populateTopics = function (bigRadius) {

        var work = new thisPage.topic("Work", "People I've worked with.","blue")
        this.topics.push(work);
        var ai = new thisPage.topic("Simulations", "Some simple machine learning demos.", "orange")
        this.topics.push(ai);
        var likes = new thisPage.topic("Likes", "Some sites I like.", "yellow");
        this.topics.push(likes);
        var qualifications = new thisPage.topic("Qualifications", "Resume and profile link", "green");
        this.topics.push(qualifications);

        for (var i = 0; i < this.topics.length; ++i) {
            const topic = this.topics[i];
            var angle = Math.PI * 2 / this.topics.length * i;
            topic.vector = 
                new utilities.vector(Math.sin(angle) * bigRadius, Math.cos(angle) * bigRadius);
        }       
    }
    this.populateGradients = function(defs, data)
    {

        var radialGradients = defs.selectAll("radialGradient")
            .data(data)
	        .enter().append("radialGradient")
	        .attr("id", function(d){ return "gradient-" + d.id; }) //unique id per planet
	        .attr("cx", "35%")	//Move the x-center location towards the left
	        .attr("cy", "35%")	//Move the y-center location towards the top
	        .attr("r", "60%");	//Increase the size of the "spread" of the gradient
        radialGradients.append("stop")
	        .attr("offset", "0%")
	        .attr("stop-color", function(d) {  return d3.rgb(d.color).brighter(1); });
        //Then the actual color almost halfway
        radialGradients.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", function(d) {  return d.color; }); 
        //Finally a darker color at the outside
        radialGradients.append("stop")
            .attr("offset",  "100%")
            .attr("stop-color", function(d) { return d3.rgb(d.color).darker(3);});
    }
    
    this.createTopicShapes =  function(bigRadius){

                                     
            var radius = this.canvasWidth / 32;
            var x = thisPage.center.x;// + radius;//+ (Math.sin(angle)) * bigRadius;
            var y = thisPage.center.y;// + radius;// + (Math.cos(angle)) * bigRadius;
            var xPadding = 300;
            var yPadding = 30;           
            thisPage.canvas.selectAll("circle")
			.data(thisPage.topics)
			.enter()
			.append("circle")
			.attr("class", function(d){ return "topicCircle"; })
            .attr("id", function(d){ return d.id; })
			.attr({
			    cx: x,
			    cy: y,
			    r: radius,
			    fill: function(d) { return "url(#gradient-" + d.id + ")"; }
			})
            .on("click", function(d){  
                var c = d3.select(this);
                var cx = parseInt(c.attr("cx"));
                var cy = parseInt(c.attr("cy"));
                var center = thisPage.center;
                if(cx == center.x && cy == center.y )
                {
                    thisPage.orbit(bigRadius, thisPage.topics.length, 8, 1000, .40, .04);
                    return;
                }
                d3.selectAll(".topicCircle").each(function(d2, i){  
                    if(d.id != this.id){                        
                        var p = thisPage.center.add(d2.vector);  
                        d3.select(this)
                        .transition()
                        .duration(1500)
                        .ease(d.ease)
                        .attr("cx", p.x)
                        .attr("cy", p.y)
                    }                    
                });
                c
					.transition()
					.duration(500)
					.ease(d.ease)
					.attr("cx", x)
                    .attr("cy", y)
                    .attr("selected", 1)
					//.each("end", function(){
					//    d3.select(this)
					//		.transition()
					//		.delay(500)
					//		.duration(500)
					//		.attr({
					//		    cx: xPadding
					//		})
                //});

			   //d.topicClick(this);
            }) 
        //brittle
            var circles = thisPage.canvas.selectAll(".topicCircle")[0];
            for(var i = 0; i < thisPage.topics.length; ++i)
            {
                const topic = thisPage.topics[i];
                topic.circle = circles[i];
                thisPage.spiral(d3.select(topic.circle), bigRadius, 12, 1, topic.vector.unit(), bigRadius * 2)
            }
        
        function subTopic(name, width, height){
            this.name = name,
            this.height = height
            var shape = thisPage.canvas.append("rect")
                                        .attr("x", 0)
                                        .attr("y", 0)
                                        .attr("width", width)
                                        .attr("heigth", height)
            shape.attr({
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
        var path = "M,"+ ax+","+ ay+ " C"+ax+","+ ay+" "+bx+","+ by +" "+ zx+","+ zy;
        thisPage.canvas.append("svg:path")
            .attr("d", path)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("stroke-opacity", 0.2)
    },
    
    this.openMenu = function(topic)
    {

    }
    this.initialize = new function () {
       
        $(".nav-left").menu();
        thisPage.canvas = d3.select("body").append("svg")
            .attr("width", thisPage.canvasWidth)
            .attr("height", thisPage.canvasHeight);
        var defs = thisPage.canvas.append("defs"); 
        
        var bigRadius = Math.max(thisPage.canvasWidth, thisPage.canvasHeight) / 8; 
        thisPage.populateTopics(bigRadius);
        thisPage.populateGradients(defs, thisPage.topics);
        thisPage.createTopicShapes(bigRadius);

        
        //topics.forEach(function(t){
        //    this.spiral(t.circle, bigRadius, 12, 1, t.vector.unit(), 360)
        //})
        
    }
    
}

var utilities = new utilities();
var windowPage = new page();
//windowPage.initialize();