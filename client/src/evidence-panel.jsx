import { useState } from 'react';
import { api, Field } from './shared.jsx';

export function EvidencePanel({ report, onDone, canEdit = true }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function upload(e) {
    e.preventDefault();
    const form = e.currentTarget, body = new FormData(form), image = body.get('image');
    if (!image?.size || image.size > 5 * 1024 * 1024) {
      setError('Choose one image under 5 MB.'); return;
    }
    setBusy(true); setError('');
    try {
      await api('/reports/' + report._id + '/evidence', { method: 'POST', body });
      form.reset(); await onDone();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError('');
    try { await api('/reports/' + report._id + '/evidence/' + id, { method: 'DELETE' }); await onDone(); }
    catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="evidence-upload">
    <h3>Incident, person or vehicle photos</h3>
    <p>Private: only the reporter and moderators can view these photos. Other ride participants cannot see them. Up to three photos, 5 MB each. Image metadata is removed.</p>
    <p>Use relevant, non-intimate images. A person shown in a report has not been proven guilty.</p>
    <div className="evidence-grid">{(report.evidence || []).map(p => <figure key={p._id}>
      <img src={'/api/reports/' + report._id + '/evidence/' + p._id} alt={p.caption || (p.kind || 'Incident') + ' evidence'} />
      <figcaption>{p.kind || 'Incident'}{p.caption ? ': ' + p.caption : ''}</figcaption>
      {canEdit && <button className="btn" type="button" disabled={busy} onClick={() => remove(p._id)}>Remove photo</button>}
    </figure>)}</div>
    {canEdit && (report.evidence || []).length < 3 && <form onSubmit={upload}>
      <fieldset disabled={busy}>
        <Field label="Photo type" name="kind" as="select"><option>Incident</option><option>Person</option><option>Vehicle</option></Field>
        <Field label="Private photo description (optional)" name="caption" maxLength={200} />
        <Field label="Choose photo (JPEG, PNG or WebP)" name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
        <button className="btn primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload private photo'}</button>
      </fieldset>
    </form>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
