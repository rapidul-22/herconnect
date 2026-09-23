import { useEffect, useId, useState } from 'react';
import { localSuggestions } from '../../shared/places.js';
import { api, useApp } from './shared.jsx';
export function AddressSearch({ title, value, onChange }) {
  const { user } = useApp(), id = useId();
  const [open, setOpen] = useState(false), [items, setItems] = useState([]),
    [active, setActive] = useState(-1), [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const valid = Number.isFinite(value.lat) && Number.isFinite(value.lng);
  useEffect(() => {
    setItems([]); setActive(-1); setMessage(''); setFailed(false);
    if (!open || valid || value.address.trim().length < 2) return;
    const local = localSuggestions(value.address);
    setItems(local);
    setMessage(local.length ? 'Local area suggestions — confirm the exact point on the map.' : 'Searching…');
    if (!user) { setMessage('Local areas only. Sign in to search live addresses.'); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setMessage('Finding addresses…');
      try {
        const data = await api('/transport/places?q=' + encodeURIComponent(value.address.trim()), { signal: controller.signal });
        if (!controller.signal.aborted) {
          const live = data.places || [];
          setItems([...live, ...local.filter(p => !live.some(v => v.address === p.address))].slice(0,8));
          setMessage(live.length ? 'Choose an address below.' : local.length ? 'Local area suggestions. Confirm the precise point on the map.' : 'No matches. Try a nearby landmark or select a map point.');
        }
      } catch (e) { if (!controller.signal.aborted) { setMessage((local.length ? 'Showing approximate local areas. ' : '') + e.message); setFailed(true); } }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.address, valid, open, user?._id, attempt]);
  const choose = item => { onChange(item); setOpen(false); setItems([]); setMessage(''); };
  return <div className="address-search" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>{title} address or landmark</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-controls={id + '-options'}
      aria-expanded={open && items.length > 0} aria-activedescendant={active >= 0 && open ? id + '-option-' + active : undefined}
      autoComplete="off" required minLength={3} maxLength={160} value={value.address}
      placeholder="Search a place in Bangladesh" onFocus={() => setOpen(true)}
      onChange={e => { onChange({ address: e.target.value, lat: '', lng: '' }); setOpen(true); setItems([]); setActive(-1); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1); }
        if (items.length && ['ArrowDown','ArrowUp'].includes(e.key)) {
          e.preventDefault(); setOpen(true); setActive(i => (i + (e.key === 'ArrowDown' ? 1 : items.length - 1) + items.length) % items.length);
        }
        if (e.key === 'Enter' && open && items.length) { e.preventDefault(); choose(items[active >= 0 ? active : 0]); }
      }} />
    {open && items.length > 0 && <ul id={id + '-options'} role="listbox" aria-label={title + ' suggestions'}>
      {items.map((p, i) => <li id={id + '-option-' + i} key={i} role="option" aria-selected={i === active}
        onMouseDown={e => e.preventDefault()} onClick={() => choose(p)}>{p.address}{p.source === 'local' && <small>Approximate area · confirm on map</small>}</li>)}
    </ul>}
    {failed && open && <button type="button" className="btn" onClick={() => setAttempt(n => n + 1)}>Retry address search</button>}
    <small role="status">{valid ? (value.source === 'local' ? 'Approximate area selected. Adjust the actual pickup or destination on the map.' : 'Location selected. You can adjust it on the map.') : message || 'Type at least 2 characters. Matching places appear here as you type.'}</small>
  </div>;
}
