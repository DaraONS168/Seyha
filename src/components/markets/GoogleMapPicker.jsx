import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api'
import { MapPin } from 'lucide-react'

const fallbackCenter = { lat: 11.5564, lng: 104.9282 }

function InteractiveMap({ latitude, longitude, onChange }) {
  const { isLoaded, loadError } = useJsApiLoader({ id: 'market-google-map', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY })
  const center = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) ? { lat: Number(latitude), lng: Number(longitude) } : fallbackCenter
  if (loadError) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">Google Maps មិនអាចដំណើរការបាន។ សូមពិនិត្យ API Key។</p>
  if (!isLoaded) return <div className="grid h-72 place-items-center rounded-xl bg-slate-100 text-sm text-slate-500">កំពុងបើក Google Maps...</div>
  return <GoogleMap mapContainerClassName="h-72 w-full rounded-xl" center={center} zoom={15} onClick={event => onChange(event.latLng.lat(), event.latLng.lng())} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}>
    {latitude && longitude && <MarkerF position={center} draggable onDragEnd={event => onChange(event.latLng.lat(), event.latLng.lng())}/>} 
  </GoogleMap>
}

export default function GoogleMapPicker(props) {
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return <div className="rounded-xl border border-dashed bg-slate-50 p-6 text-center"><MapPin className="mx-auto text-slate-400" size={32}/><p className="mt-2 text-sm font-semibold">Google Map Picker មិនទាន់បានកំណត់</p><p className="mt-1 text-xs text-slate-500">បន្ថែម `VITE_GOOGLE_MAPS_API_KEY` ក្នុង `.env` ដើម្បី click និង drag marker លើផែនទី។</p>{props.latitude && props.longitude && <iframe title="Market location preview" className="mt-4 h-64 w-full rounded-xl border" loading="lazy" src={`https://maps.google.com/maps?q=${props.latitude},${props.longitude}&z=15&output=embed`}/>}</div>
  return <InteractiveMap {...props}/>
}
