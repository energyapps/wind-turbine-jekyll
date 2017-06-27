(function ($) {
    // Monkey patch jQuery 1.3.1+ css() method to support CSS 'transform'
    // property uniformly across Safari/Chrome/Webkit, Firefox 3.5+, IE 9+, and Opera 11+.
    // 2009-2011 Zachary Johnson www.zachstronaut.com
    // Updated 2011.05.04 (May the fourth be with you!)
    function getTransformProperty(element)
    {
        // Try transform first for forward compatibility
        // In some versions of IE9, it is critical for msTransform to be in
        // this list before MozTranform.
        var properties = ['transform', 'WebkitTransform', 'msTransform', 'MozTransform', 'OTransform'];
        var p;
        while (p = properties.shift())
        {
            if (typeof element.style[p] != 'undefined')
            {
                return p;
            }
        }
        
        // Default to transform also
        return 'transform';
    }
    
    var _propsObj = null;
    
    var proxied = $.fn.css;
    $.fn.css = function (arg, val)
    {
        // Temporary solution for current 1.6.x incompatibility, while
        // preserving 1.3.x compatibility, until I can rewrite using CSS Hooks
        if (_propsObj === null)
        {
            if (typeof $.cssProps != 'undefined')
            {
                _propsObj = $.cssProps;
            }
            else if (typeof $.props != 'undefined')
            {
                _propsObj = $.props;
            }
            else
            {
                _propsObj = {}
            }
        }
        
        // Find the correct browser specific property and setup the mapping using
        // $.props which is used internally by jQuery.attr() when setting CSS
        // properties via either the css(name, value) or css(properties) method.
        // The problem with doing this once outside of css() method is that you
        // need a DOM node to find the right CSS property, and there is some risk
        // that somebody would call the css() method before body has loaded or any
        // DOM-is-ready events have fired.
        if
        (
            typeof _propsObj['transform'] == 'undefined'
            &&
            (
                arg == 'transform'
                ||
                (
                    typeof arg == 'object'
                    && typeof arg['transform'] != 'undefined'
                )
            )
        )
        {
            _propsObj['transform'] = getTransformProperty(this.get(0));
        }
        
        // We force the property mapping here because jQuery.attr() does
        // property mapping with jQuery.props when setting a CSS property,
        // but curCSS() does *not* do property mapping when *getting* a
        // CSS property.  (It probably should since it manually does it
        // for 'float' now anyway... but that'd require more testing.)
        //
        // But, only do the forced mapping if the correct CSS property
        // is not 'transform' and is something else.
        if (_propsObj['transform'] != 'transform')
        {
            // Call in form of css('transform' ...)
            if (arg == 'transform')
            {
                arg = _propsObj['transform'];
                
                // User wants to GET the transform CSS, and in jQuery 1.4.3
                // calls to css() for transforms return a matrix rather than
                // the actual string specified by the user... avoid that
                // behavior and return the string by calling jQuery.style()
                // directly
                if (typeof val == 'undefined' && jQuery.style)
                {
                    return jQuery.style(this.get(0), arg);
                }
            }

            // Call in form of css({'transform': ...})
            else if
            (
                typeof arg == 'object'
                && typeof arg['transform'] != 'undefined'
            )
            {
                arg[_propsObj['transform']] = arg['transform'];
                delete arg['transform'];
            }
        }
        
        return proxied.apply(this, arguments);
    };
})(jQuery);

/*!
/**
 * Monkey patch jQuery 1.3.1+ to add support for setting or animating CSS
 * scale and rotation independently.
 * https://github.com/zachstronaut/jquery-animate-css-rotate-scale
 * Released under dual MIT/GPL license just like jQuery.
 * 2009-2012 Zachary Johnson www.zachstronaut.com
 */
