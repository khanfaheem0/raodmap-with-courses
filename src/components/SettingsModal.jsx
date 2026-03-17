import React from 'react';
import { motion } from 'framer-motion';
import { X, Key } from 'lucide-react';
import { useStore } from '../store';

export default function SettingsModal({ onClose }) {
    const apiKeys = useStore((state) => state.apiKeys);
    const setApiKeys = useStore((state) => state.setApiKeys);

    const handleSubmit = (e) => {
        e.preventDefault();
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100
            }}
        >
            <motion.div
                initial={{ y: 50, scale: 0.9 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, scale: 0.95 }}
                className="glass-panel"
                style={{
                    width: '90%',
                    maxWidth: '500px',
                    padding: '2rem',
                    position: 'relative',
                    background: 'rgba(20, 20, 30, 0.8)'
                }}
            >
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <Key size={28} color="var(--primary)" />
                    <h2 style={{ fontSize: '1.8rem' }}>API Configuration</h2>
                </div>

                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    Your keys are saved locally in your browser and are never sent to any server other than the official Google Gemini and Tavily Search APIs.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Gemini API Key (Required for AI)</label>
                        <input
                            type="password"
                            value={apiKeys.gemini}
                            onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                            placeholder="AIzaSy..."
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tavily Search API Key (Required for courses)</label>
                        <input
                            type="password"
                            value={apiKeys.tavily}
                            onChange={(e) => setApiKeys({ ...apiKeys, tavily: e.target.value })}
                            placeholder="tvly-..."
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                outline: 'none',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>

                    <button type="submit" className="glass-button" style={{ marginTop: '1rem', background: 'var(--primary)' }}>
                        Save Configuration
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}
