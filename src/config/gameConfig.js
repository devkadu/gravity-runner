/**
 * CONFIGURAÇÃO CENTRALIZADA DO JOGO
 *
 * Altere os valores aqui para ajustar o gameplay sem mexer no código.
 * Todas as constantes do jogo estão organizadas por categoria.
 */

// =============================================================================
// ÓRBITAS - Distâncias das órbitas em relação ao planeta
// =============================================================================
export const ORBITS = {
    INNER: 80,      // Órbita interna (mais perto do planeta)
    MIDDLE: 140,    // Órbita do meio
    OUTER: 200,     // Órbita externa (mais longe)
};

export const BASE_ORBIT = ORBITS.INNER;

// =============================================================================
// FASES DO JOGO - Progressão de dificuldade
// =============================================================================
export const PHASES = [
    { mineralTarget: 5, meteorSpawnDelay: 5000 },   // Fase 1: fácil
    { mineralTarget: 8, meteorSpawnDelay: 4700 },   // Fase 2
    { mineralTarget: 10, meteorSpawnDelay: 4400 },  // Fase 3
    { mineralTarget: 15, meteorSpawnDelay: 4000 },  // Fase 4: difícil
];

// =============================================================================
// TEMPOS DE SPAWN - Intervalos de aparecimento de itens (em ms)
// =============================================================================
export const SPAWN_TIMING = {
    MINERAL_DELAY: 2500,           // Tempo entre spawns de minerais
    FUEL_STAR_DELAY: 3000,         // Tempo entre spawns de combustível
    FUEL_CONSUMPTION_DELAY: 100,   // Intervalo de consumo de combustível
    TUTORIAL_ITEM_DELAY: 800,      // Delay para spawn de item no tutorial
    ORBIT_COOLDOWN: 300,           // Cooldown entre mudanças de órbita
};

// =============================================================================
// DISTÂNCIAS DE COLISÃO - Raio para detectar colisões (em pixels)
// =============================================================================
export const COLLISION = {
    METEOR_RADIUS: 25,    // Distância para colidir com meteoro
    MINERAL_RADIUS: 20,   // Distância para coletar mineral
    FUEL_RADIUS: 18,      // Distância para coletar combustível
};

// =============================================================================
// VALORES DOS ITENS - Quanto cada item vale
// =============================================================================
export const ITEM_VALUES = {
    FUEL_STAR: 8,           // Combustível recuperado por estrela
    FUEL_STAR_TUTORIAL: 20, // Combustível no tutorial (mais generoso)
    MINERAL: 1,             // Pontos por mineral coletado
};

// =============================================================================
// COMBUSTÍVEL - Configurações de consumo
// =============================================================================
export const FUEL = {
    CONSUMPTION_RATE: 0.5,  // Quanto consome por tick
};

// =============================================================================
// CORES - Paleta de cores do jogo (formato hexadecimal)
// =============================================================================
export const COLORS = {
    // Cores principais
    FUEL: 0xff6a00,           // Laranja - combustível
    MINERAL: 0x4da6ff,        // Azul - minerais
    PRIMARY: 0xff6a00,        // Cor principal do jogo

    // UI
    BACKGROUND: 0x000000,     // Fundo
    BACKGROUND_OVERLAY: 0x000000,
    BACKGROUND_OVERLAY_ALPHA: 0.3,

    // Botões
    BUTTON: 0x333333,         // Botão normal
    BUTTON_HOVER: 0x555555,   // Botão hover/active

    // Texto (formato CSS)
    TEXT_PRIMARY: '#ff6a00',
    TEXT_SECONDARY: '#4da6ff',
    TEXT_LIGHT: '#cccccc',
    TEXT_DARK: '#666666',
    TEXT_WHITE: '#ffffff',
};

// =============================================================================
// TAMANHOS DE SPRITES - Dimensões dos elementos visuais (em pixels)
// =============================================================================
export const SPRITE_SIZES = {
    ASTEROID: 92,
    MINERAL: 45,
    FUEL: 54,
    SHIP_TARGET: 96,
    PLANET_TARGET: 100,
};

// =============================================================================
// HUD - Configurações da interface
// =============================================================================
export const HUD = {
    GAUGE_RADIUS: 36,
    GAUGE_THICKNESS: 6,
    GAUGE_OFFSET: 28,
    GAUGE_Y: 70,
};

// =============================================================================
// BOTÕES MOBILE - Posicionamento dos controles touch
// =============================================================================
export const BUTTONS = {
    LEFT_X: 80,
    RIGHT_X_OFFSET: 80,    // Subtrai da largura da tela
    BOTTOM_Y_OFFSET: 120,  // Subtrai da altura da tela
    RADIUS: 40,
    GLOW_RADIUS: 50,
    LABEL_OFFSET: 50,      // Distância do label abaixo do botão
};

// =============================================================================
// METEOROS - Configurações dos asteroides inimigos
// =============================================================================
export const METEORS = {
    SIZE_MIN: 26,
    SIZE_MAX: 38,
    SPEED_MIN: 0.01,
    SPEED_MAX: 0.025,
    LIFETIME: 15000,       // Tempo de vida em ms
};

// =============================================================================
// COLETÁVEIS - Tempo de vida dos itens
// =============================================================================
export const COLLECTIBLES = {
    MINERAL_LIFETIME: 5000,
    FUEL_STAR_LIFETIME: 5000,
};

// =============================================================================
// TUTORIAL - Configurações do tutorial
// =============================================================================
export const TUTORIAL = {
    TYPE_SPEED: 45,          // Velocidade de digitação (ms por caractere)
    DELAY_MULTIPLIER: 1.5,   // Multiplicador de delay entre mensagens
};

// =============================================================================
// MECÂNICAS DE ÓRBITA - Física do movimento orbital
// =============================================================================
export const ORBIT_MECHANICS = {
    TRANSITION_FACTOR: 0.1,  // Suavidade da transição entre órbitas
};

// =============================================================================
// TRILHA DA NAVE - Efeito visual de rastro
// =============================================================================
export const TRAIL = {
    MAX_LENGTH: 15,          // Número máximo de pontos na trilha
};

// =============================================================================
// CAMADAS DE ESTRELAS - Background parallax
// =============================================================================
export const STAR_LAYERS = [
    { qty: 200, size: 1, alpha: 0.4, speed: 0.05 },  // Camada distante
    { qty: 100, size: 2, alpha: 0.7, speed: 0.15 },  // Camada média
    { qty: 40, size: 3, alpha: 0.9, speed: 0.4 },    // Camada próxima
];

// =============================================================================
// TELA DO JOGO - Dimensões padrão
// =============================================================================
export const SCREEN = {
    DEFAULT_WIDTH: 1024,
    DEFAULT_HEIGHT: 768,
    BACKGROUND_COLOR: '#000000',
};
