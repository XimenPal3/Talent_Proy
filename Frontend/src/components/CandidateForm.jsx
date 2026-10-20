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
    <form className="panel candidate-form" onSubmit={handleSubmit}>
      <h3>{candidate ? 'Editar perfil de candidato' : 'Registrar candidato'}</h3>
      <fieldset className="form-section">
        <legend>Información personal y de contacto</legend>
        <div className="vacancy-fields">
          <label className="vacancy-field">
            <span>Nombre completo <span className="required-mark" aria-hidden="true">*</span></span>
            <input name="full_name" value={formData.full_name} onChange={handleChange} required maxLength="150" />
          </label>
          <label className="vacancy-field">
            <span>Correo electrónico</span>
            <input name="email" type="email" value={formData.email} onChange={handleChange} />
          </label>
          <label className="vacancy-field">
            <span>Teléfono</span>
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} />
          </label>
          <label className="vacancy-field">
            <span>Ubicación</span>
            <input name="location" value={formData.location} onChange={handleChange} />
          </label>
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>Perfil profesional</legend>
        <div className="vacancy-fields">
          <label className="vacancy-field">
            <span>Puesto de interés <span className="required-mark" aria-hidden="true">*</span></span>
            <input name="desired_role" value={formData.desired_role} onChange={handleChange} required maxLength="150" />
          </label>
          <label className="vacancy-field">
            <span>Años de experiencia <span className="required-mark" aria-hidden="true">*</span></span>
            <input name="years_experience" type="number" min="0" step="0.5" value={formData.years_experience} onChange={handleChange} required />
          </label>
          <label className="vacancy-field vacancy-field--full">
            <span>Formación académica</span>
            <textarea name="education" value={formData.education} onChange={handleChange} rows="3" />
          </label>
          <label className="vacancy-field">
            <span>Habilidades</span>
            <textarea name="skills" value={formData.skills} onChange={handleChange} rows="4" aria-describedby="candidate-skills-hint" />
            <small id="candidate-skills-hint">Separa cada habilidad con una coma.</small>
          </label>
          <label className="vacancy-field">
            <span>Certificaciones</span>
            <textarea name="certifications" value={formData.certifications} onChange={handleChange} rows="4" aria-describedby="candidate-certifications-hint" />
            <small id="candidate-certifications-hint">Separa cada certificación con una coma.</small>
          </label>
          <label className="vacancy-field vacancy-field--full">
            <span>Resumen de experiencia laboral</span>
            <textarea name="experience_summary" value={formData.experience_summary} onChange={handleChange} rows="5" />
          </label>
        </div>
      </fieldset>
      <div className="form-actions">
        <button className="primary-button" type="submit">{candidate ? 'Guardar cambios' : 'Guardar candidato'}</button>
        <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default CandidateForm;
