# 🏥 Salud a Domicilio — Backend API

## Requisitos
- Node.js 20+
- PostgreSQL 16+
- npm o Docker

## Variables de entorno
Copiar `.env.example` → `.env`:
```
DATABASE_URL="postgresql://salud:salud123@localhost:5432/salud_domicilio"
JWT_SECRET="tu-secreto-seguro"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

## Correr local (npm)
```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
# API en http://localhost:4000
```

## Correr con Docker
```bash
docker-compose up -d
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npm run db:seed
# API en http://localhost:4000
```

## Seed
```bash
npm run db:seed
```
Crea:
- **Admin:** admin@salud.cl / Admin123!
- **Config:** 20% comisión, $50.000 urgencia, 240s timeout, 3 max cancelaciones

## Flujos principales

### Paciente
1. Se registra (POST /auth/register role=PATIENT)
2. Crea solicitud URGENT o SCHEDULED (POST /services)
3. Espera que médico acepte (240s máximo)
4. Paga (POST /payments/:id/create + /confirm)
5. Recibe atención

### Médico
1. Se registra (POST /auth/register role=DOCTOR)
2. Admin lo verifica
3. Ve solicitudes disponibles (GET /services/available)
4. Acepta (POST /services/:id/accept)
5. Inicia atención (PATCH /services/:id/status → IN_PROGRESS)
6. Completa (PATCH /services/:id/status → COMPLETED)

### Admin
1. Login con admin@salud.cl
2. Verifica médicos, banea usuarios
3. Configura comisión, timeout, max cancelaciones
4. Ve métricas financieras
