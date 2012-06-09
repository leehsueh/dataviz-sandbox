/* Foundation v2.2.1 http://foundation.zurb.com */
// trello data
var trelloApiKey = "005a2c82c96eb4603397e8e417d4800b",
	trelloToken = "b3274513402d2542dadd7c4ad41368ee4bebffd93568b14f2db03d844d5bad30",	// read-only access forever
	boardData = [],
	unlabeledName = "unlabeled";

// handlebars templates
var tabTemplate = Handlebars.compile($("#tab-template").html()),
	tabContentTemplate = Handlebars.compile($("#tab-content-template").html());

// DOM containers
var tabsContainer = $("#viz-tabs"),
	tabsContentContainer = $("#viz-tabs-content");

// viz params
var w = 600,
	h = 300,
	minR = 3,
	rMultiplier = 2,
	duration = 800;

var onBoardsRetrieved = function( boards ) {
	$.each(boards, function (ix, board) {
		if (!board.closed) {
			var boardDataObj = {};
			boardDataObj.board = board;
			boardDataObj.labelCounts = {};
			$.each(board.labelNames, function(color, labelName) {
				if (labelName != "") boardDataObj.labelCounts[color] = 0;	// initialize counts to 0
			});
			boardDataObj.labelCounts[unlabeledName] = 0;
			boardData.push( boardDataObj );
		}
	});
	console.log(boardData);

	/* for each board, get all the cards and their labels */
	for (var i=0; i < boardData.length; i++) {
		Trello.get(
			"boards/" + boardData[i].board.id + "/cards",
			{fields: "name,idList,idBoard,labels"},
			onCardsRetrieved
		);
	}
}

var numBoardsComplete = 0;
var onCardsRetrieved = function( cards ) {
	var boardId = cards[0].idBoard;
	$.each(boardData, function(ix, boardDatum) {
		if (boardDatum.board.id == boardId) {
			boardDatum.cards = cards;
			$.each(cards, function(k, card) {
				if (card.labels.length) {
					$.each(card.labels, function(j, label) {
						boardDatum.labelCounts[label.color] += 1;
					});
				} else {
					boardDatum.labelCounts[unlabeledName] += 1;
				}
			});
			boardDatum.labelCountData = [];
			$.each(boardDatum.labelCounts, function(color, count) {
				boardDatum.labelCountData.push({
					"color": color,
					"count": isNaN(count) ? 0 : count
				});
			})
		}
	});
	numBoardsComplete++;
	// check if cards for all boards have been received
	var dataLoaded = numBoardsComplete == boardData.length;
	if (dataLoaded) {
		onDataComplete();
	}
}

var onDataComplete = function() {
	// render the tabs and tab containers
	$.each(boardData, function(index, boardDatum) {
		var context = {
			tabId: boardDatum.board.id,
			tabLabel: boardDatum.board.name
		}
		tabsContainer.append(tabTemplate(context));
		tabsContentContainer.append(tabContentTemplate(context));
	})

	// activate the foundation tabs
	$('dl.tabs').each(function () {
		//Get all tabs
		var tabs = $(this).children('dd').children('a');
		tabs.click(function (e) {
			activateTab($(this));

			// update the visualization
			var contentContainer = d3.select($("#viz-content")[0]);
			var dataset;
			var boardName = this.text;
			$.each(boardData, function( index, boardDatum) {
				if (boardDatum.board.name == boardName) {
					dataset = boardDatum;
				}
			});
			createVisualizationWithData( contentContainer, dataset);
		});
	});

	// start the visualization!
	//createVisualization();
	d3.select($("#viz-content")[0])
					.append("svg")
					.attr("width", w)
					.attr("height", h);
}

var createVisualizationWithData = function( contentContainer, dataset) {
	// get the content container
	
	var svg = contentContainer.select("svg");
	var groups = svg.selectAll("g.glabel")
		.data(dataset.labelCountData);

	// remove existing text
	//groups.selectAll("text").remove();

	var newGroups = groups.enter()
			.append("g")
			.attr("class", "glabel");
			
	newGroups.append("circle")
		.attr("cx", 0)
		.attr("cy", h/2)
		.attr("fill", function(d) {
			return d.color == unlabeledName ? "gray" : d.color;
		})
		.attr("stroke", "black")
		.attr("stroke-width", 2)
		.attr("opacity", 0)
		.attr("r", 0);

	newGroups.append("text")
		.attr("x", 0)
		.attr("y", 2*h/3)
		.attr("text-anchor", "middle")
		.attr("opacity", 0)
		.attr("class", "labelName");

	newGroups.append("text")
		.attr("x", 0)
		.attr("y", h/3)
		.attr("text-anchor", "middle")
		.attr("opacity", 0)
		.attr("class", "cardCount");

	groups.exit()
		.transition()
		.duration(1000)
		.attr("opacity", 0)
		.remove();

	var circles = groups.select("circle")//.append("circle")
		.transition()
		//.delay(duration)
		.duration(duration)
		.attr("opacity", 0.75)
		.attr("cx", function(d, i) {
			return (i * 75) + 50;
		})
		// .attr("cy", h/2)
		.attr("fill", function(d) {
			return d.color == unlabeledName ? "gray" : d.color;
		})
		.attr("r", function(d, i) {
			return minR + rMultiplier*d.count;
		});

	var groupTextLabel = groups.select("text.labelName")
		.text(function(d) {
			return d.color == unlabeledName ? unlabeledName : dataset.board.labelNames[d.color]
		})
		.transition().duration(duration)
		.attr("x", function(d, i) {
			return (i * 75) + 50;
		})
		.attr("opacity", 1);

	var groupTextCount = groups.select("text.cardCount")
		.text(function(d) {
			return d.count + " cards";
		})
		.transition().duration(duration)
		.attr("x", function(d, i) {
			return (i * 75) + 50;
		})
		.attr("opacity", 1);
}

