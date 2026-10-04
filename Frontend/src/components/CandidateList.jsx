export const candidateStages = ['Recepción', 'Filtro inicial', 'Entrevista', 'Evaluación', 'Oferta', 'Contratado', 'Rechazado'];

function CandidateList({ candidates, canManage, onEdit, onStatusChange, statusHistory }) {
  if (!candidates.length) {
    return <p className="empty-state">No hay perfiles que coincidan con la búsqueda.</p>;
  }

  return (
    <div className="candidate-grid">
      {candidates.map((candidate) => {
        const history = statusHistory.filter((event) => event.candidate_id === candidate.id);
        return (
          <article key={candidate.id} className="candidate-card">
            <div className="candidate-top">
              <div>
                <h3>{candidate.full_name}</h3>
                <p>{candidate.desired_role}</p>
              </div>
              <span className="status-pill">{candidate.status}</span>
            </div>
            <p className="candidate-meta">
              {candidate.years_experience} años · {candidate.education || 'Formación no indicada'}
            </p>
            <p className="candidate-meta">{[candidate.location, candidate.email, candidate.phone].filter(Boolean).join(' · ')}</p>
            {candidate.experience_summary && <p>{candidate.experience_summary}</p>}
            <div className="skills-list">
              {(candidate.skills || []).map((skill) => <span key={skill}>{skill}</span>)}
              {(candidate.certifications || []).map((certification) => <span key={certification}>Cert.: {certification}</span>)}
            </div>
            {canManage && (
              <div className="candidate-controls">
                <label>
                  Etapa del proceso
                  <select value={candidate.status} onChange={(event) => onStatusChange(candidate.id, event.target.value)}>
                    {candidateStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                </label>
                <button className="secondary-button" type="button" onClick={() => onEdit(candidate)}>Editar perfil</button>
              </div>
            )}
            <details className="history-details">
              <summary>Historial de etapas ({history.length})</summary>
              {history.length ? (
                <ul className="history-list">
                  {[...history].reverse().map((event) => (
                    <li key={event.id}>
                      <span>{event.status}</span>
                      <time dateTime={event.changed_at}>{new Date(event.changed_at).toLocaleString()}</time>
                    </li>
                  ))}
                </ul>
              ) : <p className="empty-state">Aún no hay cambios registrados.</p>}
            </details>
          </article>
        );
      })}
    </div>
  );
}

export default CandidateList;