(function ($) {
    // Updated 2010.11.06
    // Updated 2012.10.13 - Firefox 16 transform style returns a matrix rather than a string of transform functions.  This broke the features of this jQuery patch in Firefox 16.  It should be possible to parse the matrix for both scale and rotate (especially when scale is the same for both the X and Y axis), however the matrix does have disadvantages such as using its own units and also 45deg being indistinguishable from 45+360deg.  To get around these issues, this patch tracks internally the scale, rotation, and rotation units for any elements that are .scale()'ed, .rotate()'ed, or animated.  The major consequences of this are that 1. the scaled/rotated element will blow away any other transform rules applied to the same element (such as skew or translate), and 2. the scaled/rotated element is unaware of any preset scale or rotation initally set by page CSS rules.  You will have to explicitly set the starting scale/rotation value.
    
    function initData($el) {
        var _ARS_data = $el.data('_ARS_data');
        if (!_ARS_data) {
            _ARS_data = {
                rotateUnits: 'deg',
                scale: 1,
                rotate: 0
            };
            
            $el.data('_ARS_data', _ARS_data);
        }
        
        return _ARS_data;
    }
    
    function setTransform($el, data) {
        $el.css('transform', 'rotate(' + data.rotate + data.rotateUnits + ') scale(' + data.scale + ',' + data.scale + ')');
    }
    
    $.fn.rotate = function (val) {
        var $self = $(this), m, data = initData($self);
                        
        if (typeof val == 'undefined') {
            return data.rotate + data.rotateUnits;
        }
        
        m = val.toString().match(/^(-?\d+(\.\d+)?)(.+)?$/);
        if (m) {
            if (m[3]) {
                data.rotateUnits = m[3];
            }
            
            data.rotate = m[1];
            
            setTransform($self, data);
        }
        
        return this;
    };
    
    // Note that scale is unitless.
    $.fn.scale = function (val) {
        var $self = $(this), data = initData($self);
        
        if (typeof val == 'undefined') {
            return data.scale;
        }
        
        data.scale = val;
        
        setTransform($self, data);
        
        return this;
    };

    // fx.cur() must be monkey patched because otherwise it would always
    // return 0 for current rotate and scale values
    var curProxied = $.fx.prototype.cur;
    $.fx.prototype.cur = function () {
        if (this.prop == 'rotate') {
            return parseFloat($(this.elem).rotate());
            
        } else if (this.prop == 'scale') {
            return parseFloat($(this.elem).scale());
        }
        
        return curProxied.apply(this, arguments);
    };
    
    $.fx.step.rotate = function (fx) {
        var data = initData($(fx.elem));
        $(fx.elem).rotate(fx.now + data.rotateUnits);
    };
    
    $.fx.step.scale = function (fx) {
        $(fx.elem).scale(fx.now);
    };
    
    /*
    
    Starting on line 3905 of jquery-1.3.2.js we have this code:
    
    // We need to compute starting value
    if ( unit != "px" ) {
        self.style[ name ] = (end || 1) + unit;
        start = ((end || 1) / e.cur(true)) * start;
        self.style[ name ] = start + unit;
    }
    
    This creates a problem where we cannot give units to our custom animation
    because if we do then this code will execute and because self.style[name]
    does not exist where name is our custom animation's name then e.cur(true)
    will likely return zero and create a divide by zero bug which will set
    start to NaN.
    
    The following monkey patch for animate() gets around this by storing the
    units used in the rotation definition and then stripping the units off.
    
    */
    
    var animateProxied = $.fn.animate;
    $.fn.animate = function (prop) {
        if (typeof prop['rotate'] != 'undefined') {
            var $self, data, m = prop['rotate'].toString().match(/^(([+-]=)?(-?\d+(\.\d+)?))(.+)?$/);
            if (m && m[5]) {
                $self = $(this);
                data = initData($self);
                data.rotateUnits = m[5];
            }
            
            prop['rotate'] = m[1];
        }
        
        return animateProxied.apply(this, arguments);
    };
})(jQuery);

