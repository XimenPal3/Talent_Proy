import { useState } from 'react';

const emptyVacancy = {
  title: '',
  department: '',
  mode: '',
  min_experience: '',
  required_skills: '',
  required_certifications: '',
  required_education: '',
  description: '',
};

function toFormData(vacancy) {
  if (!vacancy) return emptyVacancy;
  return {
    ...vacancy,
    min_experience: String(vacancy.min_experience ?? 0),
    required_skills: (vacancy.required_skills || []).join(', '),
    required_certifications: (vacancy.required_certifications || []).join(', '),
  };
}

function VacancyForm({ vacancy, onSaveVacancy, onCancel }) {
  const [formData, setFormData] = useState(() => toFormData(vacancy));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const saved = await onSaveVacancy({
      ...(vacancy ? { id: vacancy.id } : {}),
      title: formData.title.trim(),
      department: formData.department.trim(),
      mode: formData.mode.trim(),
      min_experience: Number(formData.min_experience),
      required_skills: formData.required_skills.split(',').map((item) => item.trim()).filter(Boolean),
      required_certifications: formData.required_certifications.split(',').map((item) => item.trim()).filter(Boolean),
      required_education: formData.required_education.trim(),
      description: formData.description.trim(),
    });
    if (saved && !vacancy) setFormData(emptyVacancy);
  };

  return (
    <form className="panel vacancy-form" onSubmit={handleSubmit}>
      <h3>{vacancy ? 'Editar vacante' : 'Registrar vacante'}</h3>
      <fieldset className="vacancy-form-section">
        <legend>Información del puesto</legend>
        <div className="vacancy-fields">
          <label className="vacancy-field">
            <span>Título del puesto <span className="required-mark" aria-hidden="true">*</span></span>
            <input name="title" value={formData.title} onChange={handleChange} required maxLength="150" />
          </label>
          <label className="vacancy-field">
            <span>Departamento</span>
            <input name="department" value={formData.department} onChange={handleChange} />
          </label>
          <label className="vacancy-field">
            <span>Modalidad</span>
            <input name="mode" value={formData.mode} onChange={handleChange} />
          </label>
          <label className="vacancy-field">
            <span>Experiencia mínima (años) <span className="required-mark" aria-hidden="true">*</span></span>
            <input name="min_experience" type="number" min="0" step="0.5" value={formData.min_experience} onChange={handleChange} required />
          </label>
        </div>
      </fieldset>
      <fieldset className="vacancy-form-section">
        <legend>Requisitos del puesto</legend>
        <div className="vacancy-fields">
          <label className="vacancy-field">
            <span>Habilidades requeridas</span>
            <textarea name="required_skills" value={formData.required_skills} onChange={handleChange} rows="4" aria-describedby="skills-hint" />
            <small id="skills-hint">Separa cada habilidad con una coma.</small>
          </label>
          <label className="vacancy-field">
            <span>Certificaciones requeridas</span>
            <textarea name="required_certifications" value={formData.required_certifications} onChange={handleChange} rows="4" aria-describedby="certifications-hint" />
            <small id="certifications-hint">Separa cada certificación con una coma.</small>
          </label>
          <label className="vacancy-field vacancy-field--full">
            <span>Formación académica requerida</span>
            <textarea name="required_education" value={formData.required_education} onChange={handleChange} rows="3" />
          </label>
        </div>
      </fieldset>
      <fieldset className="vacancy-form-section">
        <legend>Descripción</legend>
        <div className="vacancy-fields">
          <label className="vacancy-field vacancy-field--full">
            <span>Descripción y otros requisitos</span>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="5" />
          </label>
        </div>
      </fieldset>
      <div className="form-actions">
        <button className="primary-button" type="submit">{vacancy ? 'Guardar cambios' : 'Guardar vacante'}</button>
        <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default VacancyForm;
