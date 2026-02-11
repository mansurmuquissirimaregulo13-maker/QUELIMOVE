export interface Location {
    name: string;
    lat: number;
    lng: number;
    type?: 'bairro' | 'street' | 'landmark';
}

export const QUELIMANE_LOCATIONS: Location[] = [
    // Bairros (Neighborhoods)
    { name: 'Sangariveira', lat: -17.8685, lng: 36.8720, type: 'bairro' }, // Adjusted West
    { name: 'Bairro Mata Sampene', lat: -17.8840, lng: 36.8990, type: 'bairro' }, // Adjusted East/South
    { name: 'Chuabo-Dembe', lat: -17.8820, lng: 36.8890, type: 'bairro' },
    { name: 'Coalane', lat: -17.8550, lng: 36.8850, type: 'bairro' }, // North near Airport
    { name: 'Icídua', lat: -17.8920, lng: 36.9050, type: 'bairro' }, // South East
    { name: 'Madal', lat: -17.8655, lng: 36.8923, type: 'bairro' },
    { name: 'Torrone', lat: -17.8523, lng: 36.8745, type: 'bairro' },
    { name: 'Maunaua', lat: -17.8712, lng: 36.8654, type: 'bairro' },
    { name: 'Micajune', lat: -17.8854, lng: 36.8789, type: 'bairro' },
    { name: 'Bairro da Estação', lat: -17.8780, lng: 36.8820, type: 'bairro' }, // Near Train Station
    { name: 'Bairro da Liberdade', lat: -17.8645, lng: 36.8712, type: 'bairro' },
    { name: 'Bairro Brandão', lat: -17.8680, lng: 36.8950, type: 'bairro' },
    { name: 'Bairro Pequeno Brasil', lat: -17.8795, lng: 36.8967, type: 'bairro' },
    { name: 'Bairro Mata Pequena', lat: -17.8742, lng: 36.9034, type: 'bairro' },
    { name: 'Namacata', lat: -17.8412, lng: 36.8923, type: 'bairro' }, // Far North

    // Streets (Avenidas e Ruas) - Adjusted for separation
    { name: 'Av. Samora Machel', lat: -17.8760, lng: 36.8880, type: 'street' }, // Central
    { name: 'Av. Eduardo Mondlane', lat: -17.8720, lng: 36.8860, type: 'street' },
    { name: 'Av. Julius Nyerere', lat: -17.8740, lng: 36.8820, type: 'street' },
    { name: 'Av. Filipe Samuel Magaia', lat: -17.8750, lng: 36.8840, type: 'street' },
    { name: 'Av. 25 de Setembro', lat: -17.8790, lng: 36.8830, type: 'street' },
    { name: 'Av. 1 de Maio', lat: -17.8775, lng: 36.8910, type: 'street' }, // Adjusted distinct from Samora Machel
    { name: 'Av. Kenneth Kaunda', lat: -17.8700, lng: 36.8880, type: 'street' },
    { name: 'Av. da Independência', lat: -17.8710, lng: 36.8800, type: 'street' },
    { name: 'Av. Heróis Moçambicanos', lat: -17.8730, lng: 36.8930, type: 'street' },
    { name: 'Av. da Revolução', lat: -17.8810, lng: 36.8850, type: 'street' },
    { name: 'Av. Acordos de Lusaka', lat: -17.8680, lng: 36.8800, type: 'street' },
    { name: 'Av. das FPLM', lat: -17.8650, lng: 36.8750, type: 'street' }, // Towards Sangariveira
    { name: 'Rua dos Continuadores', lat: -17.8755, lng: 36.8845, type: 'street' },
    { name: 'Rua do Aeroporto', lat: -17.8540, lng: 36.8870, type: 'street' },
    { name: 'Rua da Missão', lat: -17.8790, lng: 36.8860, type: 'street' },
    { name: 'Rua do Hospital', lat: -17.8735, lng: 36.8925, type: 'street' },
    { name: 'Rua da Praia', lat: -17.8900, lng: 36.8950, type: 'street' },
    { name: 'Rua do Porto', lat: -17.8860, lng: 36.8890, type: 'street' },

    // Landmarks
    { name: 'Mercado Central', lat: -17.8764, lng: 36.8878, type: 'landmark' },
    { name: 'Aeroporto de Quelimane', lat: -17.8536, lng: 36.8875, type: 'landmark' },
    { name: 'Sagrada Família', lat: -17.8701, lng: 36.8834, type: 'landmark' },
    { name: 'São José', lat: -17.8812, lng: 36.8723, type: 'landmark' },
    { name: 'PEP', lat: -17.8740, lng: 36.8828, type: 'landmark' },
    { name: 'Shoprite', lat: -17.8735, lng: 36.8832, type: 'landmark' },
    { name: 'Hospital Provincial de Quelimane', lat: -17.8732, lng: 36.8921, type: 'landmark' },
    { name: 'Praia de Zalala', lat: -17.9867, lng: 37.0543, type: 'landmark' },
    { name: 'FIPAG do Sampene', lat: -17.8851, lng: 36.8982, type: 'landmark' },
    { name: 'FIPAG da Cidade', lat: -17.8742, lng: 36.8856, type: 'landmark' },
    { name: 'Recheio da Cidade', lat: -17.8778, lng: 36.8891, type: 'landmark' },
    { name: 'Recheio do Brandão', lat: -17.8642, lng: 36.8893, type: 'landmark' },
    { name: 'Galp da Sagrada Família', lat: -17.8712, lng: 36.8831, type: 'landmark' },
    { name: 'Galp da Malua', lat: -17.8654, lng: 36.8789, type: 'landmark' },
    { name: 'UCM Quelimane', lat: -17.8721, lng: 36.8812, type: 'landmark' },
    { name: 'Barandão', lat: -17.8745, lng: 36.8956, type: 'landmark' },
    { name: 'Universidade Pedagógica', lat: -17.8700, lng: 36.8800, type: 'landmark' },
    { name: 'Catedral de Quelimane', lat: -17.8750, lng: 36.8860, type: 'landmark' },
    { name: 'Escola Secundária 3 de Fevereiro', lat: -17.8680, lng: 36.8820, type: 'landmark' }
];

export const BAIRROS = QUELIMANE_LOCATIONS.filter(l => l.type === 'bairro').map(l => l.name);
export const STREETS = QUELIMANE_LOCATIONS.filter(l => l.type === 'street').map(l => l.name);