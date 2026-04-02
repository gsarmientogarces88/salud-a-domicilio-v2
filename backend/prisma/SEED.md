# Datos de prueba (Seed)

## Ejecutar el seed

```bash
cd backend
npx prisma db seed
```

O usando el script de npm:

```bash
cd backend
npm run db:seed
```

## Requisitos previos

- Base de datos PostgreSQL corriendo
- Variables de entorno configuradas en `.env` (incluyendo `DATABASE_URL`)
- Schema aplicado (`npx prisma db push` o migraciones)

## Datos creados

### Usuarios base
| Rol       | Email            | Contraseña  |
|-----------|------------------|-------------|
| Admin     | admin@salud.cl   | Admin123!   |
| Paciente  | paciente@paciente.cl | paciente |
| Médico    | doctor@salud.cl  | doctor      |

### Profesionales (15 total)
- **Contraseña común:** `profesional123`
- 3 Kinesiólogos, 3 Enfermeros, 3 Psicólogos, 3 Terapeutas Ocupacionales, 3 Nutricionistas
- Ubicación: Región Biobío, Ciudad Concepción
- Comunas: Concepción, San Pedro de la Paz, Talcahuano (distribuidos)
- Disponibilidad: Lunes a Viernes 09:00-18:00, bloque 60 min, buffer 15 min
- 1-2 citas agendadas por profesional (status SCHEDULED/PENDING o ACCEPTED)

### Cómo probar filtros
- Con Región = Biobío, Comuna = Concepción → verás profesionales de Concepción primero
- Con Comuna = San Pedro de la Paz → verás los de esa comuna
- Con Comuna = Talcahuano → verás los de Talcahuano
