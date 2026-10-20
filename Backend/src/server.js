import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const sessionSecret = process.env.SESSION_SECRET;
const PgSession = connectPgSimple(session);

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET debe estar configurado con al menos 32 caracteres.');
}

app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(session({
  name: 'talentflow.sid',
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const validEmail = (email) => typeof email === 'string'
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  && email.length <= 254;
const validUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const roles = new Set(['admin', 'hr', 'viewer', 'candidate']);
const stages = new Set(['Recepción', 'Filtro inicial', 'Entrevista', 'Evaluación', 'Oferta', 'Contratado', 'Rechazado']);

const csrfToken = (req) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString('hex');
  return req.session.csrfToken;
};

const requireCsrf = (req, res, next) => {
  const origin = req.get('origin');
  if (origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Origen de solicitud no permitido.' });
  }
  const supplied = req.get('x-csrf-token') || '';
  const expected = req.session.csrfToken || '';
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (!expected || suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return res.status(403).json({ error: 'La solicitud expiró. Recarga la aplicación e inténtalo de nuevo.' });
  }
  next();
};

const requireAuth = asyncRoute(async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  const { rows } = await pool.query(
    'select id, email, full_name, role, candidate_id from users where id = $1',
    [req.session.userId],
  );
  if (!rows[0]) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'La cuenta ya no está disponible. Inicia sesión de nuevo.' });
  }
  req.user = rows[0];
  next();
});

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permiso para realizar esta operación.' });
  }
  next();
};

const validateList = (value, fieldName) => {
  if (!Array.isArray(value) || value.length > 100
    || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > 150)) {
    throw new Error(`${fieldName} debe ser una lista de textos válidos.`);
  }
  return value.map((item) => item.trim());
};

const candidateFields = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('El perfil no es válido.');
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const desiredRole = typeof body.desired_role === 'string' ? body.desired_role.trim() : '';
  const yearsExperience = Number(body.years_experience);
  if (!fullName || fullName.length > 150 || !desiredRole || desiredRole.length > 150) {
    throw new Error('El nombre y el puesto son obligatorios y deben tener hasta 150 caracteres.');
  }
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 80) {
    throw new Error('Los años de experiencia deben estar entre 0 y 80.');
  }
  const textField = (name, maxLength = 2000) => {
    const value = body[name] ?? '';
    if (typeof value !== 'string' || value.length > maxLength) throw new Error(`El campo ${name} no es válido.`);
    return value.trim();
  };
  return {
    full_name: fullName,
    email: textField('email', 254),
    phone: textField('phone', 50),
    desired_role: desiredRole,
    years_experience: yearsExperience,
    education: textField('education', 250),
    location: textField('location', 250),
    skills: validateList(body.skills ?? [], 'Las habilidades'),
    certifications: validateList(body.certifications ?? [], 'Las certificaciones'),
    experience_summary: textField('experience_summary'),
  };
};

const vacancyFields = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('La vacante no es válida.');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const minExperience = Number(body.min_experience);
  if (!title || title.length > 150) throw new Error('El título de la vacante es obligatorio (máximo 150 caracteres).');
  if (!Number.isFinite(minExperience) || minExperience < 0 || minExperience > 80) {
    throw new Error('La experiencia mínima debe estar entre 0 y 80.');
  }
  const textField = (name, maxLength = 2000) => {
    const value = body[name] ?? '';
    if (typeof value !== 'string' || value.length > maxLength) throw new Error(`El campo ${name} no es válido.`);
    return value.trim();
  };
  return {
    title,
    department: textField('department', 250),
    mode: textField('mode', 100),
    min_experience: minExperience,
    required_skills: validateList(body.required_skills ?? [], 'Las habilidades requeridas'),
    required_certifications: validateList(body.required_certifications ?? [], 'Las certificaciones requeridas'),
    required_education: textField('required_education', 250),
    description: textField('description'),
  };
};

