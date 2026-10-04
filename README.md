# Proyecto de Graduación - TalentFlow

TalentFlow centraliza perfiles de candidatos y vacantes para apoyar el reclutamiento. Permite filtrar candidatos, comparar habilidades, experiencia, formación y certificaciones con los criterios de cada vacante, dar seguimiento a las etapas del proceso y asignar postulantes.

## Funcionalidades

- Inicio de sesión local con sesiones en el servidor.
- Perfiles de candidatos con datos de contacto, formación, experiencia laboral, habilidades y certificaciones.
- Búsqueda y filtrado de perfiles; edición de información e historial de etapas.
- Registro y cierre/reapertura de vacantes con criterios de selección.
- Cálculo automático de compatibilidad y asignación de candidatos.
- Roles de Administrador, Recursos Humanos y Consulta. Los dos primeros pueden gestionar candidatos y vacantes; solo Administración puede crear usuarios y cambiar roles.
- PostgreSQL local en Docker para candidatos, vacantes, usuarios, asignaciones e historial.
- Contraseñas protegidas con bcrypt; las sesiones usan cookies `httpOnly`, `SameSite=Strict`, expiración y protección CSRF.

## Requisitos

- Docker Desktop con Docker Compose.
- Node.js y npm para ejecutar la interfaz web.

No hace falta crear una cuenta, obtener credenciales de Supabase ni conectarse a un servicio externo.

## Iniciar la demostración local

1. Desde una terminal PowerShell, inicia PostgreSQL y la API:

   ```powershell
   cd Backend
   Copy-Item .env.example .env
   docker compose up --build -d
   ```

   Docker crea la base de datos y las tablas la primera vez y configura automáticamente el administrador inicial.

2. En otra terminal, ejecuta la interfaz:

   ```powershell
   cd Frontend
   npm install
   npm run dev
   ```

3. Abre <http://localhost:5173> e inicia sesión con las credenciales locales predeterminadas:

   - Correo: `admin@talentflow.local`
   - Contraseña: `TalentFlowDemo2026!`

La API queda en `http://localhost:3001/health`; PostgreSQL solo se publica en `127.0.0.1:5432`. Los valores del `.env.example` son para una demostración local. Cambia las contraseñas y el secreto de sesión antes de usarla en una red o despliegue real. No expongas el puerto de PostgreSQL a Internet.

## Configuración local

`Backend/.env.example` define la contraseña de base de datos, el secreto de sesión y las credenciales del administrador inicial. Al copiarlo a `Backend/.env`, reemplaza `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres. En PowerShell puedes generar una con:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

El backend aplica `Backend/init.sql` cuando se crea por primera vez el volumen de PostgreSQL. Si editas ese SQL después de inicializar la base, deberás aplicar los cambios manualmente o recrear el volumen. **Recrear el volumen elimina los datos de la demostración.**

Para detener la aplicación, desde `Backend` ejecuta:

```powershell
docker compose down
```

Los datos permanecen en el volumen `talentflow-postgres` y se recuperan al volver a iniciar los contenedores.

## Seguridad y alcance

- Las contraseñas se almacenan como hashes bcrypt con factor de costo 12; nunca se guardan en texto plano.
- Las consultas SQL usan parámetros, y las operaciones de escritura requieren autenticación, rol autorizado y token CSRF válido.
- La API limita intentos repetidos de inicio de sesión. Las sesiones son válidas hasta ocho horas y los cambios de rol se verifican contra PostgreSQL.
- La configuración incluida es para uso local de demostración. Para una puesta en producción se requiere HTTPS, contraseñas y secreto únicos, copias de seguridad y una revisión de seguridad/despliegue.
