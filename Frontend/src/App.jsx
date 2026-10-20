import { useEffect, useMemo, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import CandidateForm from './components/CandidateForm';
import CandidateList, { candidateStages } from './components/CandidateList';
import CandidatePortal from './components/CandidatePortal';
import UserManagement from './components/UserManagement';
import VacancyForm from './components/VacancyForm';
import { api, setCsrfToken } from './lib/api';
import './index.css';

const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
const roleLabels = { admin: 'Administrador', hr: 'Recursos Humanos', viewer: 'Consulta', candidate: 'Candidato' };

function calculateCompatibility(candidate, vacancy) {
  const criteria = [];
  const requiredSkills = vacancy.required_skills || [];
  const requiredCertifications = vacancy.required_certifications || [];

  if (requiredSkills.length) {
    const candidateSkills = new Set((candidate.skills || []).map(normalize));
    const matched = requiredSkills.filter((skill) => candidateSkills.has(normalize(skill))).length;
    criteria.push({ weight: 50, score: matched / requiredSkills.length });
  }

  const minimumExperience = Number(vacancy.min_experience || 0);
  criteria.push({
    weight: 25,
    score: minimumExperience === 0 ? 1 : Math.min(Number(candidate.years_experience || 0) / minimumExperience, 1),
  });

  if (requiredCertifications.length) {
    const candidateCertifications = new Set((candidate.certifications || []).map(normalize));
    const matched = requiredCertifications.filter((item) => candidateCertifications.has(normalize(item))).length;
    criteria.push({ weight: 15, score: matched / requiredCertifications.length });
  }

  if (vacancy.required_education?.trim()) {
    criteria.push({
      weight: 10,
      score: normalize(candidate.education).includes(normalize(vacancy.required_education)) ? 1 : 0,
    });
  }

  const totalWeight = criteria.reduce((total, item) => total + item.weight, 0);
  return Math.round(criteria.reduce((total, item) => total + item.score * item.weight, 0) / totalWeight * 100);
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [candidateData, setCandidateData] = useState([]);
  const [candidatePortalData, setCandidatePortalData] = useState(null);
  const [vacancyData, setVacancyData] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [isCandidateFormOpen, setIsCandidateFormOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [isVacancyFormOpen, setIsVacancyFormOpen] = useState(false);
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState('Abierta');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api.get('/api/auth/session').then(({ user, csrfToken }) => {
      if (!mounted) return;
      setCsrfToken(csrfToken);
      setSession(user ? { user } : null);
      setProfile(user);
    }).catch((sessionError) => {
      if (!mounted) return;
      setError(sessionError.message);
    }).finally(() => {
      if (mounted) setAuthLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session || !profile) return;

    let mounted = true;
    if (profile.role === 'candidate') {
      setDataLoading(true);
      setError('');
      api.get('/api/candidate/portal').then((candidate) => {
        if (mounted) setCandidatePortalData(candidate);
      }).catch((loadError) => {
        if (mounted) setError(`No se pudo cargar tu proceso: ${loadError.message}`);
      }).finally(() => {
        if (mounted) setDataLoading(false);
      });
      return () => { mounted = false; };
    }

    const loadData = async () => {
      setDataLoading(true);
      setError('');
      try {
        const results = await Promise.all([
          api.get('/api/candidates'),
          api.get('/api/vacancies'),
          api.get('/api/assignments'),
          api.get('/api/candidates/history'),
        ]);
        if (!mounted) return;
        setCandidateData(results[0]);
        setVacancyData(results[1]);
        setAssignments(results[2]);
        setStatusHistory(results[3]);
      } catch (loadError) {
        if (mounted) setError(`No se pudieron cargar los datos: ${loadError.message}`);
      } finally {
        if (mounted) setDataLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [profile, session]);

  const canManage = profile?.role === 'admin' || profile?.role === 'hr';
  const isAdmin = profile?.role === 'admin';

  const skillOptions = useMemo(
    () => ['all', ...new Set(candidateData.flatMap((candidate) => candidate.skills || []))],
    [candidateData],
  );
  const statusOptions = useMemo(
    () => ['all', ...new Set(candidateData.map((candidate) => candidate.status))],
    [candidateData],
  );

  const vacancyMatches = useMemo(() => vacancyData.map((vacancy) => ({
    ...vacancy,
    recommendations: candidateData
      .map((candidate) => ({ ...candidate, matchScore: calculateCompatibility(candidate, vacancy) }))
      .filter((candidate) => candidate.matchScore >= 60)
      .sort((first, second) => second.matchScore - first.matchScore)
      .slice(0, 5),
  })), [candidateData, vacancyData]);

  const filteredCandidates = useMemo(() => candidateData.filter((candidate) => {
    const searchable = [
      candidate.full_name,
      candidate.desired_role,
      candidate.location,
      candidate.education,
      ...(candidate.skills || []),
      ...(candidate.certifications || []),
    ].join(' ').toLocaleLowerCase();
    return searchable.includes(search.toLocaleLowerCase())
      && (skillFilter === 'all' || (candidate.skills || []).includes(skillFilter))
      && (statusFilter === 'all' || candidate.status === statusFilter);
  }), [candidateData, search, skillFilter, statusFilter]);

  const dashboardMetrics = useMemo(() => {
    const matches = vacancyMatches.flatMap((vacancy) => vacancy.recommendations);
    const average = matches.length
      ? Math.round(matches.reduce((total, candidate) => total + candidate.matchScore, 0) / matches.length)
      : 0;
    return [
      { label: 'Perfiles registrados', value: String(candidateData.length), detail: 'Repositorio de candidatos' },
      { label: 'Vacantes abiertas', value: String(vacancyData.filter((vacancy) => vacancy.status === 'Abierta').length), detail: 'En proceso de reclutamiento' },
      { label: 'Postulaciones', value: String(assignments.length), detail: 'Candidatos asignados a vacantes' },
      { label: 'Compatibilidad promedio', value: `${average}%`, detail: 'Entre las coincidencias destacadas' },
    ];
  }, [assignments, candidateData, vacancyData, vacancyMatches]);

  const runMutation = async (operation, successMessage) => {
    setError('');
    setNotice('');
    try {
      const data = await operation;
      setNotice(successMessage);
      return data;
    } catch (operationError) {
      setError(`No se pudo completar la operación: ${operationError.message}`);
      return null;
    }
  };

  const saveCandidate = async (candidate) => {
    const isEditing = Boolean(candidate.id);
    const query = isEditing
      ? api.put(`/api/candidates/${candidate.id}`, candidate)
      : api.post('/api/candidates', candidate);
    const saved = await runMutation(query, isEditing ? 'Perfil actualizado.' : 'Candidato registrado.');
    if (saved) {
      setCandidateData((previous) => isEditing
        ? previous.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...previous]);
      setEditingCandidate(null);
      setIsCandidateFormOpen(false);
    }
    return Boolean(saved);
  };

  const changeCandidateStatus = async (candidateId, status) => {
    const updated = await runMutation(
      api.patch(`/api/candidates/${candidateId}/status`, { status }),
      'Etapa del candidato actualizada.',
    );
    if (!updated) return;
    setCandidateData((previous) => previous.map((item) => item.id === updated.id ? updated : item));
    try {
      const data = await api.get('/api/candidates/history');
      setStatusHistory(data);
    } catch (historyError) {
      setError(`El estado se actualizó, pero no se pudo recargar el historial: ${historyError.message}`);
    }
  };

  const saveVacancy = async (vacancy) => {
    const isEditing = Boolean(vacancy.id);
    const query = isEditing
      ? api.put(`/api/vacancies/${vacancy.id}`, vacancy)
      : api.post('/api/vacancies', vacancy);
    const saved = await runMutation(
      query,
      isEditing ? 'Vacante y criterios actualizados.' : 'Vacante registrada y criterios de compatibilidad actualizados.',
    );
    if (saved) {
      setVacancyData((previous) => isEditing
        ? previous.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...previous]);
      setEditingVacancy(null);
      setIsVacancyFormOpen(false);
    }
    return Boolean(saved);
  };

  const updateVacancyStatus = async (vacancyId, status) => {
    const updated = await runMutation(
      api.patch(`/api/vacancies/${vacancyId}/status`, { status }),
      `Vacante ${status.toLowerCase()}.`,
    );
    if (updated) setVacancyData((previous) => previous.map((item) => item.id === updated.id ? updated : item));
  };

  const signOut = async () => {
    try {
      await api.post('/api/auth/logout');
      setSession(null);
      setProfile(null);
      setCandidateData([]);
      setCandidatePortalData(null);
      setVacancyData([]);
      setAssignments([]);
      setStatusHistory([]);
    } catch (signOutError) {
      setError(`No se pudo cerrar la sesión: ${signOutError.message}`);
    }
  };

  const handleLogin = async (user) => {
    setSession({ user });
    setProfile(user);
    setError('');
  };

  const handleAssignCandidate = async (vacancyId, candidateId) => {
    const assignment = await runMutation(
      api.post('/api/assignments', { vacancy_id: vacancyId, candidate_id: candidateId }),
      'Candidato asignado a la vacante.',
    );
    if (assignment) setAssignments((previous) => [...previous, assignment]);
  };

  const renderDashboard = () => (
    <div className="content-card">
      <div className="section-title">
        <div><p className="eyebrow">Seguimiento</p><h2>Panel de selección</h2></div>
        {canManage && <button className="primary-button" onClick={() => setActiveView('candidates')}>Agregar candidato</button>}
      </div>
      <div className="metrics-grid">
        {dashboardMetrics.map((metric) => (
          <div key={metric.label} className="metric-card">
            <p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.detail}</span>
          </div>
        ))}
      </div>
      <div className="subsections">
        <div className="panel">
          <h3>Últimos candidatos</h3>
          {candidateData.slice(0, 5).map((candidate) => (
            <div className="dashboard-row" key={candidate.id}>
              <span>{candidate.full_name}<small>{candidate.desired_role}</small></span>
              <span className="status-pill">{candidate.status}</span>
            </div>
          ))}
          {!candidateData.length && <p className="empty-state">Aún no hay perfiles registrados.</p>}
        </div>
        <div className="panel">
          <h3>Etapas del proceso</h3>
          <div className="timeline">
            {candidateStages.map((stage) => {
              const count = candidateData.filter((candidate) => candidate.status === stage).length;
              const percent = candidateData.length ? Math.round(count / candidateData.length * 100) : 0;
              return (
                <div className="timeline-item" key={stage}>
                  <span>{stage}</span><div className="bar"><div style={{ width: `${percent}%` }} /></div><small>{count}</small>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCandidates = () => (
    <div className="content-card">
      {isCandidateFormOpen ? (
        <>
          <div className="vacancy-page-heading">
            <div>
              <p className="eyebrow">Gestión de talento</p>
              <h2>{editingCandidate ? 'Editar candidato' : 'Registrar candidato'}</h2>
              <p className="vacancy-page-description">Completa la información de contacto, perfil y experiencia.</p>
            </div>
          </div>
        <CandidateForm
          key={editingCandidate?.id || 'new-candidate'}
          candidate={editingCandidate}
          onSaveCandidate={saveCandidate}
          onCancel={() => {
            setEditingCandidate(null);
            setIsCandidateFormOpen(false);
          }}
        />
        </>
      ) : (
        <>
          <div className="vacancy-page-heading">
            <div>
              <p className="eyebrow">Gestión de talento</p>
              <h2>Perfiles de candidatos</h2>
              <p className="vacancy-page-description">Consulta y administra los perfiles registrados en el proceso de selección.</p>
            </div>
            {canManage && (
              <button
                className="primary-button vacancy-create-button"
                onClick={() => {
                  setEditingCandidate(null);
                  setIsCandidateFormOpen(true);
                }}
              >
                <span aria-hidden="true">+</span> Agregar candidato
              </button>
            )}
          </div>
          <div className="filters">
            <input type="search" placeholder="Buscar por nombre, puesto, formación o certificación" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
              {skillOptions.map((skill) => <option key={skill} value={skill}>{skill === 'all' ? 'Todas las habilidades' : skill}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((status) => <option key={status} value={status}>{status === 'all' ? 'Todas las etapas' : status}</option>)}
            </select>
          </div>
          <CandidateList
            candidates={filteredCandidates}
            canManage={canManage}
            onEdit={(candidate) => {
              setEditingCandidate(candidate);
              setIsCandidateFormOpen(true);
            }}
            onStatusChange={changeCandidateStatus}
            statusHistory={statusHistory}
          />
        </>
      )}
    </div>
  );

  const renderVacancies = () => {
    const visibleVacancies = vacancyStatusFilter === 'Todas'
      ? vacancyMatches
      : vacancyMatches.filter((vacancy) => vacancy.status === vacancyStatusFilter);
    const openVacancyCount = vacancyData.filter((vacancy) => vacancy.status === 'Abierta').length;

    return (
    <div className="content-card">
      {isVacancyFormOpen ? (
        <>
          <div className="section-title vacancy-page-heading">
            <div>
              <p className="eyebrow">Requerimientos y asignación</p>
              <h2>{editingVacancy ? 'Editar vacante' : 'Crear vacante'}</h2>
              <p className="vacancy-page-description">Completa los datos del puesto y define sus requisitos.</p>
            </div>
          </div>
        <VacancyForm
          key={editingVacancy?.id || 'new-vacancy'}
          vacancy={editingVacancy}
          onSaveVacancy={saveVacancy}
          onCancel={() => {
            setEditingVacancy(null);
            setIsVacancyFormOpen(false);
          }}
        />
        </>
      ) : (
        <>
          <div className="vacancy-page-heading">
            <div>
              <p className="eyebrow">Requerimientos y asignación</p>
              <h2>Vacantes disponibles</h2>
              <p className="vacancy-page-description">
                Consulta los puestos abiertos y revisa los perfiles que mejor se ajustan a cada uno.
              </p>
            </div>
            {canManage && (
              <button
                className="primary-button vacancy-create-button"
                onClick={() => {
                  setEditingVacancy(null);
                  setIsVacancyFormOpen(true);
                }}
              >
                <span aria-hidden="true">+</span> Crear vacante
              </button>
            )}
          </div>
          <div className="vacancy-toolbar">
            <div className="vacancy-filters" aria-label="Filtrar vacantes">
              {[
                { label: 'Abiertas', value: 'Abierta', count: openVacancyCount },
                { label: 'Todas', value: 'Todas', count: vacancyData.length },
              ].map((filter) => (
                <button
                  key={filter.value}
                  className={`vacancy-filter-button${vacancyStatusFilter === filter.value ? ' active' : ''}`}
                  type="button"
                  aria-pressed={vacancyStatusFilter === filter.value}
                  onClick={() => setVacancyStatusFilter(filter.value)}
                >
                  {filter.label}<span>{filter.count}</span>
                </button>
              ))}
            </div>
            <p className="vacancy-compatibility-note">
              La compatibilidad se calcula automáticamente y destaca perfiles con al menos 60%.
            </p>
          </div>
          <div className="vacancy-grid">
            {visibleVacancies.map((vacancy) => {
          const assignedIds = assignments.filter((assignment) => assignment.vacancy_id === vacancy.id).map((assignment) => assignment.candidate_id);
          return (
            <article key={vacancy.id} className="vacancy-card">
              <div className="candidate-top">
                <div><h3>{vacancy.title}</h3><p>{vacancy.department || 'Departamento no indicado'}</p></div>
                <span className={`status-pill${vacancy.status === 'Cerrada' ? ' status-pill--closed' : ''}`}>{vacancy.status}</span>
              </div>
              <div className="vacancy-facts">
                {vacancy.mode && <span>{vacancy.mode}</span>}
                <span>{vacancy.min_experience}+ años de experiencia</span>
              </div>
              {(vacancy.required_education || vacancy.required_skills?.length > 0 || vacancy.required_certifications?.length > 0) && (
                <dl className="vacancy-requirements">
                  {vacancy.required_education && <div><dt>Formación</dt><dd>{vacancy.required_education}</dd></div>}
                  {vacancy.required_skills?.length > 0 && <div><dt>Habilidades</dt><dd>{vacancy.required_skills.join(', ')}</dd></div>}
                  {vacancy.required_certifications?.length > 0 && <div><dt>Certificaciones</dt><dd>{vacancy.required_certifications.join(', ')}</dd></div>}
                </dl>
              )}
              {vacancy.description && <p className="vacancy-description">{vacancy.description}</p>}
              {canManage && (
                <div className="form-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setEditingVacancy(vacancy);
                      setIsVacancyFormOpen(true);
                    }}
                  >
                    Editar vacante
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => updateVacancyStatus(vacancy.id, vacancy.status === 'Abierta' ? 'Cerrada' : 'Abierta')}
                  >
                    {vacancy.status === 'Abierta' ? 'Cerrar vacante' : 'Reabrir vacante'}
                  </button>
                </div>
              )}
              <div className="match-section">
                <h4>Candidatos compatibles</h4>
                {vacancy.status === 'Abierta' && vacancy.recommendations.length > 0 ? vacancy.recommendations.map((candidate) => (
                  <div key={candidate.id} className="match-item">
                    <div><strong>{candidate.full_name}</strong><p>{candidate.desired_role}</p></div>
                    <div className="match-actions">
                      <span>{candidate.matchScore}%</span>
                      {canManage && (
                        <button disabled={assignedIds.includes(candidate.id)} onClick={() => handleAssignCandidate(vacancy.id, candidate.id)}>
                          {assignedIds.includes(candidate.id) ? 'Asignado' : 'Asignar'}
                        </button>
                      )}
                    </div>
                  </div>
                )) : <p className="empty-state">{vacancy.status === 'Cerrada' ? 'La vacante está cerrada.' : 'No hay candidatos que alcancen el 60% de compatibilidad.'}</p>}
              </div>
              {assignedIds.length > 0 && (
                <div className="assigned-section">
                  <h4>Postulantes asignados ({assignedIds.length})</h4>
                  {assignedIds.map((candidateId) => {
                    const candidate = candidateData.find((item) => item.id === candidateId);
                    return candidate ? <p key={candidateId}>{candidate.full_name} · {candidate.status}</p> : null;
                  })}
                </div>
              )}
            </article>
          );
            })}
            {!visibleVacancies.length && (
              <div className="vacancy-empty-state">
                <h3>{vacancyStatusFilter === 'Abierta' ? 'No hay vacantes abiertas' : 'Aún no hay vacantes'}</h3>
                <p>{vacancyStatusFilter === 'Abierta' ? 'Las vacantes abiertas aparecerán aquí para que puedas consultarlas.' : 'Crea una vacante para comenzar a organizar tu proceso de selección.'}</p>
                {canManage && vacancyStatusFilter === 'Abierta' && (
                  <button
                    className="primary-button"
                    onClick={() => {
                      setEditingVacancy(null);
                      setIsVacancyFormOpen(true);
                    }}
                  >
                    Crear vacante
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    );
  };

  const renderReports = () => (
    <div className="content-card">
      <div className="section-title">
        <div><p className="eyebrow">Analítica</p><h2>Reportes del proceso</h2></div>
      </div>
      <div className="metrics-grid">
        {dashboardMetrics.map((metric) => (
          <div key={metric.label} className="metric-card">
            <p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.detail}</span>
          </div>
        ))}
      </div>
      <div className="subsections">
        <div className="panel">
          <h3>Distribución por etapa</h3>
          {candidateStages.map((stage) => {
            const count = candidateData.filter((candidate) => candidate.status === stage).length;
            return <div className="dashboard-row" key={stage}><span>{stage}</span><strong>{count}</strong></div>;
          })}
        </div>
        <div className="panel">
          <h3>Compatibilidad por vacante</h3>
          {vacancyMatches.map((vacancy) => (
            <div className="dashboard-row" key={vacancy.id}>
              <span>{vacancy.title}<small>{vacancy.status}</small></span>
              <strong>{vacancy.recommendations.length} perfiles ≥ 60%</strong>
            </div>
          ))}
          {!vacancyMatches.length && <p className="empty-state">No hay vacantes para analizar.</p>}
        </div>
      </div>
    </div>
  );

  if (authLoading || (session && !profile && !error)) {
    return <div className="loading-screen">Conectando con TalentFlow...</div>;
  }
  if (!session) return <AuthScreen onLogin={handleLogin} backendError={error} />;
  if (profile?.role === 'candidate') {
    return (
      <main className="candidate-portal-shell">
        {dataLoading && <p className="notice">Cargando tu proceso...</p>}
        {error && (
          <div className="candidate-portal-error">
            <p className="error-notice" role="alert">{error}</p>
            <button className="secondary-button" onClick={signOut}>Cerrar sesión</button>
          </div>
        )}
        {candidatePortalData && !dataLoading && !error && (
          <CandidatePortal candidate={candidatePortalData} onSignOut={signOut} />
        )}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>TalentFlow</h1>
          <p>Gestión de candidatos y selección</p>
          <p className="role-label">{profile?.full_name || session.user.email} · {roleLabels[profile?.role] || 'Sin rol'}</p>
        </div>
        <nav className="nav-links">
          {[
            ['dashboard', 'Panel'],
            ['candidates', 'Candidatos'],
            ['vacancies', 'Vacantes'],
            ['reports', 'Reportes'],
          ].map(([view, label]) => (
            <button key={view} className={activeView === view ? 'active' : ''} onClick={() => setActiveView(view)}>{label}</button>
          ))}
          {isAdmin && <button className={activeView === 'users' ? 'active' : ''} onClick={() => setActiveView('users')}>Usuarios y permisos</button>}
        </nav>
        <div className="sidebar-footer">
          <p>Sesión iniciada</p>
          <button className="secondary-button" onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="main-content">
        {notice && <p className="notice">{notice}</p>}
        {error && <p className="error-notice" role="alert">{error}</p>}
        {dataLoading && <p className="notice">Cargando información...</p>}
        {profile && !dataLoading && activeView === 'dashboard' && renderDashboard()}
        {profile && !dataLoading && activeView === 'candidates' && renderCandidates()}
        {profile && !dataLoading && activeView === 'vacancies' && renderVacancies()}
        {profile && !dataLoading && activeView === 'reports' && renderReports()}
        {profile && !dataLoading && activeView === 'users' && isAdmin && <UserManagement session={session} />}
        {profile && error && !dataLoading && activeView === 'dashboard' && !candidateData.length && (
          <button className="secondary-button" onClick={() => window.location.reload()}>Volver a cargar</button>
        )}
        {!profile && error && <div className="content-card"><p className="error-notice" role="alert">{error}</p></div>}
      </main>
    </div>
  );
}

export default App;