const withDatabaseError = (res, error) => {
  console.error('Error de base de datos:', error);
  if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (error.code === '23503') return res.status(404).json({ error: 'No se encontró el registro relacionado.' });
  if (error.code === '23514' || error.code === '22P02' || error.code === '22003') {
    return res.status(400).json({ error: 'Los datos enviados no son válidos.' });
  }
  return res.status(500).json({ error: 'Ocurrió un error al consultar la base de datos.' });
};

app.get('/health', asyncRoute(async (_req, res) => {
  await pool.query('select 1');
  res.json({ status: 'ok', service: 'talentflow-backend', database: 'connected' });
}));

app.get('/api/auth/session', (req, res) => {
  const token = csrfToken(req);
  if (!req.session.userId) return res.json({ user: null, csrfToken: token });
  pool.query('select id, email, full_name, role from users where id = $1', [req.session.userId])
    .then(({ rows }) => res.json({ user: rows[0] || null, csrfToken: token }))
    .catch((error) => {
      console.error('No se pudo cargar la sesión:', error);
      res.status(500).json({ error: 'No se pudo cargar la sesión.' });
    });
});

const loginAttempts = new Map();
const loginKey = (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`;
app.post('/api/auth/login', requireCsrf, asyncRoute(async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!validEmail(email) || !password || password.length > 200) {
    return res.status(400).json({ error: 'Correo electrónico o contraseña no válidos.' });
  }

  const key = loginKey(req);
  const attempts = loginAttempts.get(key);
  if (attempts && attempts.count >= 5 && Date.now() - attempts.firstAttempt < 15 * 60 * 1000) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.' });
  }

  const { rows } = await pool.query(
    'select id, email, full_name, password_hash, role from users where email = $1',
    [email],
  );
  const user = rows[0];
  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, '$2a$12$C6UzMDM.H6dfI/f/IKcEe.4g1wftD7oGCJRXLUahypkVFu8iA1io.');
  if (!user || !passwordMatches) {
    const previous = loginAttempts.get(key);
    loginAttempts.set(key, {
      count: previous && Date.now() - previous.firstAttempt < 15 * 60 * 1000 ? previous.count + 1 : 1,
      firstAttempt: previous && Date.now() - previous.firstAttempt < 15 * 60 * 1000 ? previous.firstAttempt : Date.now(),
    });
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  loginAttempts.delete(key);
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.userId = user.id;
    const sessionUser = { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
    const newCsrfToken = csrfToken(req);
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.json({ user: sessionUser, csrfToken: newCsrfToken });
    });
  });
}));

app.post('/api/auth/logout', requireCsrf, requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('talentflow.sid', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.status(204).end();
  });
});

app.get('/api/candidates', requireAuth, requireRole('admin', 'hr', 'viewer'), asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('select * from candidates order by created_at desc');
  res.json(rows);
}));

app.post('/api/candidates', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  let fields;
  try { fields = candidateFields(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const { rows } = await pool.query(
      `insert into candidates
       (full_name, email, phone, desired_role, years_experience, education, location, skills, certifications, experience_summary, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [...Object.values(fields), req.user.id],
    );
    res.status(201).json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.put('/api/candidates/:id', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  if (!validUuid(req.params.id)) return res.status(400).json({ error: 'El identificador del candidato no es válido.' });
  let fields;
  try { fields = candidateFields(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const { rows } = await pool.query(
      `update candidates set full_name=$1,email=$2,phone=$3,desired_role=$4,years_experience=$5,
       education=$6,location=$7,skills=$8,certifications=$9,experience_summary=$10
       where id=$11 returning *`,
      [...Object.values(fields), req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'No se encontró el candidato.' });
    res.json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.patch('/api/candidates/:id/status', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!validUuid(id) || !stages.has(status)) return res.status(400).json({ error: 'El identificador o la etapa no son válidos.' });
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.current_user_id', $1, true)", [req.user.id]);
    const { rows } = await client.query('update candidates set status=$1, updated_at=now() where id=$2 returning *', [status, id]);
    await client.query('commit');
    if (!rows[0]) return res.status(404).json({ error: 'No se encontró el candidato.' });
    res.json(rows[0]);
  } catch (error) {
    await client.query('rollback');
    withDatabaseError(res, error);
  } finally { client.release(); }
}));

