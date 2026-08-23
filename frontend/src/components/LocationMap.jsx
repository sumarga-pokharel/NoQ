import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './LocationMap.css'

const officeIcon = L.divIcon({
  className: 'noq-map-marker noq-map-marker--office',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const visitorIcon = L.divIcon({
  className: 'noq-map-marker noq-map-marker--visitor',
  html: '<span></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Office location is the only point guaranteed to exist, so the map's
// lifecycle is keyed on it — the visitor marker is added/moved by the
// second effect without tearing the map down.
export default function LocationMap({ office, visitor, className = '' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const visitorMarkerRef = useRef(null)

  const officeLat = office?.lat
  const officeLng = office?.lng
  const hasOffice = typeof officeLat === 'number' && typeof officeLng === 'number'

  useEffect(() => {
    if (!containerRef.current || !hasOffice) return undefined

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).setView([officeLat, officeLng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    L.marker([officeLat, officeLng], { icon: officeIcon }).addTo(map)

    mapRef.current = map
    // The card's flex layout can settle after this mount, leaving Leaflet
    // with a stale (often zero-height) size reading — nudge it once the
    // browser has painted the final box.
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
      visitorMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOffice, officeLat, officeLng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const visitorLat = visitor?.lat
    const visitorLng = visitor?.lng

    if (typeof visitorLat !== 'number' || typeof visitorLng !== 'number') {
      if (visitorMarkerRef.current) {
        map.removeLayer(visitorMarkerRef.current)
        visitorMarkerRef.current = null
        map.setView([officeLat, officeLng], 15)
      }
      return
    }

    if (visitorMarkerRef.current) {
      visitorMarkerRef.current.setLatLng([visitorLat, visitorLng])
    } else {
      visitorMarkerRef.current = L.marker([visitorLat, visitorLng], { icon: visitorIcon }).addTo(map)
    }

    map.fitBounds(L.latLngBounds([officeLat, officeLng], [visitorLat, visitorLng]), {
      padding: [28, 28],
      maxZoom: 15,
    })
  }, [visitor?.lat, visitor?.lng, officeLat, officeLng])

  if (!hasOffice) {
    return <div className={`noq-map noq-map--empty ${className}`}>Map unavailable — office location not set</div>
  }

  return <div ref={containerRef} className={`noq-map ${className}`} />
}
