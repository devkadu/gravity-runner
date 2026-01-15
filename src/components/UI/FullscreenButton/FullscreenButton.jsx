import { useState, useEffect } from 'react';
import './FullscreenButton.css';

const FullscreenButton = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? '[X]' : '[ ]'}
        </button>
    );
};

export default FullscreenButton;
