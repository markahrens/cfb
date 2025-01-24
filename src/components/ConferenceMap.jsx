import { MapContainer, Marker, CircleMarker, TileLayer, Popup  } from "react-leaflet";

export default function Leaflet(teams) {
  console.log(teams);
  const bounds = L.latLngBounds();
  teams.teams.forEach(t => {
    bounds.extend([t.data.location.latitude, t.data.location.longitude])
  });

  function TeamMarkers() {
    const locationCoords = new Array();
    teams.teams.forEach(t => {
      locationCoords.push({
        'coords':[t.data.location.latitude,t.data.location.longitude],
        'school':t.data.school,
        'icon': L.icon({
          iconUrl: '/logos/small/'+t.data.id+'.png',
          iconSize: [25, 25],
          popupAnchor:  [0, -30]
        })
      });
    })
    return locationCoords.map((loc, index) => {
      return(
        <CircleMarker center={{ lat: loc.coords[0], lng: loc.coords[1] }} radius="16" pathOptions={{ stroke: false, fillColor: '#FFFFFF', fillOpacity: 0.9}}>
        <Marker key={index} position={loc.coords} icon={loc.icon}>
           <Popup>
            {loc.school}
          </Popup>
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


