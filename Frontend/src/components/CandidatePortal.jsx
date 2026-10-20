function CandidatePortal({ candidate, onSignOut }) {
  return (
    <div className="candidate-portal">
      <header className="candidate-portal-header">
        <div>
          <p className="eyebrow">Seguimiento de postulación</p>
          <h1>Hola, {candidate.full_name}</h1>
          <p>Consulta el avance de tus postulaciones y los puestos asociados a tu perfil.</p>
        </div>
        <button className="secondary-button" onClick={onSignOut}>Cerrar sesión</button>
      </header>

      <section className="content-card candidate-process-card" aria-labelledby="candidate-process-title">
        <div className="candidate-process-heading">
          <div>
            <p className="eyebrow">Tu proceso</p>
            <h2 id="candidate-process-title">{candidate.desired_role}</h2>
          </div>
          <span className="status-pill">{candidate.status}</span>
        </div>

        {candidate.applications.length ? (
          <div className="candidate-applications">
            {candidate.applications.map((application) => (
              <article className="candidate-application" key={`${application.title}-${application.assigned_at}`}>
                <div>
                  <h3>{application.title}</h3>
                  {application.department && <p>{application.department}</p>}
                  {application.mode && <p>Modalidad: {application.mode}</p>}
                </div>
                <div className="candidate-application-status">
                  <span className="status-pill">{candidate.status}</span>
                  <small>Postulación registrada el {new Date(application.assigned_at).toLocaleDateString()}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="candidate-portal-empty">
            Aún no hay una vacante asociada a tu perfil. Comunícate con la persona reclutadora para consultar el estado de tu proceso.
          </p>
        )}

        <div className="candidate-process-history">
          <h3>Historial de etapas</h3>
          {candidate.status_history.length ? (
            <ol>
              {[...candidate.status_history].reverse().map((entry) => (
                <li key={`${entry.status}-${entry.changed_at}`}>
                  <strong>{entry.status}</strong>
                  <time dateTime={entry.changed_at}>{new Date(entry.changed_at).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="candidate-portal-empty">Todavía no hay actualizaciones del proceso.</p>
          )}
        </div>
        <p className="candidate-portal-note">
          Esta vista muestra únicamente el avance de tu perfil. Para preguntas sobre el proceso, contacta a la persona reclutadora.
        </p>
      </section>
    </div>
  );
}

export default CandidatePortal;