(function ($) { 
          
  // Move the Clouds
  $(document).ready(function cloud1(){
      $("#cloud1").
        animate({left:'+=300%'},10500).
        animate({opacity: 0},0).
        animate({left:'-=300%'},0).
        delay(1000).
        animate({opacity: 1},cloud1)   
      $("#cloud2").
        delay(3000).
        animate({left:'+=300%'},9000).
        animate({opacity: 0},0).
        animate({left:'-=300%'},0).
        delay(1000).
        animate({opacity: 1},cloud2)   
      $("#cloud3").
        delay(5000).
        animate({left:'+=300%'},15000).
        animate({opacity: 0},0).
        animate({left:'-=300%'},0).
        delay(1000).
        animate({opacity: 1},cloud3)   
      $("#cloud4").
        animate({left:'+=300%'},10000).
        animate({opacity: 0},0).
        animate({left:'-=300%'},0).
        delay(1000).
        animate({opacity: 1},cloud4)   
      $("#cloud5").
        delay(3000).
        animate({left:'+=300%'},13500).
        animate({opacity: 0},0).
        animate({left:'-=300%'},0).
        delay(4000).
        animate({opacity: 1},cloud5)   
      $("#cloud6").
        delay(1000).
        animate({left:'+=300%'},9000).
        animate({opacity: 0},0).
        animate({left:'-=300%'},0).
        delay(3000).
        animate({opacity: 1},cloud6)               
  }); 

}(jQuery));  

var data = [
  {
    "id":"1",
    "cls":"wind-direction",
    "name":"Wind direction",
    "description":"Determines the design of the turbine. Upwind turbines—like the one shown here—face into the wind while downwind turbines face away."
  },
  {
    "id":"2",
    "cls":"blades",
    "name":"Blades",
    "description":"Lifts and rotates when wind is blown over them, causing the rotor to spin. Most turbines have either two or three blades."
  },
  {
    "id":"3",
    "cls":"rotor",
    "name":"Rotor",
    "description":"Blades and hub together form the rotor."
  },
  {
    "id":"4",
    "cls":"low-speed-shaft",
    "name":"Low-speed shaft",
    "description":"Turns the low-speed shaft at about 30-60 rpm."
  },
  {
    "id":"5",
    "cls":"gear-box",
    "name":"Gear box",
    "description":"Connects the low-speed shaft to the high-speed shaft and increases the rotational speeds from about 30-60 rotations per minute (rpm), to about 1,000-1,800 rpm; this is the rotational speed required by most generators to produce electricity. The gear box is a costly (and heavy) part of the wind turbine and engineers are exploring \"direct-drive\" generators that operate at lower rotational speeds and don't need gear boxes."
  },
  {
    "id":"6",
    "cls":"high-speed-shaft",
    "name":"High-speed shaft",
    "description":"Drives the generator."
  },
  {
    "id":"7",
    "cls":"generator",
    "name":"Generator",
    "description":"Produces 60-cycle AC electricity; it is usually an off-the-shelf induction generator."
  },
  {
    "id":"8",
    "cls":"anemometer",
    "name":"Anemometer",
    "description":"Measures the wind speed and transmits wind speed data to the controller."
  },
  {
    "id":"9",
    "cls":"controller",
    "name":"Controller",
    "description":"Starts up the machine at wind speeds of about 8 to 16 miles per hour (mph) and shuts off the machine at about 55 mph. Turbines do not operate at wind speeds above about 55 mph because they may be damaged by the high winds."
  },
  {
    "id":"10",
    "cls":"pitch-system",
    "name":"Pitch System",
    "description":"Turns (or pitches) blades out of the wind to control the rotor speed, and to keep the rotor from turning in winds that are too high or too low to produce electricity."
  },
  {
    "id":"11",
    "cls":"brake",
    "name":"Brake",
    "description":"Stops the rotor mechanically, electrically, or hydraulically, in emergencies."
  },
  {
    "id":"12",
    "cls":"wind-vane",
    "name":"Wind vane",
    "description":"Measures wind direction and communicates with the yaw drive to orient the turbine properly with respect to the wind."
  },
  {
    "id":"13",
    "cls":"yaw-drive",
    "name":"Yaw drive",
    "description":"Orients upwind turbines to keep them facing the wind when the direction changes. Downwind turbines don't require a yaw drive because the wind manually blows the rotor away from it."
  },  {
    "id":"14",
    "cls":"yaw-motor",
    "name":"Yaw motor",
    "description":"Powers the yaw drive."
  },
    {
    "id":"15",
    "cls":"tower",
    "name":"Tower",
    "description":"Made from tubular steel (shown here), concrete, or steel lattice. Supports the structure of the turbine. Because wind speed increases with height, taller towers enable turbines to capture more energy and generate more electricity."
  },
  {
    "id":"16",
    "cls":"nacelle",
    "name":"Nacelle",
    "description":"Sits atop the tower and contains the gear box, low- and high-speed shafts, generator, controller, and brake. Some nacelles are large enough for a helicopter to land on."
  }
]

