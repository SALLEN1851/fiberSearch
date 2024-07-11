$(document).ready(function() {
    let marker = null;
    const vk = process.env.FIBERMAP_API_KEY;
    mapboxgl.accessToken = process.env.MAPBOX_ACCESS_TOKEN; 

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-86.01333617084867, 40.124187774986616],
        zoom: 13
    });

    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Enter Address',
        container: 'geocoder'
    });

    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
    geocoder.on('result', function(event) {
        $('#addressInput').val(event.result.place_name);
    });

    function checkAddress() {
        var addressVal = $('#addressInput').val();
        var resultsEl = $('#results');
        resultsEl.html('checking...');

        $.ajax({
            method: 'POST',
            url: 'https://fibermap.vetro.io/v2/features/polygon/intersection/address',
            headers: { token: vk },
            data: JSON.stringify({
                address: addressVal,
                polygon_layer_ids: [244]
            }),
            contentType: 'application/json',
            dataType: 'json',
            success: function(response) {
                fetch("https://api.apispreadsheets.com/data/bgBypSkIRDQiaEHR/", {
                    method: "POST",
                    body: JSON.stringify({"data": {"address":addressVal}}),
                })
                .catch(error => console.error("Error logging to API Spreadsheets:", error));

                if (response.success) {
                    var service;
                    var intersectedStatuses = {};
                    for(var i=0; i<response.result.length; i++) {
                        if (response.result[i].properties && response.result[i].properties.Status) {
                            intersectedStatuses[response.result[i].properties.Status] = response.result[i];
                        }
                    }
                    console.log(intersectedStatuses);
                    if (intersectedStatuses.hasOwnProperty('Active')) {               
                        service = 'Active'; 
                        window.open(`/service-availability/eligible?address=${encodeURIComponent(addressVal)}`, "_self");
                    } else if (intersectedStatuses.hasOwnProperty('Under Construction')) {
                        service = 'Under Construction';
                        window.open("/service-availability/under-construction","_self");                            
                    } else if (intersectedStatuses.hasOwnProperty('Planned')) {
                        service = 'Planned';
                        window.open("/service-availability/planned","_self");                         
                    }
                    if (service) {
                        var result = intersectedStatuses[service];
                        resultsEl.html('The entered address was found in the <strong>'+service+'</strong> service area.')
                        var points = [];
                        for (var i=0; i<result.geometry.coordinates[0].length; i++) {
                            if (i<result.geometry.coordinates[0].length-1 
                            || result.geometry.coordinates[0][i][0] != result.geometry.coordinates[0][i][0]
                            || result.geometry.coordinates[0][i][1] != result.geometry.coordinates[0][i][1]
                            ) {
                                points.push([
                                    result.geometry.coordinates[0][i][1],
                                    result.geometry.coordinates[0][i][0],
                                ]);
                            }
                        }
                        if(polygon) {
                            polygon.remove();
                        }
                        console.log(points);
                        polygon = L.polygon(points).addTo(map);
                        polygon.bindTooltip(service);
                        map.stop().fitBounds(polygon.getBounds());
                    } else {
                        resultsEl.html('The entered address was not found in any service area. <strong>Call for more Information</strong>')
                        window.open("/service-availability/contact-to-confirm","_self"); 
                        if(polygon) {
                            polygon.remove();
                            polygon = undefined;
                        }
                    }

                } else {
                    console.error(response);
                }
                return false;
            },
            error: function(error) {
                console.error('Error:', error);
                resultsEl.html('Error checking address. Please try again.');
            }
        });
    }
  
    $('#check_btn').click(function(e) {
        e.preventDefault();
        checkAddress();
    });
});
