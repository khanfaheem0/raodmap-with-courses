import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { generateRoadmap } from '../services/aiService';

export default function HeroSearch() {
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);

    const setRoadmapData = useStore((state) => state.setRoadmapData);
    const apiKeys = useStore((state) => state.apiKeys);
    const clearCoursesAndProgress = useStore((state) => state.clearCoursesAndProgress);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (!apiKeys.gemini) {
            setError("Please set your Gemini API key in the settings first (top right icon).");
            return;
        }

        setIsGenerating(true);
        setError(null);
        clearCoursesAndProgress();
        try {
            const data = await generateRoadmap(input, apiKeys.gemini);
            setRoadmapData(input, data);
        } catch (err) {
            setError(err.message || "Failed to generate roadmap. Check your API key.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                width: '100%',
                maxWidth: '800px',
                textAlign: 'center'
            }}
        >
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="glow-text" style={{ fontSize: '4rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.1 }}>
                    What do you want to <span style={{ color: 'var(--accent)' }}>learn</span> today?
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                    Type any subject and we'll generate a highly-structured, phase-by-phase learning roadmap engineered just for you.
                </p>
            </div>

            <form onSubmit={handleSearch} style={{ width: '100%', position: 'relative' }}>
                <input
                    autoFocus
                    className="glass-panel"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. Full Stack Web Development, UI/UX Design..."
                    disabled={isGenerating}
                    style={{
                        width: '100%',
                        padding: '1.5rem 2rem',
                        paddingRight: '180px',
                        fontSize: '1.5rem',
                        color: 'white',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={isGenerating}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '10px',
                        bottom: '10px',
                        background: 'linear-gradient(45deg, var(--primary), #FF7B54)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '0 2rem',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 15px rgba(255, 90, 95, 0.4)',
                        transition: 'transform 0.2s ease, opacity 0.2s'
                    }}
                >
                    {isGenerating ? (
                        <><Sparkles className="spin-animation" size={24} /> Generating...</>
                    ) : (
                        <><Search size={24} /> Generate</>
                    )}
                </button>
            </form>

            {error && (
                <div style={{ marginTop: '1rem', color: '#ff4d4d', background: 'rgba(255,0,0,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Try:</span>
                {['Machine Learning', 'Cybersecurity', 'React Native', 'Data Science'].map((topic) => (
                    <button
                        key={topic}
                        onClick={() => setInput(topic)}
                        disabled={isGenerating}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '0.2rem 1rem',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.target.style.background = 'transparent'}
                    >
                        {topic}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