// Initial Script

var content = document.getElementById('r-n-sc-info2');
var whichDiv = document.getElementById('cover');
// console.log(whichDiv.children)
var text = "";
var title = "";
var o = 1;
//iterations is total number of description iterations plus one (home screen)
var iterations = data.length + 1;

(function ($) { 

  $(document).ready(function() { 


  $('.nav-buttons').on("click", function(e) {
    //if click next and gray on previous, remove
    //if click previous and gray on next, remove
    //Add a step to o, remove a step from o
    current = $(this).attr('id')
    status = $(this).attr('class')
       // var q = o;
       
       // Turn all tooltips off
       $('.parts').children('div').removeClass('turnon');

    if (current == "previous-nav" && o > 0) {  
      
      if (o == 1) {
        o += 16;
        $('.parts:nth-child(16)').children('div').toggleClass('turnon');
      } 
      else {

        //Add the previous tooltip
        panda = o - 2
        if (o >= 0) {
          $('.parts:nth-child('+ panda + ')').children('div').toggleClass('turnon');    
         }
        
        // reduce o by 1;
        o -= 1;
      }
    } 

    else if (current == "next-nav" && o <= iterations) {

      if (o == iterations) {
        o -=16;
        
      } else {
        if (o >= 0) {
          $('.parts:nth-child('+ o + ')').children('div').toggleClass('turnon');    
         }

        // increase o by 1;
        o += 1;
      }
    };

    if (o > 1) {
      //Add the data description to the DOM
      content.innerHTML = "<center><h4>" + data[o-2].name + "</h4></center>" + 
                            "<p>" + data[o-2].description + "</p>" +
                            "<p class='numbers'>" + o + "/17</p>";      
    } else {
      content.innerHTML = "<p class='info'>Wind turbines operate on a simple principle. The energy in the wind turns two or three propeller-like blades around a rotor. The rotor is connected to the main shaft, which spins a generator to create electricity. Click NEXT to learn more.</p>";
    };
  });

    $('.parts').on( "mouseover", function(e) {
        e.preventDefault();
        
        // Turn all tooltips off
       $('.parts').children('div').removeClass('turnon');

      // Add's a current class "hover_effect"
        $(this).toggleClass('hover_effect');
      // console.log('TEST')
        $(this.firstElementChild).toggleClass('turnon');
      // grabs the hovers data name and matches it with the data
        layer = $(this).attr('data-name')

        for (var i = 0; i < data.length; i++) {

          if (layer == data[i].cls) {
            var text = data[i].description; 
            var title = data[i].name;
          };  
        };

      //Add the data description to the DOM
        content.innerHTML = "<center><h4>" + title + "</h4></center>" + 
                            "<p>" + text + "</p>";
    });

// On mouseout, return to position within rotation of information. 
    $('.parts').on("mouseout", function(e) {

      
      //turn the original one on.
      p = o -1;
       if (o >= 0) {
        $('.parts:nth-child('+ p + ')').children('div').toggleClass('turnon');    
       }        
       
      
      $(this.firstElementChild).toggleClass('turnon');

      if (o > 1) {
    
      content.innerHTML = "<center><h4>" + data[o-2].name + "</h4></center>" + 
                              "<p>" + data[o-2].description + "</p>" +
                            "<p class='numbers'>" + o + "/17</p>";      
      } else {
      content.innerHTML = "<p class='info'>Wind turbines operate on a simple principle. The energy in the wind turns two or three propeller-like blades around a rotor. The rotor is connected to the main shaft, which spins a generator to create electricity. Click NEXT to learn more.</p>";
      };
    });




  });  
}(jQuery));  
