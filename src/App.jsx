import React, { useState } from 'react';
import Background3D from './components/Background3D';
import Header from './components/Header';
import HeroSearch from './components/HeroSearch';
import RoadmapDisplay from './components/RoadmapDisplay';
import SettingsModal from './components/SettingsModal';
import { useStore } from './store';
import { AnimatePresence } from 'framer-motion';

function App() {
    const [showSettings, setShowSettings] = useState(false);
    const phase = useStore((state) => state.appPhase);

    return (
        <>
            <Background3D />

            <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header onOpenSettings={() => setShowSettings(true)} />

                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimatePresence mode="wait">
                        {phase === 'search' && <HeroSearch key="hero" />}
                        {phase === 'roadmap' && <RoadmapDisplay key="roadmap" />}
                    </AnimatePresence>
                </main>
            </div>

            <AnimatePresence>
                {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
            </AnimatePresence>
        </>
    );
}

export default App;
