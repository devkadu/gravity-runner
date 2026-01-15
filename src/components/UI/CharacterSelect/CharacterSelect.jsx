import { useState } from 'react';
import { PILOTS_LIST } from '../../../config/ships';
import './CharacterSelect.css';

const CharacterSelect = ({ onSelect }) => {
    const [selectedPilot, setSelectedPilot] = useState(null);
    const [hoveredPilot, setHoveredPilot] = useState(null);

    const activePilot = hoveredPilot || selectedPilot;

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

            {/* Cards dos pilotos */}
            <div className="pilots-container">
                {PILOTS_LIST.map((pilot) => (
                    <div
                        key={pilot.id}
                        className={`pilot-card ${selectedPilot?.id === pilot.id ? 'selected' : ''}`}
                        style={{ '--pilot-color': pilot.color }}
                        onClick={() => setSelectedPilot(pilot)}
                        onMouseEnter={() => setHoveredPilot(pilot)}
                        onMouseLeave={() => setHoveredPilot(null)}
                    >
                        {/* Silhueta da nave */}
                        <div className="ship-silhouette">
                            <div className="ship-icon">{pilot.ship[0]}</div>
                        </div>

                        <h2 className="pilot-name">{pilot.pilot}</h2>
                        <h3 className="ship-name">{pilot.ship}</h3>

                        {/* Indicador de seleção */}
                        {selectedPilot?.id === pilot.id && (
                            <div className="selected-indicator">SELECIONADO</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Painel de informações */}
            <div className={`info-panel ${activePilot ? 'visible' : ''}`}>
                {activePilot && (
                    <>
                        <p className="pilot-description">{activePilot.description}</p>

                        <div className="stats-container">
                            <div className="stat-row">
                                <span className="stat-label">VELOCIDADE</span>
                                {renderStatBar(activePilot.stats.speed, 5, activePilot.color)}
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">BLINDAGEM</span>
                                {renderStatBar(activePilot.stats.armor, 5, activePilot.color)}
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">AGILIDADE</span>
                                {renderStatBar(activePilot.stats.agility, 5, activePilot.color)}
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">COMBUSTÍVEL</span>
                                {renderStatBar(activePilot.stats.fuel, 5, activePilot.color)}
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
