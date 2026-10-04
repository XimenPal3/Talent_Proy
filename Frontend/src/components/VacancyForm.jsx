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
    <form className="panel" onSubmit={handleSubmit}>
      <h3>{vacancy ? 'Editar vacante' : 'Registrar vacante'}</h3>
      <div className="filters">
        <input name="title" placeholder="Título del puesto" value={formData.title} onChange={handleChange} required maxLength="150" />
        <input name="department" placeholder="Departamento" value={formData.department} onChange={handleChange} />
        <input name="mode" placeholder="Modalidad" value={formData.mode} onChange={handleChange} />
        <input name="min_experience" type="number" min="0" step="0.5" placeholder="Experiencia mínima (años)" value={formData.min_experience} onChange={handleChange} required />
        <input name="required_skills" placeholder="Habilidades requeridas (separadas por coma)" value={formData.required_skills} onChange={handleChange} />
        <input name="required_certifications" placeholder="Certificaciones requeridas (separadas por coma)" value={formData.required_certifications} onChange={handleChange} />
        <input name="required_education" placeholder="Formación académica requerida" value={formData.required_education} onChange={handleChange} />
        <textarea name="description" placeholder="Descripción y otros requisitos" value={formData.description} onChange={handleChange} rows="3" />
      </div>
      <div className="form-actions">
        <button className="primary-button" type="submit">{vacancy ? 'Guardar cambios' : 'Guardar vacante'}</button>
        {vacancy && <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

export default VacancyForm;
