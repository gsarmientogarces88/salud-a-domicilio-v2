import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addMinutes } from 'date-fns';
import { zonedSlotStartUtc } from '../src/lib/appointmentBookingRules';

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function chileSlotRange(day: Date, hour: number, durationMin: number): { startAt: Date; endAt: Date } {
  const ymd = ymdFromDate(day);
  const startAt = zonedSlotStartUtc(ymd, `${String(hour).padStart(2, '0')}:00`);
  return { startAt, endAt: addMinutes(startAt, durationMin) };
}

const prisma = new PrismaClient();

const PASSWORD = 'profesional123';
const REGION = 'Biobío';
const PROVINCE = 'Concepción';
const COMMUNES = ['Concepción', 'Concepción', 'San Pedro de la Paz', 'Talcahuano', 'Concepción'] as const;

// Concepción centro aprox.
const CONCEPCION_LAT = -36.8269;
const CONCEPCION_LNG = -73.0503;

interface ProfessionalData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  licensePrefix: string;
  commune: string;
  coverageKm: number;
  excludedZones?: string[];
}

const PROFESSIONALS: ProfessionalData[] = [
  // Kinesiología (3) - coverageKm variado: 10, 15, 20
  { firstName: 'María', lastName: 'Fernández', email: 'kinesio1@salud.cl', phone: '+56911110001', specialty: 'Kinesiología', licensePrefix: 'KIN', commune: 'Concepción', coverageKm: 10 },
  { firstName: 'Carlos', lastName: 'Ramírez', email: 'kinesio2@salud.cl', phone: '+56911110002', specialty: 'Kinesiología', licensePrefix: 'KIN', commune: 'San Pedro de la Paz', coverageKm: 15, excludedZones: ['Lota'] },
  { firstName: 'Ana', lastName: 'Torres', email: 'kinesio3@salud.cl', phone: '+56911110003', specialty: 'Kinesiología', licensePrefix: 'KIN', commune: 'Talcahuano', coverageKm: 20 },
  // Enfermería (3)
  { firstName: 'Pedro', lastName: 'González', email: 'enfermero1@salud.cl', phone: '+56911110004', specialty: 'Enfermería', licensePrefix: 'ENF', commune: 'Concepción', coverageKm: 12 },
  { firstName: 'Laura', lastName: 'Soto', email: 'enfermera2@salud.cl', phone: '+56911110005', specialty: 'Enfermería', licensePrefix: 'ENF', commune: 'San Pedro de la Paz', coverageKm: 15 },
  { firstName: 'Roberto', lastName: 'Méndez', email: 'enfermero3@salud.cl', phone: '+56911110006', specialty: 'Enfermería', licensePrefix: 'ENF', commune: 'Talcahuano', coverageKm: 18, excludedZones: ['Coronel'] },
  // Psicología (3)
  { firstName: 'Claudia', lastName: 'López', email: 'psicologo1@salud.cl', phone: '+56911110007', specialty: 'Psicología', licensePrefix: 'PSI', commune: 'Concepción', coverageKm: 10 },
  { firstName: 'Diego', lastName: 'Herrera', email: 'psicologo2@salud.cl', phone: '+56911110008', specialty: 'Psicología', licensePrefix: 'PSI', commune: 'Concepción', coverageKm: 15 },
  { firstName: 'Valentina', lastName: 'Rojas', email: 'psicologa3@salud.cl', phone: '+56911110009', specialty: 'Psicología', licensePrefix: 'PSI', commune: 'San Pedro de la Paz', coverageKm: 20 },
  // Terapia Ocupacional (3)
  { firstName: 'Andrés', lastName: 'Díaz', email: 'to1@salud.cl', phone: '+56911110010', specialty: 'Terapia Ocupacional', licensePrefix: 'TO', commune: 'Concepción', coverageKm: 12 },
  { firstName: 'Camila', lastName: 'Vargas', email: 'to2@salud.cl', phone: '+56911110011', specialty: 'Terapia Ocupacional', licensePrefix: 'TO', commune: 'Talcahuano', coverageKm: 15 },
  { firstName: 'Felipe', lastName: 'Espinoza', email: 'to3@salud.cl', phone: '+56911110012', specialty: 'Terapia Ocupacional', licensePrefix: 'TO', commune: 'Concepción', coverageKm: 18 },
  // Nutricionista (3)
  { firstName: 'Daniela', lastName: 'Castro', email: 'nutri1@salud.cl', phone: '+56911110013', specialty: 'Nutricionista', licensePrefix: 'NUT', commune: 'Concepción', coverageKm: 10 },
  { firstName: 'Martín', lastName: 'Núñez', email: 'nutri2@salud.cl', phone: '+56911110014', specialty: 'Nutricionista', licensePrefix: 'NUT', commune: 'San Pedro de la Paz', coverageKm: 15 },
  { firstName: 'Isabella', lastName: 'Ortega', email: 'nutri3@salud.cl', phone: '+56911110015', specialty: 'Nutricionista', licensePrefix: 'NUT', commune: 'Talcahuano', coverageKm: 20 },
];

