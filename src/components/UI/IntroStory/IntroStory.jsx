import { useState, useEffect, useRef } from "react";
import "./IntroStory.css";

const storyParagraphs = [
    "O centro do planeta Yotur 5 está morrendo...",
    "Porém, cientistas descobriram uma matéria-prima capaz de reverter esse destino cruel.",
    "Há duas notícias: a boa é que essa matéria já existe no espaço ao redor do planeta.",
    "A má notícia? Uma chuva de meteoros mortais cerca toda a órbita.",
    "Com o pouco combustível que resta, uma missão suicida foi convocada.",
    "Os melhores pilotos de Yotur 5 foram chamados para salvar seu mundo...",
];

const loadingMessages = [
    "Inicializando sistemas...",
    "Carregando dados da missão...",
    "Calibrando sensores...",
    "Verificando combustível...",
    "Preparando navegação orbital...",
    "Sistemas prontos.",
];

// Calcula duração total da história
// Cada parágrafo: (chars * 50ms) + 2500ms de pausa
const calculateTotalDuration = () => {
    return storyParagraphs.reduce((total, paragraph) => {
        return total + paragraph.length * 50 + 2500;
    }, 0);
};

const TOTAL_DURATION = calculateTotalDuration();

const IntroStory = ({ onComplete }) => {
    const [currentParagraph, setCurrentParagraph] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const [showSkip, setShowSkip] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Loading sincronizado
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        const timer = setTimeout(() => setShowSkip(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Loading sincronizado com a história
    useEffect(() => {
        if (isComplete) return;

        const updateProgress = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);

            setLoadingProgress(progress);

            // Atualiza mensagem baseado no progresso
            const messageIndex = Math.min(
                Math.floor((progress / 100) * loadingMessages.length),
                loadingMessages.length - 1
            );
            setLoadingMessage(loadingMessages[messageIndex]);
        };

        const interval = setInterval(updateProgress, 100);
        return () => clearInterval(interval);
    }, [isComplete]);

    // Typing da história
    useEffect(() => {
        if (currentParagraph >= storyParagraphs.length) {
            setIsComplete(true);
            setLoadingProgress(100);
            setLoadingMessage(loadingMessages[loadingMessages.length - 1]);

            setTimeout(() => {
                setFadeOut(true);
                setTimeout(onComplete, 1000);
            }, 800);
            return;
        }

        const text = storyParagraphs[currentParagraph];
        let charIndex = 0;
        setDisplayedText("");
        setIsTyping(true);

        const typingInterval = setInterval(() => {
            if (charIndex < text.length) {
                setDisplayedText(text.substring(0, charIndex + 1));
                charIndex++;
            } else {
                setIsTyping(false);
                clearInterval(typingInterval);

                setTimeout(() => {
                    setCurrentParagraph((prev) => prev + 1);
                }, 2500);
            }
        }, 50);

        return () => clearInterval(typingInterval);
    }, [currentParagraph, onComplete]);

    const handleSkip = () => {
        setFadeOut(true);
        setTimeout(onComplete, 500);
    };

    return (
        <div className={`intro-story ${fadeOut ? "fade-out" : ""}`} translate="no">
            {/* Imagem de fundo */}
            <img
                className="intro-story-bg"
                src="/assets/backgrounds/introStory.png"
                alt=""
            />

            {/* Partículas de fundo */}
            <div className="story-particles">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${Math.random() * 10 + 10}s`,
                        }}
                    />
                ))}
            </div>

            {/* Texto da história */}
            <div className="story-container">
                <p className="story-text">
                    {displayedText}
                    {isTyping && <span className="cursor">|</span>}
                </p>
            </div>

            <div className="intro-footer">
                {/* Loading na parte inferior */}
                <div className="loading-bottom">
                    <div className="loading-info">
                        <span className="loading-message-inline">{`> ${loadingMessage}`}</span>
                        <span className="loading-percent-inline">
                            {Math.floor(loadingProgress)}%
                        </span>
                    </div>
                    <div className="loading-bar-bottom">
                        <div
                            className="loading-bar-fill"
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Botão de pular */}
                <button
                    className={`skip-btn ${showSkip ? "visible" : ""}`}
                    onClick={handleSkip}
                >
                    PULAR
                </button>
            </div>
        </div>
    );
};

export default IntroStory;
