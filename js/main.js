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
    this.loadDistortion = function() {
        var el = document.getElementById('svg');
        thisPage.distort = new DVG(el, DVG.STATIC_INTERPOLATION, 4);           
    };
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.changeHeight = function(h){
        thisPage.mainSvg.attr({height : h});
        thisPage.canvas.attr({height : h});
        thisPage.canvasHeight = h;
    }
    this.center = new utilities.vector(parseInt(window.innerWidth/2), parseInt(window.innerHeight/2));
    this.topic = function(name, description, color, radius){
        var topic = this;
        this.id = name,
        this.name = name,       
        this.description = description,
        this.shape = null,
        this.color = color,
        this.subTopics =[],
        this.callback = null,
        this.ease = "elastic",
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
            nav.animate({height: navHeight }, 500,  
                topic.callback.call(this, [topic, subTopics, dest]));       
        }
        
    }
    this.resetAll = function(topic, duration, setGears){
        thisPage.changeHeight(window.innerHeight);
        d3.selectAll(".gear").attr("visibility", "visible");
        if(!duration)
            duration = 0;
        var c = thisPage.center;
        var v = topic.vector;
        
        topic.shape
            .transition()
            .duration(duration)
            .ease("exp")
            .each("end", function(){
                thisPage.popCircle(topic.shape, topic.radius);
        })
       .attr("data-selected", 0)           
       .attr({
           cx: c.x,
           cy: c.y,                    
           r:  topic.radius,//function(d) { return r; },
           transform : function() {return "translate(" + v.x + ", " + v.y+ ")";}    
       });
        if(setGears){
            thisPage.setGears(thisPage.gears, setGears, 0);
        }
    }
    this.stretch = function(heightDiff){
        var newHeight = this.canvasHeight + heightDiff;
        //var stretchGroup = thisPage.canvas.append("g")
        //.attr("id","stretch")
        //.attr("class","stretch")
        //.attr("height", heightDiff);
        thisPage.changeHeight(newHeight);
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
    this.spiralNEW = function(group){
        var c = thisPage.center ;                 
        //var p = d.vector.unit(); 
        var rotate = 360 + "," +c.x+ "," + c.y;

        group.data(thisPage.topics).attr(
            "transform" , function(d) {return "translate(" + d.vector.unit().x + ", " + d.vector.unit().y+ ")";}),
            group.attr("r", 10)
        .transition()
                .duration(1000)
                .ease("exp")
                //.attr({r : d.radius})
                .attr("transform" , function(d) {return "rotate("+rotate+") translate(" + d.vector.x + ", " +d.vector.y+ ")"});
     
    }
    this.spiral = function(begin, topic, r, dr, rotations , v, rMax, delay, isExponential, i)
    {
        var el = topic.shape;
        //isExponential = false;
        el.attr("transform", "translate("+(-v.x)+","+ (-v.y)+")");
        var x = 0, i = 0;
       
        var totalStepRadii = rMax + rMax - r;
        var loopCount = totalStepRadii/ dr;
        
        var da = dr/ totalStepRadii * 2 *  Math.PI * rotations;  
        if(isExponential === true){
            dr = totalStepRadii/Math.pow(loopCount,2);
            da = totalStepRadii/Math.pow(loopCount,2) * rotations;
        }
        const px = parseInt(begin.x);
        const py= parseInt(begin.y); 
        const smallR = parseInt(el.attr("r"));
        const tr = new utilities.vector(px, py);
       
        
        requestAnimationFrame(function(){
            
            animateSpiral(i, topic, r, dr, v, x, da, rMax, smallR, totalStepRadii, isExponential); 
           
        });

        function animateSpiral(i, topic, restRadius, dr, v, x, da, rMax, smallR, loopCount, isExponential)
        {
            var el = topic.shape;
            ++ i;
            x = x + dr;
            var angle = v.angle() + da;
            var virtualRadius = x;
            var radius = x;
            if(isExponential){
                radius = virtualRadius = Math.pow(x, 2);
                //angle = + Math.pow(da, 2);
            }
            if(virtualRadius >= rMax)  {               
                var removedRadius = virtualRadius - rMax; 
                radius = (rMax - removedRadius);                
            }
            
            v = new utilities.vector(Math.cos(angle) * radius , Math.sin(angle) * radius);
            var pos = v.add(tr); 

            //var r = 2 * radius;
            var cRad = smallR *(radius/restRadius/3) + 2;
            el.attr("r", cRad);
            el.attr("cx", pos.x);
            el.attr("cy", pos.y); 
            if(virtualRadius >= loopCount){  
                thisPage.resetAll(topic);
                //$.when(thisPage.reset(topic))
                //    .then(thisPage.popCircle(el, smallR));
                	
                return;
            }
            
            requestAnimationFrame(function(){
                animateSpiral(i, topic, restRadius, dr, v, x, da, rMax, smallR, loopCount, isExponential);
            });
        }           
    }
    this.popCircle = function(el, r)
    {
        var el = el.transition()
					.duration(150)					
					.attr("r", r * 1.5)
					.transition()
					.duration(50)
					.attr("r", r)
					.ease('sine')
    }
    this.orbit = function(bigRadius, count, rotations, time, scaleBig, scaleSmall)
    { 
        var rad = bigRadius *  1;
        var dr = Math.PI/ count;
        var center = thisPage.center;
               
        d3.selectAll(".topicCircle")           
            .each(function(d, i){
               
                var direction = i % 2;
                if(direction === 0){
                    direction = -1;
                }  
                var addMe = new utilities.vector(Math.cos(dr*i), Math.sin(dr*i)).multiply(rad).multiply(direction);
                var start = center.add(addMe);
                var end = center.subtract(addMe);
                                
                var c = d3.select(this);
                var circleRad = parseInt(c.attr("r"));
                var small = scaleSmall * circleRad;
                var big = scaleBig * circleRad;
                var mid = (big + small)/2;
                var pathData = [{p:start, s: mid, d: 250, e:"exp"}, {p:center, s: small, d: 150, e:"linear"}
                   , {p:end, s: mid, d: 250,e:"exp"},  {p:center, s: big, d: 150, e:"linear"}];
                c
                .transition()
                .duration(0)
                .attr({"transform" : "translate(0, 0)"})
                .each(function(){                              
                    repeat(pathData, rotations, 0);
                });
                         
                function repeat(pathData, rotations, i) {
                
                    var delay = 0;
               
                    var x = i % pathData.length;
                    ++i;
                    //var isCentering = i%2;
                    var p = pathData[x];
                    if(i > rotations ){    
                        thisPage.resetAll(c.data()[0]);
                        return;
                    }else if ( i === 1){
                        delay = Math.random() * 300;
                    }                    
                    c.transition()
                    .delay(delay)
                    .duration(p.d)
                    .ease("linear")
                        //.attr({"transform" : "translate(" + p.p.x + "," + p.p.y + ")"})
                        .attr({
                            'r': p.s,
                            'cx': p.p.x,
                            'cy': p.p.y,                    
                        })
                    .each("end", function(){
                        repeat( pathData, rotations, i);
                    
                    });                               
                }            
            });
    }
    this.populateTopics = function (bigRadius, radius) {

        var work = new thisPage.topic("Work", "People I've worked with.","blue", radius);
        work.callback = this.dropToPage;
        this.topics.push(work);

        var ai = new thisPage.topic("Simulations", "Some simple machine learning demos.", "orange", radius);
        ai.callback = thisPage.superNova;
        this.topics.push(ai);
        
        var likes = new thisPage.topic("Likes", "Some sites I like.", "yellow", radius);
        likes.callback = thisPage.throwItems;
        this.topics.push(likes);

        var qualifications = new thisPage.topic("Qualifications", "Resume and profile link.", "green", radius);
        qualifications.callback = thisPage.throwItems;
        this.topics.push(qualifications);

        var about = new thisPage.topic("About", "About this website.", "red", radius);
        about.callback = thisPage.throwItems;
        this.topics.push(about);

        for (var i = 0; i < this.topics.length; ++i) {
            const topic = this.topics[i];
            var angle = Math.PI * 2 / this.topics.length * i;
            topic.vector = 
                new utilities.vector(Math.sin(angle) * bigRadius, -1* Math.cos(angle) * bigRadius);
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
            .attr("offset", "90%")
            .attr("stop-color", "#FFDA4E");
        sunGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#FB8933");

        var pageGradient = defs.append("radialGradient")
        .attr("id", "page-gradient")
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
            .attr("offset", "90%")
            .attr("stop-color", "#FFDA4E");
        sunGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#FB8933");
    }
    this.globeSwallow = function(){
        var sphere = thisPage.sphere;
    }
    this.dropToPage = function(args){
        var topic = args[0], subTopics = args[1], topics= thisPage.topics;
        getSubTopics();
        var duration = 750;
        var originalHeight = thisPage.canvasHeight;
        thisPage.stretch(originalHeight);
        var ease = d3.easeBounce;

        d3.selectAll(".topicCircle").each(function(d, i){ 
            var delay = Math.random() * 400;
            if(this.id == topic.Id){
                delay = 0;
            }
            scroll(document.body.getBoundingClientRect().height - window.innerHeight, ease);
            var v = d.vector;           
            var translate = v.x + ", " + (thisPage.canvasHeight * .75 - d.radius) ;  
            
            d3.select(this)                
                .transition()
                .delay(delay) 
                .duration(duration)
                .ease(ease)
                .attr({"transform" : "translate(" + translate + ")"})
                .attr("data-selected", 0)
                .transition()
                .delay(1000) 
            .each("end", function(){
                var resetSpeed = 250;
                scroll(document.body.getBoundingClientRect().height - window.innerHeight, "exp");
                thisPage.resetAll(d, duration, true);
                d3.selectAll(".gear").attr("visibility", "hidden");
            });
                               
        });
        function scroll(y, e)
        {
            d3.transition()
           .delay(0)
           .duration(duration)
                .ease(e)
           .tween("scroll", scrollTween(y))

            function scrollTween(offset) {
                return function() {
                    var i = d3.interpolateNumber(window.pageYOffset || document.documentElement.scrollTop, offset);
                    return function(t) { scrollTo(0, i(t)); };
                };
            }
        } 
        
        function getSubTopics()
        {

            var workTopic = function(name, link, image){
                this.name = name;
                this.link = link;
                this.image = image;           
            }
            var list = [];
            var folder ="img\\logos\\";

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
            .attr("xlink:href", function(d){ return  folder + d.name +".jpg"})
                .attr("x", "60")
                .attr("y", "60")
            .attr("width", "200")
            .attr("height", "200");
        }

        //list.forEach(function(item, i){

        //});

        
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
    
    //https://codepen.io/leegunn/pen/grJLxY
    this.wormHoleOLD = function (args)
    {
        
        const NUMBER_OF_CIRCLES = 100;
        const SCALE = 1.05;
        const DELAY = 1.3;

        var audio = null;
        var universe = document.getElementById('universe');

        var targetX = window.innerWidth / 2;
        var targetY = window.innerHeight / 2;

        //var twitter = document.getElementById('twitter');
        //twitter.style.left = targetX - (twitter.clientWidth / 2) + "px";
        //twitter.style.top = targetY - (twitter.clientHeight / 2) + "px";

        var oldTargetX = targetX;
        var oldTargetY = targetY;
        var counter = 0;
        var circles = [];

        var Circle = function(element)
        {
            this.element = element;
            this.hue = null;
            this.x = null;
            this.y = null;
            this.scaleLevel = 1;
        };

        Circle.prototype.transform = function()
        {  
            var translate = "translate(" + this.x +  ", " + this.y + ")";
            var scale = "scale(" + this.scaleLevel + ", " + this.scaleLevel + ")";

            var t = translate + " " + scale;
            this.element.attributes[2].value = t;//('transform', t);
  
            //this.element.style.transform = translate + " " + scale;
        };

        Circle.prototype.scale = function(scale)
        { 
            this.scaleLevel = scale;
            this.transform();
        }

        Circle.prototype.translate = function(x, y)
        { 
            this.x = x;
            this.y = y;
            this.transform();
        }

        Circle.prototype.setHue = function(hue)
        {
            this.hue = hue;
            this.element.style.fill = 'hsl(' + hue + ', 80%, 40%)';
        };

        // Keep track of the pointer
        window.onmousemove = function(event)
        {
            //if(audio == null)
            //{
            //    loadAudio();
            //}
  
            targetX = event.clientX;
            targetY = event.clientY;
        };

        //function loadAudio()
        //{
        //    audio = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/554945/space.mp3');
        //    audio.loop = true;
        //    audio.volume = 0.2;
        //    audio.play();
        //}

        function buildTunnel(count)
        { 

            
            
            var svg = document.getElementById('mainGroup');
            var original = thisPage.canvas.append('path')
                .attr("class", "circle-tunnel")
                .attr("d", "M0,0V500H500V0ZM250,287a37,37,0,1,1,37-37A37,37,0,0,1,250,287Z");
            
            
            
            for(var i = 0; i < count; i++)
            {
                var element = original[0][0].cloneNode(true);
                svg.appendChild(element);
                var scale = Math.pow(SCALE, i + 1);
                var circle = new Circle(element);
                
                circle.setHue(i * 5 % 360);
    
                var box = circle.element.getBBox();
                circle.box = box;               
                var x = targetX - box.width * (scale) / 2;
                var y = targetY - box.height * (scale) / 2;
                circle.x = x;
                circle.y = y;
                var t = "translate(" + x +  ", " + y + ")";
                circle.element.setAttribute('transform', t);
                circle.translate(x, y);
                circle.scale(scale);
                circles.push(circle);
            }
 
            original.remove();
        }

        //var oldVolume = 0.2;

        function warp()
        { 
            // Twinkling stars
            //universe.style.opacity = Math.random() * (1 - 0.75) + 0.75;
  
            // Move the stars when flying
            //universe.style.backgroundPosition = -targetX + "px " + -targetY + "px";
                
            // Store the new target
            oldTargetX = targetX;
            oldTargetY = targetY;
  
            for(var i = 0; i < circles.length; i++)
            {
                var circle = circles[i];
    
                var box = circle.box;
    
                // Work out the transforms
                var x2 = targetX - box.width * (circle.scaleLevel) / 2;
                var y2 = targetY - box.height * (circle.scaleLevel) / 2;

                // Smoothe it out a little
                var speed = (i + 1) * DELAY;
                x2 = circle.x + (x2 - circle.x) / speed;
                y2 = circle.y + (y2 - circle.y) / speed;
 
                circle.translate(x2, y2);
 
                //circle.setHue((circle.hue - 5) % 360);
                window.requestAnimationFrame(warp);
            }
        }

 
        buildTunnel(NUMBER_OF_CIRCLES);

        window.requestAnimationFrame(warp);

 
    }
    this.blackHole = function(args)
    {
        
        thisPage.gearTimer.stop();
        var t = args[0];
        var c = thisPage.center;
        var scale = .1;
        var items = d3.selectAll("g").filter(function (d, i) 
        { return this.id != "mainGroup" && this.id != "topicCircles"});
        //var g = d3.select("#mainGroup");
        //var el = g[0][0];
        //var box = el.getBBox();
        
        var translate = (c.x) +"," + (c.y) ;
        //var translate = 0 + "," + 0;
        items.each(function(d, i){   
            var item =  d3.select(this)
                .transition()
                
            .duration(500)
            .ease("exp")
            .attr({"transform" : "translate(" + translate + ") scale("+scale+") "})
            //.each("end", function(){thisPage.wormHole.call(this, args);});	
        });  
        var topics = d3.selectAll(".topicCircle")
        topics.each(function(d, i){  
            if(t.id === d.id)
                return;
            var rad = d.radius * scale;
            var el =  d3.select(this);
            var translate = 0 + "," + 0;
            //var translate = -this.vector.x + "," + -this.vector.x;
            el 
                .transition()
                
            .duration(250)
            .ease("exp")
            .attr({"transform" : "translate(" + translate + ")", r: rad})
            //"transform" : "translate(" + c.x + "," + c.y + ")"});
            
        });

        // thisPage.wormHole();
        ////Gear.updateGears(thisPage.gears);

       
    }
    this.superNova = function(args)
    {
        //thisPage.loadDistortion();
        var t = args[0];
        var c = t.shape;
        var r = t.radius/2;
        c
            .transition()
            .duration(500)
            .ease("exp")
           
            .attr({
                fill: "url(#sun-gradient)",
                r: (t.radius * 10)
            })
            .transition()
            .duration(100)
            .ease("exp")
            .attr({
                fill: "white",
                r: thisPage.canvasWidth
            })
            
            .transition()
            .duration(300)
            .ease("exp")
            .attr({
                fill: "black",
                r: r
            })
            .each("end", function(){thisPage.blackHole.call(this, args);});	
            
    }
    this.isWithinBox= function(el, p)
    {
        if(el.left <= p.x && el.right > p.x && el.top <= p.y && el.bottom >= p.y)
            return true;
        return false;
    }
    this.createTopicShapes =  function(bigRadius, radius){

                                                 
        var x = thisPage.center.x;// + radius;//+ (Math.sin(angle)) * bigRadius;
        var y = thisPage.center.y;// + radius;// + (Math.cos(angle)) * bigRadius;
        var xPadding = 300;
        var yPadding = 30;    
        var translate = x + "," + y;
        thisPage.canvas.append("g")
            .attr("id", "topicCircles")
            .selectAll("circle")
        .data(thisPage.topics)
        .enter()
        .append("circle")
        .attr("class", function(d){ return "topicCircle"; })
        .attr("id", function(d){ return d.id; })
        .attr("data-selected", 0)
        .attr({
            cx: x,
            cy: y,
            r: radius,
            fill: function(d) { return "url(#gradient-" + d.id + ")"; },
            transform : function(d) {return "translate(" + d.vector.x + ", " + d.vector.y+ ")";}
        })
        .on("click", function(d){  
            var c = d3.select(this);
            
            var center = thisPage.center;
            if(c.attr("data-selected") == 1)
            {
                c.attr("data-selected", 0);
                thisPage.orbit(bigRadius, thisPage.topics.length, 8, 1000, .40, .04);
                return;
            }
            d3.selectAll(".topicCircle").each(function(d2, i){  
                if(d.id != this.id){                        
                    var p = d2.vector;  
                    var translate = p.x + "," + p.y;
                    d3.select(this)
                    .transition()
                    .duration(1500)
                    .ease(d2.ease)
                    .attr({"transform" : "translate(" + translate + ")"})
                    .attr("data-selected", 0)
                    
                }                    
            });
            var translate = 0 + "," + 0;
            c
                .transition()
                .duration(250)
                .ease(d.ease)
                .attr({"transform" : "translate(" + translate + ")"})
                .attr("data-selected", 1)
				.each("end", d.topicClick);	
        }) 
        //brittle
        var circles = thisPage.canvas.selectAll(".topicCircle")[0];
        var count = thisPage.topics.length;
       
        for(var i = 0; i < count; ++i)
        {
            const topic = thisPage.topics[i];
            topic.shape = d3.select(circles[i]);
                
            thisPage.spiral(thisPage.center, topic, bigRadius, bigRadius/32, 
                1.20, topic.vector.unit(), bigRadius, 0, true);
        }       
        //thisPage.spiral(d3.selectAll(".topicCircle"));
        
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
    this.createGears = function(bigRadius, topicRadius)   
    {
        var radius =  bigRadius + topicRadius/2;
        var gear1 = Gear.create(thisPage.canvas, { 
            radius: radius, 
            teeth: radius/4, 
            x: thisPage.center.x, 
            y: thisPage.center.y, 
            holeRadius:  bigRadius - topicRadius/2,
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
            number: 30,
            addendum: 8,
            dedendum: 3,
            thickness: 0.6,
            profileSlope: 0.5
        };
        
        var gearFactors = [64, 64, 96, 48, 48, 96, 112, 256];
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

            gears.push(newGear = Gear.create(thisPage.canvas, { 
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
    this.setGears = function(gears, transition, duration){  
        var placed = gears[0];
        
        //gears = Gear.Utility.arrayShuffle(gears);
        Gear.randomArrange(gears,thisPage.center.x, thisPage.center.y, null, null, [placed]);
        Gear.setPower(gears[0], 0.01);
        //Gear.updateGears(gears);
        

        thisPage.canvas.selectAll('.gear')
            .each(function(d, i) {
                if (transition) {
                    d3.select(this)
                        .transition()
                        .ease('elastic')
                        .delay(i * 80 + Math.random() * 80)
                        .duration(duration)
                        .attr('transform', function(d) {
                            return 'translate(' + [ d.x, d.y ] + ')';
                        });
                } else {
                    d3.select(this)
                        .attr('transform', function(d) {
                            return 'translate(' + [ d.x, d.y ] + ')';
                        });
                }
            });
    }
    this.startGears = function(gears){        
        thisPage.gearTimer = d3.timer(function () {
            thisPage.canvas.selectAll('.gear-path')
                .attr('transform', function (d) {
                    d.angle += d.speed;
                    return 'rotate(' + d.angle * (180 / Math.PI) + ')';
                });
        });
        Gear.updateGears(gears);
    }
    this.createSphere = function(id, x, y, scale, vx, vy, vz, rx, ry, rz)
    {
        var 
        rotate = [rx, ry, rz],
        velocity = [vx, vy, vz],
        time = Date.now(),
        svg = thisPage.canvas;

        var projection = d3.geo.orthographic()
            .scale(scale)
            .translate([x, y])
            //.clipAngle(90 + 1e-6)
            .precision(.3);

        var path = d3.geo.path()
            .projection(projection);

        var graticule = d3.geo.graticule();

        var g = svg.append("g")
        .attr("class", "sphere-rotating")
        .attr("id", "sphere-rotating-" + id);

        g.append("path")
            .datum({type: "Sphere"})
            .attr("class", "sphere" )
            .attr("d", path);

        g.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);

        g.append("path")
            .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
            .attr("class", "equator")
            .attr("stroke-width", "22")
            .attr("d", path);

        var sphere = svg.selectAll("#sphere-rotating-" + id +" path");

        d3.timer(function() {
            var dt = Date.now() - time;
            projection.rotate([rotate[0] + velocity[0] * dt, rotate[1] + velocity[1] * dt, rotate[2] + velocity[2] * dt]);
            sphere.attr("d", path);
        });
        return sphere;
    }  

    this.initialize = new function () {
        
        var c = thisPage.center;
        $(".nav-left").menu();
        thisPage.mainSvg = d3.select("body").append("svg")
            .attr("id", "svg")
            .attr("width", thisPage.canvasWidth)
            .attr("height", thisPage.canvasHeight);
        var defs = thisPage.mainSvg.append("defs");
        thisPage.canvas = thisPage.mainSvg.append("g").attr({id: "mainGroup"});

        
        
        var bigRadius = Math.round(Math.max(thisPage.canvasWidth, thisPage.canvasHeight) / 8); 
        var topicRadius = Math.round(bigRadius/4);

        var gears = thisPage.createGears(bigRadius, topicRadius);

        thisPage.populateTopics(bigRadius, topicRadius);
        thisPage.populateGradients(defs, thisPage.topics);
        thisPage.createTopicShapes(bigRadius, topicRadius);
        thisPage.setGears(gears, true, 800);
        thisPage.startGears(gears);
        thisPage.gears = gears;
        

    

        var sphere1 = thisPage.createSphere(1, c.x, c.y, 180,  0, .25 ,0,
         0, 0 , 90);
        var sphere2 = thisPage.createSphere(2, c.x, c.y, 180, 0, .2, 0,
        0, 90,0);
        var sphere3 = thisPage.createSphere(3, c.x, c.y, 180, 0, .3, 0,
            0 ,0, 45);
        thisPage.sphere = sphere;

       // var sphere2 = thisPage.createSphere(2, c.x, c.y, 100,  0, .1, 0,
       //0, 0,0);
       // var sphere3 = thisPage.createSphere(3, c.x, c.y, 100,  0, .1, 0,
       //     0 ,0, 45);
    }
   
}

var utilities = new utilities();
var windowPage = new page();
//windowPage.initialize();