# Medicilio Prestador (iOS + Android)

App Expo **solo para el rol DOCTOR**. Reutiliza el backend actual (`/api/auth`, `/api/doctor`, `/api/services`, `/api/agenda`).

## Requisitos

- Node 18+
- Backend en `http://localhost:4000` (`npm run dev:backend` en la raíz del repo)
- App **Expo Go** en el celular ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Misma red Wi‑Fi que el PC (para probar en dispositivo físico)

## Cómo correrla

```bash
cd mobile-provider
npm start
```

1. Escanea el QR con Expo Go (Android) o la cámara (iOS).
2. Entra con un usuario **DOCTOR**. Paciente, admin o laboratorio son rechazados.

### URL de la API

Por defecto la app usa el host de Metro (tu IP LAN) y el puerto **4000**:

`http://TU_IP:4000/api`

Si el backend está en otro host, crea `mobile-provider/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
```

- Emulador Android: `http://10.0.2.2:4000`
- Simulador iOS: `http://localhost:4000`

## Qué incluye este MVP

- Login JWT + gate de rol DOCTOR
- Inicio: toggle Disponible / No disponible
- Solicitudes: lista (poll 5 s) + detalle Aceptar / Rechazar
- Visita activa: estados, mapa placeholder, PIN, chat, GPS en primer plano
- Agenda, Atenciones, Más, Ingresos, Verificación (consulta)

Push y GPS en segundo plano quedan **preparados** en `features/push.ts` y `features/location.ts` (sin envío de tokens al backend todavía).
