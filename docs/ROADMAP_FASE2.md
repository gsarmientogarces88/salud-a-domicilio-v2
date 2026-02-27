# 🗺️ Roadmap Fase 2 — Salud a Domicilio

## Priorización MVP2

### 🔴 P0 — Críticos (sin esto no hay Fase 2)

| Módulo | Objetivo | Entregables | Riesgos | Dependencias |
|--------|----------|-------------|---------|--------------|
| **Pagos reales** | Cobro real al paciente | Integración Stripe/MercadoPago, webhooks validados, split automático, recibos | Fallos en split; retención de fondos por proveedor | Cuenta merchant verificada, KYC |
| **App Médico** | Médico opera desde celular | React Native app (iOS+Android), login, ver/aceptar solicitudes, cambiar estados | Fragmentación dispositivos; latencia | Backend API ya lista (Fase 1) |
| **Notificaciones push** | Alertas en tiempo real | FCM (Android) + APNs (iOS), notificar nueva solicitud, aceptación, pago | Tokens expirados; deliverability | App móvil, Firebase project |

### 🟡 P1 — Importantes (mejoran UX significativamente)

| Módulo | Objetivo | Entregables | Riesgos | Dependencias |
|--------|----------|-------------|---------|--------------|
| **Geolocalización** | Médico comparte ubicación en tiempo real | GPS tracking en app, WebSocket al frontend, mapa en vista paciente | Consumo batería; precisión GPS indoor | App móvil, servicio WebSocket |
| **ETA + Radio** | Paciente ve tiempo estimado | Cálculo distancia real (Google Maps API), radio 4-5km configurable, ETA dinámico | Costo API Google Maps; tráfico impredecible | Geolocalización activa |
| **Reembolsos reales** | Devolver dinero al paciente | Refund vía API Stripe/MP, estados parciales, notificación automática | Políticas del proveedor; tiempos de devolución | Pagos reales |
| **Disputas** | Resolver conflictos | Panel admin para disputas, evidencia (fotos/texto), resolución con reembolso parcial/total | Criterios subjetivos; volumen | Reembolsos reales |

### 🟢 P2 — Deseables (diferencian el producto)

| Módulo | Objetivo | Entregables | Riesgos | Dependencias |
|--------|----------|-------------|---------|--------------|
| **Historial clínico** | Registro básico por paciente | Notas por atención, antecedentes, alergias, PDF exportable | Regulación datos salud (Ley 20.584 Chile) | Asesoría legal |
| **Recetas electrónicas** | Médico emite receta digital | Generador PDF con datos médico/paciente, firma digital, envío por email | Validez legal; formato ISP | Historial clínico |
| **App Paciente** | Paciente opera desde celular | React Native app, solicitar atención, ver mapa, pagar, historial | Mantener 2 apps + web | App Médico (compartir codebase) |
| **Rating mejorado** | Calificación bidireccional | Médico califica paciente, promedio visible, filtro por rating | Sesgo; retaliación | Sistema actual de ratings |

### ⚪ P3 — Futuro (escala)

| Módulo | Objetivo | Entregables | Riesgos | Dependencias |
|--------|----------|-------------|---------|--------------|
| **Seguros** | Integrar con isapres/fonasa | API isapres, validación de cobertura, copago automático | Burocracia; APIs legacy | Convenios firmados |
| **IA médica** | Triage inteligente | Chatbot pre-consulta, sugerencia de especialidad, priorización urgencia | Responsabilidad médica; precisión | Dataset entrenamiento |
| **Multi-ciudad** | Expandir a regiones | Zonas configurables, tarifas por zona, métricas por ciudad | Oferta médica en regiones | Base de médicos |
| **Logs/Monitoring** | Estabilidad producción | Sentry, Datadog/Grafana, alertas, rate limiting, audit log | Costo infraestructura | Deploy cloud |

---

## Orden de ejecución sugerido

```
Semana 1-2:  Pagos reales (Stripe/MP) + webhooks
Semana 3-4:  App Médico (React Native) + push notifications
Semana 5-6:  Geolocalización + ETA + radio 4-5km
Semana 7-8:  Reembolsos reales + disputas
Semana 9-10: Historial clínico + recetas
Semana 11+:  App Paciente, seguros, IA
```

## Stack Fase 2

| Componente | Tecnología |
|------------|-----------|
| App móvil | React Native (Expo) |
| Mapa | Google Maps SDK + Directions API |
| Realtime | WebSocket (Socket.io) |
| Push | Firebase Cloud Messaging |
| Pagos | Stripe Connect o MercadoPago Split |
| Monitoring | Sentry + Grafana |
| Deploy | AWS/GCP + Docker + CI/CD |

## Seguridad producción

- HTTPS obligatorio
- Rate limiting (express-rate-limit)
- Helmet headers (ya implementado)
- Audit log en acciones críticas
- Encriptar datos sensibles (RUT, datos médicos)
- Backups automáticos PostgreSQL
- Cumplimiento Ley 19.628 (datos personales Chile)
- Cumplimiento Ley 20.584 (datos clínicos)
