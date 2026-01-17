import { useEffect, useRef } from 'react';
import { MapContainer, Marker, CircleMarker, TileLayer, Tooltip  } from "react-leaflet";

export default function Leaflet(teams) {
  const markerRefs = useRef({});

  useEffect(() => {
    const handleTeamHover = (event) => {
      const { teamId, action } = event.detail;
      const marker = markerRefs.current[teamId];
      if (marker) {
        if (action === 'enter') {
          marker.openTooltip();
        } else {
          marker.closeTooltip();
        }
      }
    };

    window.addEventListener('teamHover', handleTeamHover);
    return () => window.removeEventListener('teamHover', handleTeamHover);
  }, []);
  
  const bounds = L.latLngBounds();
  teams.teams.forEach(t => {
    bounds.extend([t.latitude, t.longitude])
  });

  function TeamMarkers() {
    const locationCoords = new Array();
    teams.teams.forEach(t => {
      locationCoords.push({
        'coords':[t.latitude,t.longitude],
        'school':t.school,
        'id': t.id,
        'icon': L.icon({
          iconUrl: '/logos/small/'+t.id+'.png',
          iconSize: [25, 25],
          popupAnchor:  [0, -30]
        })
      });
    })
    return locationCoords.map((loc, index) => {
      return(
        <CircleMarker center={{ lat: loc.coords[0], lng: loc.coords[1] }} radius="16" pathOptions={{ stroke: false, fillColor: '#FFFFFF', fillOpacity: 1}}>
          <Marker key={index} position={loc.coords} icon={loc.icon} ref={(el) => {
              if (el) markerRefs.current[loc.id] = el;
            }}>
            <Tooltip direction="right" offset={[11,0]} className="name-tooltip">
              {loc.school}
            </Tooltip>
          </Marker>
        </CircleMarker>
        
      );
    });
  }

  return (
    <MapContainer
      className="map-container"
      bounds={bounds}
      zoom={2}
      scrollWheelZoom={false}
    >
      <TileLayer
        url='https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.{ext}'
        attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        ext = 'png'
      />
      <TeamMarkers />
    </MapContainer>
  );
}


