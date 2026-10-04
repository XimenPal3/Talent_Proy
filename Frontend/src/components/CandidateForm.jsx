import { useState } from 'react';

const emptyCandidate = {
  full_name: '',
  email: '',
  phone: '',
  desired_role: '',
  years_experience: '',
  education: '',
  location: '',
  skills: '',
  certifications: '',
  experience_summary: '',
};

function toFormData(candidate) {
  if (!candidate) return emptyCandidate;
  return {
    ...candidate,
    years_experience: String(candidate.years_experience ?? 0),
    skills: (candidate.skills || []).join(', '),
    certifications: (candidate.certifications || []).join(', '),
  };
}

function CandidateForm({ candidate, onSaveCandidate, onCancel }) {
  const [formData, setFormData] = useState(() => toFormData(candidate));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const saved = await onSaveCandidate({
      ...(candidate ? { id: candidate.id } : {}),
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      desired_role: formData.desired_role.trim(),
      years_experience: Number(formData.years_experience),
      education: formData.education.trim(),
      location: formData.location.trim(),
      skills: formData.skills.split(',').map((item) => item.trim()).filter(Boolean),
      certifications: formData.certifications.split(',').map((item) => item.trim()).filter(Boolean),
      experience_summary: formData.experience_summary.trim(),
    });
    if (saved && !candidate) setFormData(emptyCandidate);
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h3>{candidate ? 'Editar perfil de candidato' : 'Registrar candidato'}</h3>
      <div className="filters">
        <input name="full_name" placeholder="Nombre completo" value={formData.full_name} onChange={handleChange} required maxLength="150" />
        <input name="email" type="email" placeholder="Correo electrónico" value={formData.email} onChange={handleChange} />
        <input name="phone" type="tel" placeholder="Teléfono" value={formData.phone} onChange={handleChange} />
        <input name="desired_role" placeholder="Puesto de interés" value={formData.desired_role} onChange={handleChange} required maxLength="150" />
        <input name="years_experience" type="number" min="0" step="0.5" placeholder="Años de experiencia" value={formData.years_experience} onChange={handleChange} required />
        <input name="education" placeholder="Formación académica" value={formData.education} onChange={handleChange} />
        <input name="location" placeholder="Ubicación" value={formData.location} onChange={handleChange} />
        <input name="skills" placeholder="Habilidades separadas por coma" value={formData.skills} onChange={handleChange} />
        <input name="certifications" placeholder="Certificaciones separadas por coma" value={formData.certifications} onChange={handleChange} />
        <textarea name="experience_summary" placeholder="Resumen de experiencia laboral" value={formData.experience_summary} onChange={handleChange} rows="3" />
      </div>
      <div className="form-actions">
        <button className="primary-button" type="submit">{candidate ? 'Guardar cambios' : 'Guardar candidato'}</button>
        {candidate && <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

export default CandidateForm;
