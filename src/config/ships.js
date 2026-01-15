export const SHIPS_CONFIG = {
    SKYRIUM: {
        id: 'kaio',
        pilot: 'Comandante Kaio',
        ship: 'SKYRIUM',
        sprite: 'ship_blue',
        color: '#ff6a00',
        description: 'Forte e imponente. Gosta de fazer pose para as meninas, mas é um dos melhores pilotos de guerra de Yotur 5.',

        // Stats do jogo
        fuelMax: 150,
        orbitSpeed: 0.03,
        acceleration: 0.08,

        // Stats visuais (1-5)
        stats: {
            speed: 2,
            armor: 5,
            agility: 2,
            fuel: 5,
        },
    },

    TILUZ: {
        id: 'cesar',
        pilot: 'César',
        ship: 'TILUZ',
        sprite: 'ship_white',
        color: '#00ff88',
        description: 'Cresceu no interior do planeta e aprendeu a voar com seu pai. Piloto equilibrado e confiável.',

        // Stats do jogo
        fuelMax: 100,
        orbitSpeed: 0.05,
        acceleration: 0.15,

        // Stats visuais (1-5)
        stats: {
            speed: 3,
            armor: 3,
            agility: 3,
            fuel: 3,
        },
    },

    KUM_KUM: {
        id: 'kyra',
        pilot: 'Kyra',
        ship: 'KUM KUM',
        sprite: 'ship_pink',
        color: '#ff00ff',
        description: '19 anos. Não acredita nos burocratas, mas quer provar que é mais do que apenas uma mulher bonita. Pilota de caça ágil.',

        // Stats do jogo
        fuelMax: 80,
        orbitSpeed: 0.08,
        acceleration: 0.25,

        // Stats visuais (1-5)
        stats: {
            speed: 5,
            armor: 2,
            agility: 5,
            fuel: 2,
        },
    },
};

// Array para iteração fácil
export const PILOTS_LIST = Object.values(SHIPS_CONFIG);

// Função para pegar config por ID
export const getShipById = (id) => {
    return PILOTS_LIST.find(ship => ship.id === id);
};

// Função para pegar config por nome da nave
export const getShipByName = (shipName) => {
    const key = shipName.replace(' ', '_').toUpperCase();
    return SHIPS_CONFIG[key];
};
