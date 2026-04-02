/**
 * Ubicaciones de Chile para selects dependientes.
 * Región → Ciudad → Comuna
 * Expandir progresivamente según necesidad.
 */
export interface CityWithCommunes {
  city: string;
  communes: string[];
}

export interface RegionWithCities {
  region: string;
  cities: CityWithCommunes[];
}

export const chileLocations: RegionWithCities[] = [
  { region: 'Arica y Parinacota', cities: [{ city: 'Arica', communes: ['Arica', 'Camarones', 'Putre', 'General Lagos'] }] },
  { region: 'Tarapacá', cities: [{ city: 'Iquique', communes: ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica'] }] },
  { region: 'Antofagasta', cities: [{ city: 'Antofagasta', communes: ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Calama', 'San Pedro de Atacama'] }] },
  { region: 'Atacama', cities: [{ city: 'Copiapó', communes: ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Vallenar'] }] },
  { region: 'Coquimbo', cities: [{ city: 'La Serena', communes: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel'] }] },
  {
    region: 'Valparaíso',
    cities: [
      { city: 'Valparaíso', communes: ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana'] },
      { city: 'San Antonio', communes: ['San Antonio', 'Cartagena', 'El Quisco', 'Algarrobo'] },
    ],
  },
  {
    region: 'Metropolitana',
    cities: [
      { city: 'Santiago', communes: ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Vitacura', 'La Florida', 'Maipú', 'Peñalolén', 'San Miguel'] },
      { city: 'Puente Alto', communes: ['Puente Alto', 'Pirque', 'San José de Maipo'] },
    ],
  },
  { region: "O'Higgins", cities: [{ city: 'Rancagua', communes: ['Rancagua', 'Machalí', 'Graneros', 'Rengo'] }] },
  {
    region: 'Maule',
    cities: [
      { city: 'Talca', communes: ['Talca', 'Curicó', 'Linares', 'Constitución'] },
      { city: 'Curicó', communes: ['Curicó', 'Teno', 'Romeral'] },
    ],
  },
  {
    region: 'Ñuble',
    cities: [
      { city: 'Chillán', communes: ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes'] },
      { city: 'San Carlos', communes: ['San Carlos', 'Ñiquén', 'San Nicolás'] },
    ],
  },
  {
    region: 'Biobío',
    cities: [
      { city: 'Concepción', communes: ['Concepción', 'San Pedro de la Paz', 'Chiguayante', 'Hualpén', 'Talcahuano', 'Coronel', 'Lota'] },
      { city: 'Talcahuano', communes: ['Talcahuano', 'Hualpén'] },
      { city: 'Los Ángeles', communes: ['Los Ángeles', 'Mulchén', 'Nacimiento'] },
      { city: 'Chillán', communes: ['Chillán', 'Chillán Viejo'] },
    ],
  },
  {
    region: 'Araucanía',
    cities: [
      { city: 'Temuco', communes: ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón'] },
      { city: 'Angol', communes: ['Angol', 'Collipulli', 'Los Sauces'] },
    ],
  },
  {
    region: 'Los Ríos',
    cities: [
      { city: 'Valdivia', communes: ['Valdivia', 'Corral', 'Lanco', 'Los Lagos'] },
      { city: 'La Unión', communes: ['La Unión', 'Río Bueno', 'Futrono'] },
    ],
  },
  {
    region: 'Los Lagos',
    cities: [
      { city: 'Puerto Montt', communes: ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Frutillar'] },
      { city: 'Osorno', communes: ['Osorno', 'San Pablo', 'Río Negro'] },
    ],
  },
  { region: 'Aysén', cities: [{ city: 'Coyhaique', communes: ['Coyhaique', 'Aysén', 'Chile Chico', 'Cisnes'] }] },
  {
    region: 'Magallanes y Antártica',
    cities: [
      { city: 'Punta Arenas', communes: ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos'] },
      { city: 'Puerto Natales', communes: ['Puerto Natales', 'Torres del Paine'] },
    ],
  },
];
