export const candidates = [
  {
    id: 1,
    name: 'Ana Morales',
    role: 'Desarrolladora Frontend',
    experience: 4,
    education: 'Ingeniería en Sistemas',
    skills: ['React', 'JavaScript', 'UI/UX'],
    status: 'En revisión',
    location: 'Guatemala',
    score: 92,
  },
  {
    id: 2,
    name: 'Carlos Rivas',
    role: 'Analista de Datos',
    experience: 6,
    education: 'Licenciatura en Estadística',
    skills: ['SQL', 'Power BI', 'Python'],
    status: 'Aprobado',
    location: 'Remoto',
    score: 88,
  },
  {
    id: 3,
    name: 'Marta López',
    role: 'Project Manager',
    experience: 8,
    education: 'Administración de Empresas',
    skills: ['Scrum', 'Liderazgo', 'Comunicación'],
    status: 'Pendiente',
    location: 'Ciudad de Guatemala',
    score: 84,
  },
];

export const metrics = [
  { label: 'Candidatos activos', value: '24', detail: 'En proceso de evaluación' },
  { label: 'Vacantes cubiertas', value: '6', detail: 'Con coincidencia alta' },
  { label: 'Tiempo promedio', value: '3.2 días', detail: 'Por revisión inicial' },
  { label: 'Compatibilidad', value: '78%', detail: 'Por perfil técnico' },
];

export const vacancies = [
  {
    id: 1,
    title: 'Frontend React',
    department: 'Tecnología',
    mode: 'Híbrido',
    experience: 2,
    requiredSkills: ['React', 'JavaScript', 'UI/UX'],
    assignedCandidates: [],
  },
  {
    id: 2,
    title: 'Analista QA',
    department: 'Calidad',
    mode: 'Remoto',
    experience: 3,
    requiredSkills: ['Testing', 'QA', 'Scrum'],
    assignedCandidates: [],
  },
  {
    id: 3,
    title: 'Especialista BI',
    department: 'Datos',
    mode: 'Presencial',
    experience: 4,
    requiredSkills: ['SQL', 'Power BI', 'Python'],
    assignedCandidates: [],
  },
];

export const stages = [
  { name: 'Recepción', percent: 100 },
  { name: 'Filtro inicial', percent: 75 },
  { name: 'Entrevista', percent: 45 },
  { name: 'Decision', percent: 25 },
];