async function main() {
  const hashedProf = await bcrypt.hash(PASSWORD, 12);

  // 1) Admin
  const adminEmail = 'admin@salud.cl';
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash('Admin123!', 12),
        firstName: 'Admin',
        lastName: 'Plataforma',
        role: 'ADMIN',
      },
    });
    console.log('✅ Usuario ADMIN creado (admin@salud.cl / Admin123!)');
  } else {
    console.log('⏭️  Usuario ADMIN ya existe');
  }

  // 2) Paciente de prueba
  let patientProfileId: string;
  const patientEmail = 'paciente@paciente.cl';
  let patientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
    include: { patientProfile: true },
  });
  if (!patientUser) {
    const created = await prisma.user.create({
      data: {
        email: patientEmail,
        password: await bcrypt.hash('paciente', 12),
        firstName: 'Juan',
        lastName: 'Paciente',
        role: 'PATIENT',
        patientProfile: { create: {} },
      },
      include: { patientProfile: true },
    });
    patientProfileId = created.patientProfile!.id;
    console.log('✅ Usuario PACIENTE creado (paciente@paciente.cl / paciente)');
  } else {
    patientProfileId = patientUser.patientProfile!.id;
    console.log('⏭️  Usuario PACIENTE ya existe');
  }

  // 3) Médico de prueba
  const doctorEmail = 'doctor@salud.cl';
  const doctorExists = await prisma.user.findUnique({ where: { email: doctorEmail } });
  if (!doctorExists) {
    await prisma.user.create({
      data: {
        email: doctorEmail,
        password: await bcrypt.hash('doctor', 12),
        firstName: 'Rodrigo',
        lastName: 'Silva',
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            specialty: 'Medicina General, Urgencias',
            licenseNumber: 'DOC-1234',
            baseFee: 40000,
            isVerified: true,
            isAvailable: true,
            region: REGION,
            province: PROVINCE,
            commune: 'Concepción',
          },
        },
      },
    });
    console.log('✅ Usuario MÉDICO creado (doctor@salud.cl / doctor)');
  } else {
    console.log('⏭️  Usuario MÉDICO ya existe');
  }

  // 3.0) Asegurar filas en `availabilities` para Rodrigo Silva (doctor@salud.cl): el bloque create no las insertaba
  const rodrigoUser = await prisma.user.findUnique({
    where: { email: doctorEmail },
    include: { doctorProfile: true },
  });
  if (rodrigoUser?.doctorProfile) {
    const rc = await prisma.availability.count({ where: { professionalId: rodrigoUser.doctorProfile.id } });
    if (rc === 0) {
      for (let day = 1; day <= 5; day++) {
        await prisma.availability.create({
          data: {
            professionalId: rodrigoUser.doctorProfile.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '18:00',
            slotDuration: 30,
            bufferMinutes: 15,
          },
        });
      }
      console.log('✅ Disponibilidad L–V 09:00–18:00 (30m, buffer 15) creada para Rodrigo Silva (doctor@salud.cl)');
    }
  }

  // 3.1) Médico de prueba adicional
  const doctor2Email = 'doctor2@salud.cl';
  const doctor2Exists = await prisma.user.findUnique({ where: { email: doctor2Email } });
  if (!doctor2Exists) {
    const user2 = await prisma.user.create({
      data: {
        email: doctor2Email,
        password: await bcrypt.hash('doctor2', 12),
        firstName: 'Doctor',
        lastName: '2',
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            specialty: 'Medicina General, Urgencias',
            licenseNumber: 'DOC-2234',
            baseFee: 40000,
            isVerified: true,
            isAvailable: true,
            region: REGION,
            province: PROVINCE,
            commune: 'Concepción',
            baseLat: CONCEPCION_LAT,
            baseLng: CONCEPCION_LNG,
            coverageKm: 15,
          },
        },
      },
      include: { doctorProfile: true },
    });

    const docId = user2.doctorProfile!.id;

    // Disponibilidad base (Lunes a Viernes, 09:00-18:00, 60 min)
    for (let day = 1; day <= 5; day++) {
      await prisma.availability.create({
        data: {
          professionalId: docId,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          slotDuration: 60,
          bufferMinutes: 15,
        },
      });
    }

    // Slots (próximos 7 días, slots de 60 min)
    const todaySlots = new Date();
    todaySlots.setHours(0, 0, 0, 0);
    for (let d = 0; d < 7; d++) {
      const day = new Date(todaySlots);
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0 || day.getDay() === 6) continue; // fin de semana
      for (let h = 9; h < 18; h++) {
        const { startAt, endAt } = chileSlotRange(day, h, 60);
        await prisma.availabilitySlot.create({
          data: {
            professionalId: docId,
            startAt,
            endAt,
            status: 'AVAILABLE',
          },
        });
      }
    }

    console.log('✅ Usuario MÉDICO creado (doctor2@salud.cl / doctor2)');
  } else {
    console.log('⏭️  Usuario MÉDICO doctor2 ya existe');
  }

  // 4) Commission settings
  let cfg = await prisma.commissionSetting.findFirst();
  if (!cfg) {
    cfg = await prisma.commissionSetting.create({
      data: {
        percentage: 20,
        urgentFixedFee: 50000,
        pendingTimeoutSec: 240,
        maxCancellations: 3,
      },
    });
    console.log('✅ Commission settings creadas');
  } else {
    console.log('⏭️  Commission settings ya existen');
  }

  const pct = (cfg?.percentage ?? 20) / 100;

  // 5) Crear 15 profesionales (Kinesiología, Enfermería, Psicología, Terapia Ocupacional, Nutricionista)
  const createdDoctors: { id: string; specialty: string }[] = [];
  let licenseCounter: Record<string, number> = {};

  for (const p of PROFESSIONALS) {
    const count = (licenseCounter[p.licensePrefix] ?? 0) + 1;
    licenseCounter[p.licensePrefix] = count;
    const licenseNumber = `${p.licensePrefix}-${String(count).padStart(3, '0')}`;

    const existingUser = await prisma.user.findUnique({ where: { email: p.email } });
    if (existingUser) {
      console.log(`⏭️  ${p.specialty} ${p.firstName} ${p.lastName} ya existe`);
      const dp = await prisma.doctorProfile.findUnique({ where: { userId: existingUser.id } });
      if (dp) createdDoctors.push({ id: dp.id, specialty: p.specialty });
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: p.email,
        password: hashedProf,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            specialty: p.specialty,
            licenseNumber,
            baseFee: 35000,
            isVerified: true,
            isAvailable: true,
            region: REGION,
            province: PROVINCE,
            commune: p.commune,
            baseLat: CONCEPCION_LAT,
            baseLng: CONCEPCION_LNG,
            coverageKm: p.coverageKm,
            excludedZones: p.excludedZones ? (p.excludedZones as any) : undefined,
          },
        },
      },
      include: { doctorProfile: true },
    });

    const docId = user.doctorProfile!.id;
    createdDoctors.push({ id: docId, specialty: p.specialty });

    // Availability: Lunes a Viernes (1-5), 09:00-18:00, bloque 60 min, buffer 15 min
    for (let day = 1; day <= 5; day++) {
      await prisma.availability.create({
        data: {
          professionalId: docId,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          slotDuration: 60,
          bufferMinutes: 15,
        },
      });
    }

    // Bloques no disponibles (simular almuerzo o bloqueos puntuales)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    await prisma.blockedSlot.create({
      data: {
        professionalId: docId,
        date: nextWeek,
        startTime: '13:00',
        endTime: '14:00',
        reason: 'Almuerzo',
      },
    });

    // Crear 10 AvailabilitySlot por profesional (próximos 7 días, slots de 60 min)
    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0 || day.getDay() === 6) continue; // saltar fin de semana
      for (let h = 9; h < 18; h++) {
        const { startAt, endAt } = chileSlotRange(day, h, 60);
        await prisma.availabilitySlot.create({
          data: {
            professionalId: docId,
            startAt,
            endAt,
            status: 'AVAILABLE',
          },
        });
      }
    }

    console.log(`✅ ${p.specialty}: ${p.firstName} ${p.lastName} (${p.commune}, ${p.coverageKm}km) - ${p.email}`);
  }

  // Actualizar profesionales existentes con baseLat, baseLng, coverageKm si faltan
  for (const doc of await prisma.doctorProfile.findMany({ where: { baseLat: null } })) {
    const p = PROFESSIONALS.find((x) => doc.specialty.includes(x.specialty.split(' ')[0]));
    await prisma.doctorProfile.update({
      where: { id: doc.id },
      data: {
        baseLat: CONCEPCION_LAT,
        baseLng: CONCEPCION_LNG,
        coverageKm: p?.coverageKm ?? 15,
      },
    });
    console.log(`✅ Actualizado cobertura para ${doc.id}`);
  }

  // Crear slots para profesionales que no tienen (ej. ya existían antes del seed de slots)
  const docsWithoutSlots = await prisma.doctorProfile.findMany({
    where: { specialty: { not: 'Medicina General, Urgencias' } },
    select: { id: true },
  });
  for (const doc of docsWithoutSlots) {
    const count = await prisma.availabilitySlot.count({ where: { professionalId: doc.id } });
    if (count > 0) continue;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      for (let h = 9; h < 18; h++) {
        const { startAt, endAt } = chileSlotRange(day, h, 60);
        await prisma.availabilitySlot.create({
          data: { professionalId: doc.id, startAt, endAt, status: 'AVAILABLE' },
        });
      }
    }
    console.log(`✅ Slots creados para profesional ${doc.id}`);
  }

  // 6) Crear 1-2 citas agendadas por profesional (ServiceRequest - flujo anterior)
  const now = new Date();
  for (let i = 0; i < createdDoctors.length; i++) {
    const doc = createdDoctors[i];
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() + 3 + (i % 5));
    baseDate.setHours(10 + (i % 3), 0, 0, 0);

    const totalAmount = 35000;
    const commissionAmount = Math.round(totalAmount * pct);
    const doctorNetAmount = totalAmount - commissionAmount;

    const count = i % 2 === 0 ? 2 : 1;
    for (let j = 0; j < count; j++) {
      const scheduledAt = new Date(baseDate);
      scheduledAt.setHours(baseDate.getHours() + j * 2, 0, 0, 0);

      const existing = await prisma.serviceRequest.findFirst({
        where: {
          doctorId: doc.id,
          patientId: patientProfileId,
          scheduledAt,
          type: 'SCHEDULED',
        },
      });
      if (existing) continue;

      const status = j === 0 ? 'ACCEPTED' : 'PENDING';
      const nowSeed = new Date();
      await prisma.serviceRequest.create({
        data: {
          patientId: patientProfileId,
          doctorId: doc.id,
          type: 'SCHEDULED',
          status,
          acceptedAt: status === 'ACCEPTED' ? nowSeed : null,
          description: `Consulta ${doc.specialty} - cita de prueba`,
          address: 'Rosas 475, Concepción',
          commune: 'Concepción',
          province: PROVINCE,
          region: REGION,
          totalAmount,
          commissionAmount,
          doctorNetAmount,
          scheduledAt,
        },
      });
    }
  }

  console.log(`✅ Citas agendadas creadas (1-2 por profesional)`);

  // 7) Laboratorios y solicitudes de exámenes a domicilio (mock)
  const labPassword = await bcrypt.hash('laboratorio123', 12);
  const lab1Email = 'lab.central@salud.cl';
  const lab2Email = 'lab.sur@salud.cl';

  let lab1 = await prisma.laboratory.findFirst({ where: { user: { email: lab1Email } } });
  if (!lab1) {
    const u1 = await prisma.user.create({
      data: {
        email: lab1Email,
        password: labPassword,
        firstName: 'Lab',
        lastName: 'Central',
        role: 'LABORATORY',
        laboratoryProfile: {
          create: {
            name: 'Laboratorio Clínico Central',
            rut: '76.123.456-7',
            phone: '+56 9 8000 1111',
            address: 'Av. Los Carrera 123',
            commune: 'Concepción',
            province: PROVINCE,
            region: REGION,
          },
        },
      },
      include: { laboratoryProfile: true },
    });
    lab1 = u1.laboratoryProfile!;
    console.log('✅ Laboratorio 1 creado (lab.central@salud.cl / laboratorio123)');
  } else {
    console.log('⏭️  Laboratorio Central ya existe');
  }

  let lab2 = await prisma.laboratory.findFirst({ where: { user: { email: lab2Email } } });
  if (!lab2) {
    const u2 = await prisma.user.create({
      data: {
        email: lab2Email,
        password: labPassword,
        firstName: 'Lab',
        lastName: 'Sur',
        role: 'LABORATORY',
        laboratoryProfile: {
          create: {
            name: 'Laboratorio Sur',
            rut: '77.987.654-3',
            phone: '+56 9 8000 2222',
            commune: 'San Pedro de la Paz',
            province: PROVINCE,
            region: REGION,
          },
        },
      },
      include: { laboratoryProfile: true },
    });
    lab2 = u2.laboratoryProfile!;
    console.log('✅ Laboratorio 2 creado (lab.sur@salud.cl / laboratorio123)');
  } else {
    lab2 = (await prisma.laboratory.findFirst({ where: { user: { email: lab2Email } } }))!;
    console.log('⏭️  Laboratorio Sur ya existe');
  }

  // Usuario solicitado para pruebas: laboratorio@laboratorio / laboratorio
  const labDemoEmail = 'laboratorio@laboratorio';
  const labDemoExists = await prisma.user.findUnique({ where: { email: labDemoEmail } });
  if (!labDemoExists) {
    await prisma.user.create({
      data: {
        email: labDemoEmail,
        password: await bcrypt.hash('laboratorio', 12),
        firstName: 'Laboratorio',
        lastName: 'Demo',
        role: 'LABORATORY',
        laboratoryProfile: {
          create: {
            name: 'Laboratorio Demo',
            phone: '+56 9 0000 0000',
            commune: 'Concepción',
            province: PROVINCE,
            region: REGION,
          },
        },
      },
    });
    console.log('✅ Usuario laboratorio@laboratorio creado (contraseña: laboratorio)');
  } else {
    console.log('⏭️  Usuario laboratorio@laboratorio ya existe');
  }

  const existingLabReq = await prisma.labExamRequest.count();
  if (existingLabReq === 0) {
    const visit = new Date();
    visit.setDate(visit.getDate() + 2);
    visit.setHours(10, 0, 0, 0);
    const quoteDeadlineAt = new Date(Date.now() + 90 * 60 * 1000);

    const r1 = await prisma.labExamRequest.create({
      data: {
        patientId: patientProfileId,
        status: 'QUOTED',
        patientName: 'Juan Paciente',
        examRequested: 'Hemograma, perfil bioquímico, TSH',
        address: 'Calle Falsa 123',
        region: REGION,
        province: PROVINCE,
        commune: 'Concepción',
        phone: '+56 9 1111 2222',
        email: 'juan.paciente@example.com',
        observationsPatient: 'Portón verde',
        preferredDate: visit,
        preferredTimeRange: '10:00 - 12:00',
        latitude: -36.82699,
        longitude: -73.04977,
        orderFileUrl: '/uploads/lab/orders/seed_order.pdf',
        orderFileName: 'orden_seed.pdf',
        quoteDeadlineAt,
        quotes: {
          create: {
            laboratoryId: lab1.id,
            status: 'SENT',
            priceClp: 45990,
            proposedDate: visit,
            proposedTimeRange: '10:00 - 12:00',
            comment: 'Incluye toma a domicilio en Concepción centro.',
            estimatedResultsHours: 48,
          },
        },
      },
      include: { quotes: true },
    });
    await prisma.labExamEvent.createMany({
      data: [
        { requestId: r1.id, kind: 'REQUEST_CREATED', message: 'Solicitud enviada' },
        { requestId: r1.id, kind: 'QUOTED', message: 'Cotización emitida' },
      ],
    });

    const r2 = await prisma.labExamRequest.create({
      data: {
        patientId: patientProfileId,
        status: 'LAB_SELECTED',
        patientName: 'Juan Paciente',
        examRequested: 'PCR COVID + panel respiratorio',
        address: 'Los Aromos 456',
        region: REGION,
        province: PROVINCE,
        commune: 'San Pedro de la Paz',
        phone: '+56 9 3333 4444',
        email: 'juan.paciente@example.com',
        preferredDate: visit,
        preferredTimeRange: '09:00 - 11:00',
        latitude: -36.84091,
        longitude: -73.10361,
        orderFileUrl: '/uploads/lab/orders/seed_order2.pdf',
        orderFileName: 'orden2.pdf',
        quoteDeadlineAt,
        quotes: {
          create: {
            laboratoryId: lab2.id,
            status: 'ACCEPTED',
            priceClp: 29900,
            proposedDate: visit,
            proposedTimeRange: '09:30 - 10:30',
            estimatedResultsHours: 24,
          },
        },
      },
      include: { quotes: true },
    });
    await prisma.labExamRequest.update({
      where: { id: r2.id },
      data: {
        status: 'SCHEDULED',
        selectedQuoteId: r2.quotes[0]?.id ?? null,
        appointments: {
          create: {
            laboratoryId: lab2.id,
            startAt: visit,
            endAt: new Date(visit.getTime() + 45 * 60 * 1000),
            status: 'SCHEDULED',
          },
        },
      },
    });
    await prisma.labExamEvent.createMany({
      data: [
        { requestId: r2.id, kind: 'REQUEST_CREATED', message: 'Solicitud enviada' },
        { requestId: r2.id, kind: 'SCHEDULED', message: 'Visita agendada' },
      ],
    });

    console.log('✅ Solicitudes de laboratorio mock creadas (QUOTED + SCHEDULED)');
  } else {
    console.log('⏭️  Solicitudes de laboratorio ya existen');
  }

  console.log('');
  console.log('=== CREDENCIALES DE PRUEBA ===');
  console.log('Admin:      admin@salud.cl / Admin123!');
  console.log('Paciente:   paciente@paciente.cl / paciente');
  console.log('Médico:     doctor@salud.cl / doctor');
  console.log('Médico:     doctor2@salud.cl / doctor2');
  console.log('Laboratorio: lab.central@salud.cl / laboratorio123');
  console.log('Laboratorio: lab.sur@salud.cl / laboratorio123');
  console.log('Laboratorio: laboratorio@laboratorio / laboratorio');
  console.log('Profesionales (15): profesional123');
  console.log('  - kinesio1@salud.cl, kinesio2@salud.cl, kinesio3@salud.cl');
  console.log('  - enfermero1@salud.cl, enfermera2@salud.cl, enfermero3@salud.cl');
  console.log('  - psicologo1@salud.cl, psicologo2@salud.cl, psicologa3@salud.cl');
  console.log('  - to1@salud.cl, to2@salud.cl, to3@salud.cl');
  console.log('  - nutri1@salud.cl, nutri2@salud.cl, nutri3@salud.cl');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
