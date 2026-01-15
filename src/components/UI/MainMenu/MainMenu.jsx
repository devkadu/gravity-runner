import { useState, useEffect } from 'react';
import './MainMenu.css';

const MainMenu = ({ onStartGame, onOptions }) => {
    const [showOptions, setShowOptions] = useState(false);
    const [stars, setStars] = useState([]);

    useEffect(() => {
        // Gerar estrelas aleatórias
        const generatedStars = Array.from({ length: 150 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            animationDuration: Math.random() * 3 + 2,
            delay: Math.random() * 2,
        }));
        setStars(generatedStars);

        // Mostrar opções após 2.5 segundos
        const timer = setTimeout(() => {
            setShowOptions(true);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="main-menu">
            {/* Estrelas de fundo */}
            <div className="stars-container">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="star"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            animationDuration: `${star.animationDuration}s`,
                            animationDelay: `${star.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Título com efeito neon quebrado */}
            <div className="title-container">
                <h1 className="game-title" data-text="GRAVITY RUNNER">
                    GRAVITY RUNNER
                </h1>
            </div>

            {/* Opções do menu */}
            <div className={`menu-options ${showOptions ? 'visible' : ''}`}>
                <button className="menu-btn" onClick={onStartGame}>
                    <span className="btn-text">JOGAR</span>
                </button>
                <button className="menu-btn" onClick={onOptions}>
                    <span className="btn-text">OPÇÕES</span>
                </button>
            </div>
        </div>
    );
};

export default MainMenu;
