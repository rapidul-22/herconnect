import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Share2, ShieldAlert } from 'lucide-react';
import { useApp, PageTitle } from './shared.jsx';
export default function SOS() {
 const {user}=useApp(); const [point,setPoint]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const contact=user?.emergencyPhone || '';
 const message='I need help. Please contact me.'+(point?' My location (captured '+new Date(point.at).toLocaleTimeString()+'): https://www.google.com/maps?q='+point.lat+','+point.lng:' My location is not available; please ask me where I am.');
 function locate(){
  if(!navigator.geolocation){setStatus('Location is unavailable. You can still call for help.');return;}
  setBusy(true);setStatus('Getting your location…');
  navigator.geolocation.getCurrentPosition(p=>{setPoint({lat:p.coords.latitude,lng:p.coords.longitude,at:Date.now(),accuracy:Math.round(p.coords.accuracy)});setBusy(false);setStatus('Location ready. Choose how to share it.');},()=>{setBusy(false);setStatus('Location permission was denied or unavailable. Call your contact and describe your location.');},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
 }
 async function share(){try{if(navigator.share){await navigator.share({title:'HerConnect help request',text:message});setStatus('Share sheet closed. Confirm delivery in the app you chose.');}else{await navigator.clipboard.writeText(message);setStatus('Message copied. Paste and send it to your trusted contact.');}}catch(e){setStatus(e.name==='AbortError'?'Sharing cancelled.':'Could not share. Copy the message below manually.');}}
 return <><PageTitle eyebrow="YOUR SAFETY TOOLKIT" title="Help, within reach." description="Call someone you trust, prepare your location, or find support." />
 <div className="sos-layout"><section className="safety-panel sos-primary"><ShieldAlert size={36}/><h2>Need urgent help?</h2><p>For an emergency in Bangladesh, call 999. This opens your device’s dialler; you must place the call. Desktop computers may not support calling.</p><a className="btn primary" href="tel:999"><Phone size={18}/>Call 999</a><p>HerConnect does not dispatch police, monitor this page, or send alerts automatically.</p></section>
 <section className="safety-panel"><h2>Your trusted contact</h2>{contact?<><p>{user.emergencyName || 'Emergency contact'} · {user.emergencyRelation}</p><a className="btn" href={'tel:'+contact}><Phone size={18}/>Call {contact}</a></>:<p>Add an emergency contact in your profile to call or prepare a message here.</p>}<Link className="btn" to={user?'/profile':'/login'}>{user?'Edit emergency contact':'Sign in to use your contact'}</Link></section>
 <section className="safety-panel"><h2>Share your location</h2><button className="btn" disabled={busy} onClick={locate}><MapPin size={18}/>{busy?'Locating…':point?'Refresh my location':'Get my location'}</button>{point&&<p>Accuracy approximately {point.accuracy} metres. Captured {new Date(point.at).toLocaleTimeString()}. This is a snapshot, not live tracking.</p>}<label>Help message<textarea readOnly value={message} rows={4}/></label><button className="btn" onClick={share}><Share2 size={18}/>Share / copy message</button>{contact&&<a className="btn" href={'sms:'+contact+'?body='+encodeURIComponent(message)}>Open SMS draft</a>}<p role="status">{status}</p><small>Opening a draft or share sheet does not send a message. Confirm the recipient and send it yourself.</small></section>
 <section className="safety-panel"><h2>More support</h2><p>Record a concern, review community patterns, or find support contacts.</p><Link className="btn" to="/safety/new">Write a report</Link><Link className="btn" to="/safety/resources">Support directory</Link><Link className="btn" to="/safety/zones">Area insights</Link></section></div></>;
}
