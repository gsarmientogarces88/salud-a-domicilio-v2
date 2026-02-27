# 📘 API Documentation — Salud a Domicilio

Base URL: `http://localhost:4000/api`

---

## Auth `/api/auth`

### POST /auth/register
Rol: Público
```json
// Request
{ "email": "pac@mail.cl", "password": "123456", "firstName": "Juan", "lastName": "Pérez", "role": "PATIENT" }
// Para DOCTOR agregar: "specialty", "licenseNumber", "baseFee"

// Response 201
{ "message": "Registro exitoso", "data": { "user": { "id", "email", "role" }, "token": "jwt..." } }
```

### POST /auth/login
Rol: Público
```json
// Request
{ "email": "pac@mail.cl", "password": "123456" }

// Response 200
{ "data": { "token": "jwt...", "user": { "id", "email", "role", "firstName", "lastName" } } }
```

---

## Services `/api/services`

### POST /services
Rol: PATIENT
```json
// Request
{ "type": "URGENT", "description": "Dolor fuerte", "address": "Av. Siempre Viva 123", "commune": "Providencia" }
// SCHEDULED: agregar "doctorId", "scheduledAt"

// Response 201
{ "message": "Solicitud creada", "data": { "id", "status": "PENDING", "totalAmount", "expiresAt" } }
```

### GET /services/me
Rol: PATIENT — Lista mis solicitudes

### GET /services/available
Rol: DOCTOR — Lista solicitudes PENDING no expiradas

### GET /services/:id
Rol: Dueño o ADMIN — Detalle con transacciones

### POST /services/:id/accept
Rol: DOCTOR
```json
// Response 200
{ "message": "Solicitud aceptada", "data": { "status": "ACCEPTED", "doctorId" } }
```

### PATCH /services/:id/status
Rol: DOCTOR
```json
// Request
{ "status": "IN_PROGRESS" }  // o "COMPLETED" (con "notes" opcional)

// Response 200
{ "message": "Estado actualizado a IN_PROGRESS", "data": { ... } }
```

### DELETE /services/:id
Rol: PATIENT — Cancelar (solo PENDING)
```json
// Request (opcional)
{ "reason": "Ya no necesito" }
```

### GET /services
Rol: ADMIN — Listar todas. Query: `?status=PENDING&page=1&limit=20`

---

## Payments `/api/payments`

### POST /payments/:serviceId/create
Rol: PATIENT
```json
// Request
{ "provider": "mercadopago" }

// Response 201
{ "message": "Transacción creada", "data": { "id", "amount", "status": "PENDING" } }
```

### POST /payments/:serviceId/confirm
Rol: PATIENT
```json
// Response 200
{ "message": "Pago confirmado", "data": [...] }
```
Error 409 si ya pagado.

### POST /payments/:serviceId/refund
Rol: ADMIN
```json
// Response 200
{ "message": "Reembolso procesado" }
```

### POST /payments/webhook
Rol: Público — Placeholder (200 OK)

---

## Admin `/api/admin`

### GET /admin/users
Query: `?role=DOCTOR`
```json
{ "data": [{ "id", "email", "firstName", "role", "isBanned", "cancellationCount" }] }
```

### PATCH /admin/users/:id/ban
```json
{ "reason": "Spam" }  // opcional
```

### PATCH /admin/users/:id/unban
Reset cancellationCount a 0.

### PATCH /admin/commission
```json
{ "percentage": 25 }
```

### PATCH /admin/commission/timeout
```json
{ "pendingTimeoutSec": 300 }
```

### PATCH /admin/commission/max-cancellations
```json
{ "maxCancellations": 5 }
```

### GET /admin/services
Misma respuesta que GET /services (admin).

---

## Estados y Transiciones

```
PENDING ──→ ACCEPTED ──→ IN_PROGRESS ──→ COMPLETED
   │
   └──→ CANCELLED (por timeout 240s, o cancelación manual del paciente)

COMPLETED ──→ REFUNDED (solo admin)
```

**Reglas:**
- No se permite cancelar después de ACCEPTED.
- Si nadie acepta en 240s → CANCELLED automático.
- Cancelaciones reiteradas (≥ maxCancellations) → usuario baneado.
- Montos siempre en INT (CLP).
