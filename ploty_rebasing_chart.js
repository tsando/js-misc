// REQUIRES:
// // plotly.js

// Make a plotly chart that rebases on filter interactions
// Inputs dates, curves and names array
function plotly_rebasing_chart(targetID, dates, curves, names, cumulateFlags, axes, layout, lineStyles, colors) {
    console.log('plotly_rebasing_chart...')
    var shiftDatesBool = false
    for (var i=0;i<curves.length;i++) {
        if (cumulateFlags[i]) {                
            curves[i].unshift(0)
            shiftDatesBool = true;
        } else {
            // curves[i].unshift(undefined)            // NOT SURE WHY THIS WAS IN HERE    
        }
    }
    if (shiftDatesBool) {            
        dates.unshift((moment(dates[0]).businessSubtract(1)).format('YYYY-MM-DD'));
    }
    // Make cumulative traces, at first without start and end dates.
    var traces = make_traces(dates, curves, names, cumulateFlags, axes, null, null, lineStyles, colors);
    // ----------- PLOT ------------
    console.log('traces: ', traces)
    // Get the <div> element where the plot is drawn
    var gd = document.getElementById(targetID);
    window.onresize = function() {
        Plotly.Plots.resize(gd);
    };

    // create a new plot with traces
    if (layout) {
        Plotly.newPlot(gd, traces, layout);
    } else {            
        Plotly.newPlot(gd, traces);
    }

    // Define indicators of doubleclick and relayout events
    var is_doubleclick = false;
    var is_relayout = false;

    gd.on('plotly_doubleclick', function() {
        is_doubleclick = true;
        // Delete the rebased total trace and go back to original plot defined above
        var traces_index = names.map(function(d, i) {return i;})
        Plotly.deleteTraces(gd, traces_index);
        // Need to redefine traces here again otherwise memory problems (traces disappears after calling Plotly.deleteTraces)
        traces = make_traces(dates, curves, names, cumulateFlags, axes, null, null, lineStyles, colors);

        if (layout) {
            Plotly.plot(gd, traces, layout);
        } else {                
            Plotly.plot(gd, traces);
        }
        // Plotly.plot(gd, [trace1]);  // single trace example

    });

    // Define what happens on the relayout event (zooming in with the mouse) -  NOTE this also triggers after the plotly_doubleclick event
    gd.on('plotly_relayout', function() {
        is_relayout = true;

        // Only do this if event is NOT plotly_doubleclick (doubleclick also counts triggers relayout event)
        if (is_doubleclick == false && is_relayout == true ) {

            // Get the date values for the selected x axis and apply same date format as in date array
            var xRange = gd.layout.xaxis.range;
            var dateFormat = d3.time.format('%Y-%m-%d');
            var date_start = dateFormat(new Date(xRange[0]));
            var date_end = dateFormat(new Date(xRange[1]));

            var traces_index = names.map(function(d, i) {return i;})
            traces = make_traces(dates, curves, names, cumulateFlags, axes, date_start, date_end, lineStyles);
            //console.log('Inside plotly relayout', date_start, date_end, traces)
            console.log('Inside plotly relayout', date_start, date_end)
            // Delete the original traces so only the rebased total appears
            Plotly.deleteTraces(gd, traces_index);

            // Redefine the traces to new date range
            if (layout) {
                Plotly.plot(gd, traces, layout);
            } else {                
                Plotly.plot(gd, traces);
            }
        }
        // Must reset here this indicator
        is_doubleclick = false;
    });
}


// make traces for plotly
// inputs dates, curves and names arrays, and a min and max date for filtering (which can be null)
function make_traces(dates, curves, names, cumulateFlags, axes, date_start, date_end, lineStyles, colors) {
    // Initially set indexes to the full array
    var idx_start = 0;
    var idx_end = dates.length;

    // if dates have been defined, find indexes for them
    if (date_start) {
        for (var i=0; i < dates.length; i++) {
            if (dates[i] <= date_start) {idx_start = i;}
        };
    }
    if (date_end) {
        for (var i=0; i < dates.length; i++) {
            if (dates[i] <= date_end) {idx_end = i;}
        };
    }
    // create the traces structure that plotly expects
    var traces = [];
    for (var i=0;i<names.length;i++) {
        var yCurve = []
        // rebase depending on cumulateFlags, and the indexes
        if (cumulateFlags[i]) {
            yCurve = cumsum(curves[i].slice(idx_start, idx_end));
        }
        else {
            yCurve = curves[i].slice(idx_start, idx_end);
        }
        trace = {
            x: dates.slice(idx_start, idx_end),
            y: yCurve,
            "name": names[i],
            yaxis: axes[i]
            // visible: (function(){if (names[i].toLowerCase() == 'total'){return 'legendonly'}else{return true}})()
        }
        if (colors && colors[i]) {
            trace['marker'] = {color: colors[i]}
        }
        if (lineStyles && lineStyles[i]) {
            trace['line'] = {
                dash: lineStyles[i][0],
                width: lineStyles[i][1]
            }
        }
        traces.push(trace)
    }
    return traces
}
