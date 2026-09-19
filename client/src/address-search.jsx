import { useEffect, useId, useState } from 'react';
import { api, useApp } from './shared.jsx';
export function AddressSearch({ title, value, onChange }) {
  const { user } = useApp(), id = useId();
  const [open, setOpen] = useState(false), [items, setItems] = useState([]),
    [active, setActive] = useState(-1), [message, setMessage] = useState('');
  const valid = Number.isFinite(value.lat) && Number.isFinite(value.lng);
  useEffect(() => {
    setItems([]); setActive(-1); setMessage('');
    if (!open || valid || !user || value.address.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setMessage('Finding addresses…');
      try {
        const data = await api('/transport/places?q=' + encodeURIComponent(value.address.trim()), { signal: controller.signal });
        if (!controller.signal.aborted) {
          setItems(data.places); setMessage(data.places.length ? 'Choose an address below.' : 'No matches. Try another landmark or choose a map point.');
        }
      } catch (e) { if (!controller.signal.aborted) setMessage(e.message); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.address, valid, open, user?._id]);
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
        onMouseDown={e => e.preventDefault()} onClick={() => choose(p)}>{p.address}</li>)}
    </ul>}
    <small role="status">{!user ? 'Sign in for address suggestions, or choose a point on the map.' : valid ? 'Location selected. You can adjust it on the map.' : message || 'Type at least 3 characters and select a suggestion.'}</small>
  </div>;
}
