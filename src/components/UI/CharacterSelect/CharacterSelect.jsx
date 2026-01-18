import { useState } from 'react';
import { PILOTS_LIST } from '../../../config/ships';
import './CharacterSelect.css';

// Mapeamento de imagens dos personagens
const pilotImages = {
    kaio: '/assets/characters/select/Kaio.jpeg',
    cesar: '/assets/characters/select/Cesar.jpeg',
    kyra: '/assets/characters/select/Kyra.jpeg',
};

const CharacterSelect = ({ onSelect }) => {
    const [selectedPilot, setSelectedPilot] = useState(null);

    const handleConfirm = () => {
        if (selectedPilot) {
            onSelect(selectedPilot);
        }
    };

    const renderStatBar = (value, maxValue = 5, color) => {
        return (
            <div className="stat-bar">
                {Array.from({ length: maxValue }).map((_, i) => (
                    <div
                        key={i}
                        className={`stat-segment ${i < value ? 'filled' : ''}`}
                        style={{ backgroundColor: i < value ? color : 'transparent' }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="character-select">
            {/* Imagem de fundo */}
            <img
                className="character-select-bg"
                src="/assets/backgrounds/hangar.png"
                alt=""
            />

            {/* Fundo com partículas */}
            <div className="select-particles">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="select-particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>

            <h1 className="select-title">ESCOLHA SEU PILOTO</h1>
            <p className="select-subtitle">A missão aguarda. Escolha sabiamente.</p>

            {/* Personagens */}
            <div className="pilots-container">
                {PILOTS_LIST.map((pilot) => (
                    <div
                        key={pilot.id}
                        className={`pilot-item ${selectedPilot?.id === pilot.id ? 'selected' : ''}`}
                        style={{ '--pilot-color': pilot.color }}
                        onClick={() => setSelectedPilot(pilot)}
                    >
                        <div className="pilot-image-wrapper">
                            <img
                                src={pilotImages[pilot.id]}
                                alt={pilot.pilot}
                                className="pilot-image"
                            />
                        </div>
                        <span className="pilot-name">{pilot.pilot}</span>
                    </div>
                ))}
            </div>

            {/* Painel de informações */}
            <div className={`info-panel ${selectedPilot ? 'visible' : ''}`}>
                {selectedPilot && (
                    <>
                        <p className="pilot-description">{selectedPilot.description}</p>

                        <div className="stats-container">
                            <div className="stat-row">
                                <span className="stat-label">VELOCIDADE</span>
                                {renderStatBar(selectedPilot.stats.speed, 5, selectedPilot.color)}
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">BLINDAGEM</span>
                                {renderStatBar(selectedPilot.stats.armor, 5, selectedPilot.color)}
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">AGILIDADE</span>
                                {renderStatBar(selectedPilot.stats.agility, 5, selectedPilot.color)}
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">COMBUSTÍVEL</span>
                                {renderStatBar(selectedPilot.stats.fuel, 5, selectedPilot.color)}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Botão de confirmar */}
            <button
                className={`confirm-btn ${selectedPilot ? 'active' : ''}`}
                onClick={handleConfirm}
                disabled={!selectedPilot}
            >
                INICIAR MISSÃO
            </button>
        </div>
    );
};

export default CharacterSelect;
