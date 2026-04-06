/**
 * Ubicaciones de Chile para selects dependientes.
 * Región → Provincia → Comuna
 * Expandir progresivamente según necesidad.
 */
export interface ProvinceWithCommunes {
  province: string;
  communes: string[];
}

export interface RegionWithProvinces {
  region: string;
  provinces: ProvinceWithCommunes[];
}

export const chileLocations: RegionWithProvinces[] = [
  {
    region: 'Arica y Parinacota',
    provinces: [{ province: 'Arica', communes: ['Arica', 'Camarones', 'Putre', 'General Lagos'] }],
  },
  {
    region: 'Tarapacá',
    provinces: [{ province: 'Iquique', communes: ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica'] }],
  },
  {
    region: 'Antofagasta',
    provinces: [
      {
        province: 'Antofagasta',
        communes: ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Calama', 'San Pedro de Atacama'],
      },
    ],
  },
  {
    region: 'Atacama',
    provinces: [{ province: 'Copiapó', communes: ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Vallenar'] }],
  },
  {
    region: 'Coquimbo',
    provinces: [{ province: 'Elqui', communes: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel'] }],
  },
  {
    region: 'Valparaíso',
    provinces: [
      { province: 'Valparaíso', communes: ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana'] },
      { province: 'San Antonio', communes: ['San Antonio', 'Cartagena', 'El Quisco', 'Algarrobo'] },
    ],
  },
  {
    region: 'Metropolitana',
    provinces: [
      {
        province: 'Santiago',
        communes: ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Vitacura', 'La Florida', 'Maipú', 'Peñalolén', 'San Miguel'],
      },
      { province: 'Cordillera', communes: ['Puente Alto', 'Pirque', 'San José de Maipo'] },
    ],
  },
  {
    region: "O'Higgins",
    provinces: [{ province: 'Cachapoal', communes: ['Rancagua', 'Machalí', 'Graneros', 'Rengo'] }],
  },
  {
    region: 'Maule',
    provinces: [
      { province: 'Talca', communes: ['Talca', 'Curicó', 'Linares', 'Constitución'] },
      { province: 'Curicó', communes: ['Curicó', 'Teno', 'Romeral'] },
    ],
  },
  {
    region: 'Ñuble',
    provinces: [
      { province: 'Diguillín', communes: ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes'] },
      { province: 'Punilla', communes: ['San Carlos', 'Ñiquén', 'San Nicolás'] },
    ],
  },
  {
    region: 'Biobío',
    provinces: [
      {
        province: 'Concepción',
        communes: ['Concepción', 'San Pedro de la Paz', 'Chiguayante', 'Hualpén', 'Talcahuano', 'Coronel', 'Lota'],
      },
      { province: 'Biobío', communes: ['Los Ángeles', 'Mulchén', 'Nacimiento'] },
      { province: 'Diguillín', communes: ['Chillán', 'Chillán Viejo'] },
    ],
  },
  {
    region: 'Araucanía',
    provinces: [
      { province: 'Cautín', communes: ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón'] },
      { province: 'Malleco', communes: ['Angol', 'Collipulli', 'Los Sauces'] },
    ],
  },
  {
    region: 'Los Ríos',
    provinces: [
      { province: 'Valdivia', communes: ['Valdivia', 'Corral', 'Lanco', 'Los Lagos'] },
      { province: 'Ranco', communes: ['La Unión', 'Río Bueno', 'Futrono'] },
    ],
  },
  {
    region: 'Los Lagos',
    provinces: [
      { province: 'Llanquihue', communes: ['Puerto Montt', 'Puerto Varas', 'Frutillar'] },
      { province: 'Osorno', communes: ['Osorno', 'San Pablo', 'Río Negro'] },
    ],
  },
  {
    region: 'Aysén',
    provinces: [{ province: 'Coyhaique', communes: ['Coyhaique', 'Aysén', 'Chile Chico', 'Cisnes'] }],
  },
  {
    region: 'Magallanes y Antártica',
    provinces: [
      { province: 'Magallanes', communes: ['Punta Arenas', 'Porvenir', 'Cabo de Hornos'] },
      { province: 'Última Esperanza', communes: ['Puerto Natales', 'Torres del Paine'] },
    ],
  },
];