app.get('/api/candidates/history', requireAuth, requireRole('admin', 'hr', 'viewer'), asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('select * from candidate_status_history order by changed_at asc');
  res.json(rows);
}));

app.get('/api/vacancies', requireAuth, requireRole('admin', 'hr', 'viewer'), asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('select * from vacancies order by created_at desc');
  res.json(rows);
}));

app.post('/api/vacancies', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  let fields;
  try { fields = vacancyFields(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const { rows } = await pool.query(
      `insert into vacancies (title, department, mode, min_experience, required_skills, required_certifications,
       required_education, description, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [...Object.values(fields), req.user.id],
    );
    res.status(201).json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.put('/api/vacancies/:id', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  if (!validUuid(req.params.id)) return res.status(400).json({ error: 'El identificador de la vacante no es válido.' });
  let fields;
  try { fields = vacancyFields(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const { rows } = await pool.query(
      `update vacancies set title=$1, department=$2, mode=$3, min_experience=$4, required_skills=$5,
       required_certifications=$6, required_education=$7, description=$8 where id=$9 returning *`,
      [...Object.values(fields), req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'No se encontró la vacante.' });
    res.json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.patch('/api/vacancies/:id/status', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  const { status } = req.body || {};
  if (!validUuid(req.params.id) || !['Abierta', 'Cerrada'].includes(status)) {
    return res.status(400).json({ error: 'El identificador o estado de la vacante no son válidos.' });
  }
  try {
    const { rows } = await pool.query('update vacancies set status=$1 where id=$2 returning *', [status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No se encontró la vacante.' });
    res.json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.get('/api/candidate/portal', requireAuth, requireRole('candidate'), asyncRoute(async (req, res) => {
  const candidateId = req.user.candidate_id;
  if (!candidateId) return res.status(403).json({ error: 'La cuenta no está vinculada a un perfil de candidato.' });

  const { rows } = await pool.query(
    `select c.id, c.full_name, c.email, c.phone, c.desired_role, c.years_experience, c.education,
            c.location, c.skills, c.certifications, c.experience_summary, c.status,
            coalesce((
              select json_agg(json_build_object(
                'title', v.title,
                'department', v.department,
                'mode', v.mode,
                'vacancy_status', v.status,
                'assigned_at', a.assigned_at
              ) order by a.assigned_at desc)
              from assignments a
              join vacancies v on v.id = a.vacancy_id
              where a.candidate_id = c.id
            ), '[]'::json) as applications,
            coalesce((
              select json_agg(json_build_object('status', h.status, 'changed_at', h.changed_at) order by h.changed_at asc)
              from candidate_status_history h
              where h.candidate_id = c.id
            ), '[]'::json) as status_history
     from candidates c
     where c.id = $1`,
    [candidateId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'No se encontró el perfil asociado a esta cuenta.' });
  res.json(rows[0]);
}));

app.get('/api/assignments', requireAuth, requireRole('admin', 'hr', 'viewer'), asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('select id, candidate_id, vacancy_id, assigned_at from assignments order by assigned_at desc');
  res.json(rows);
}));

app.post('/api/assignments', requireAuth, requireRole('admin', 'hr'), requireCsrf, asyncRoute(async (req, res) => {
  const { candidate_id: candidateId, vacancy_id: vacancyId } = req.body || {};
  if (!validUuid(candidateId) || !validUuid(vacancyId)) {
    return res.status(400).json({ error: 'Selecciona un candidato y una vacante válidos.' });
  }
  try {
    const { rows } = await pool.query(
      'insert into assignments (candidate_id, vacancy_id, assigned_by) values ($1,$2,$3) returning id,candidate_id,vacancy_id,assigned_at',
      [candidateId, vacancyId, req.user.id],
    );
    res.status(201).json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.get('/api/admin/users', requireAuth, requireRole('admin'), asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `select u.id, u.email, u.full_name, u.role, u.candidate_id, c.full_name as candidate_name, u.created_at
     from users u left join candidates c on c.id = u.candidate_id order by u.created_at`,
  );
  res.json(rows);
}));

app.post('/api/admin/users', requireAuth, requireRole('admin'), requireCsrf, asyncRoute(async (req, res) => {
  const { email: rawEmail, full_name: fullName, password, role, candidate_id: candidateId } = req.body || {};
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!validEmail(email) || typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 120) {
    return res.status(400).json({ error: 'Indica un nombre y correo electrónico válidos.' });
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 12 y 200 caracteres.' });
  }
  if (!['hr', 'viewer', 'candidate'].includes(role)) {
    return res.status(400).json({ error: 'El rol para nuevos usuarios no es válido.' });
  }
  if (role === 'candidate' && !validUuid(candidateId)) {
    return res.status(400).json({ error: 'Selecciona el perfil de candidato que se vinculará a esta cuenta.' });
  }
  if (role !== 'candidate' && candidateId) {
    return res.status(400).json({ error: 'Solo las cuentas de candidato pueden vincularse a un perfil.' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `insert into users (email, full_name, password_hash, role, candidate_id)
       values ($1,$2,$3,$4,$5)
       returning id,email,full_name,role,candidate_id,created_at`,
      [email, fullName.trim(), hash, role, role === 'candidate' ? candidateId : null],
    );
    res.status(201).json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.patch('/api/admin/users/:id/role', requireAuth, requireRole('admin'), requireCsrf, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  if (!validUuid(id) || !roles.has(role)) return res.status(400).json({ error: 'El identificador o rol no son válidos.' });
  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'No puedes quitarte a ti mismo el rol de administrador.' });
  }
  try {
    if (role === 'candidate') {
      const { rows: currentUsers } = await pool.query('select candidate_id from users where id=$1', [id]);
      if (!currentUsers[0]) return res.status(404).json({ error: 'No se encontró el usuario.' });
      if (!currentUsers[0].candidate_id) {
        return res.status(400).json({ error: 'Para asignar el rol Candidato, crea la cuenta desde un perfil vinculado.' });
      }
    }
    const { rows } = await pool.query(
      `update users set role=$1, candidate_id=case when $1='candidate' then candidate_id else null end
       where id=$2 returning id,email,full_name,role,candidate_id,created_at`,
      [role, id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'No se encontró el usuario.' });
    res.json(rows[0]);
  } catch (error) { withDatabaseError(res, error); }
}));

app.use((error, _req, res, _next) => {
  console.error('Error inesperado de API:', error);
  res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la solicitud.' });
});

const start = async () => {
  await pool.query('select 1');
  const migration = await pool.connect();
  try {
    await migration.query('begin');
    await migration.query('alter table users add column if not exists candidate_id uuid references candidates(id) on delete set null');
    await migration.query('alter table users drop constraint if exists users_role_check');
    await migration.query("alter table users add constraint users_role_check check (role in ('admin', 'hr', 'viewer', 'candidate'))");
    await migration.query('alter table users drop constraint if exists users_candidate_role_check');
    await migration.query(
      "alter table users add constraint users_candidate_role_check check ((role = 'candidate' and candidate_id is not null) or (role <> 'candidate' and candidate_id is null))",
    );
    await migration.query('create unique index if not exists users_candidate_id_unique_idx on users(candidate_id)');
    await migration.query('commit');
  } catch (error) {
    await migration.query('rollback');
    throw error;
  } finally {
    migration.release();
  }
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@talentflow.local').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'TalentFlowDemo2026!';
  const adminName = process.env.ADMIN_NAME || 'Administrador TalentFlow';
  if (!validEmail(adminEmail) || adminPassword.length < 12) {
    throw new Error('ADMIN_EMAIL debe ser válido y ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }
  const existingAdmin = await pool.query('select id from users where email=$1', [adminEmail]);
  if (!existingAdmin.rows[0]) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      "insert into users (email, full_name, password_hash, role) values ($1,$2,$3,'admin') on conflict (email) do nothing",
      [adminEmail, adminName, passwordHash],
    );
    console.log(`Cuenta de demostración preparada para ${adminEmail}.`);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend escuchando en http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error('No se pudo iniciar TalentFlow:', error);
  process.exitCode = 1;
});