var createVisualization = function() {
	// do the cool stuff here
	$.each(boardData, function(index, boardDatum) {
		// get the content container
		var contentContainer = d3.select($("#" + boardDatum.board.id + "Tab")[0]);

		// create the svg inside of it
		var w = 600,
			h = 300,
			minR = 3,
			rMultiplier = 2,
			duration = 800;
		var svg = contentContainer.append("svg")
					.attr("width", w)
					.attr("height", h);
			createVisualizationWithData(contentContainer, boardDatum);
	});
}

/* Foundation tab plugin */
function activateTab($tab) {
	var $activeTab = $tab.closest('dl').find('a.active'),
			contentLocation = $tab.attr("href") + 'Tab';
			
	// Strip off the current url that IE adds
	contentLocation = contentLocation.replace(/^.+#/, '#');

	//Make Tab Active
	$activeTab.removeClass('active');
	$tab.addClass('active');

	//Show Tab Content
	$(contentLocation).closest('.tabs-content').children('li').hide();
	$(contentLocation).css('display', 'block');
}

jQuery(document).ready(function ($) {

	/* Use this js doc for all application specific JS */

	// set up Trello options
	Trello.setKey(trelloApiKey);
	Trello.setToken(trelloToken);

	/* get all the boards */
	Trello.get("members/me/boards", onBoardsRetrieved);
	

	/* create a json data set suitable for d3 binding */

	/* for each board, create a simple bar graph of labels vs. # cards in that label */


	/* TABS --------------------------------- */
	/* Remove if you don't need :) */

	if (window.location.hash) {
		activateTab($('a[href="' + window.location.hash + '"]'));
		$.foundation.customForms.appendCustomMarkup();
	}

	/* ALERT BOXES ------------ */
	// $(".alert-box").delegate("a.close", "click", function(event) {
 //    event.preventDefault();
	//   $(this).closest(".alert-box").fadeOut(function(event){
	//     $(this).remove();
	//   });
	// });


	/* PLACEHOLDER FOR FORMS ------------- */
	/* Remove this and jquery.placeholder.min.js if you don't need :) */

	// $('input, textarea').placeholder();

	/* TOOLTIPS ------------ */
	// $(this).tooltips();



	/* UNCOMMENT THE LINE YOU WANT BELOW IF YOU WANT IE6/7/8 SUPPORT AND ARE USING .block-grids */
//	$('.block-grid.two-up>li:nth-child(2n+1)').css({clear: 'left'});
//	$('.block-grid.three-up>li:nth-child(3n+1)').css({clear: 'left'});
//	$('.block-grid.four-up>li:nth-child(4n+1)').css({clear: 'left'});
//	$('.block-grid.five-up>li:nth-child(5n+1)').css({clear: 'left'});



	/* DROPDOWN NAV ------------- */

	// var lockNavBar = false;
	// $('.nav-bar a.flyout-toggle').live('click', function(e) {
	// 	e.preventDefault();
	// 	var flyout = $(this).siblings('.flyout');
	// 	if (lockNavBar === false) {
	// 		$('.nav-bar .flyout').not(flyout).slideUp(500);
	// 		flyout.slideToggle(500, function(){
	// 			lockNavBar = false;
	// 		});
	// 	}
	// 	lockNavBar = true;
	// });
 //  if (Modernizr.touch) {
 //    $('.nav-bar>li.has-flyout>a.main').css({
 //      'padding-right' : '75px'
 //    });
 //    $('.nav-bar>li.has-flyout>a.flyout-toggle').css({
 //      'border-left' : '1px dashed #eee'
 //    });
 //  } else {
 //    $('.nav-bar>li.has-flyout').hover(function() {
 //      $(this).children('.flyout').show();
 //    }, function() {
 //      $(this).children('.flyout').hide();
 //    })
 //  }


	/* DISABLED BUTTONS ------------- */
	/* Gives elements with a class of 'disabled' a return: false; */
  
});
