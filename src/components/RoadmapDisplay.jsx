import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { fetchCoursesForPhase } from '../services/courseService';
import { CheckCircle, Clock, List, Loader, AlertTriangle } from 'lucide-react';

export default function RoadmapDisplay() {
    const roadmapData = useStore((state) => state.roadmapData);
    const subject = useStore((state) => state.subject);
    const courses = useStore((state) => state.courses);
    const setCourses = useStore((state) => state.setCourses);
    const progress = useStore((state) => state.courseProgress);
    const toggleProgress = useStore((state) => state.toggleCourseProgress);
    const apiKeys = useStore((state) => state.apiKeys);

    const [loadingPhase, setLoadingPhase] = useState(null);

    if (!roadmapData) return null;

    const handleLoadCourses = async (phase) => {
        if (!apiKeys.tavily) {
            alert("Please set your Tavily API Key in settings first.");
            return;
        }
        if (!apiKeys.gemini) {
            alert("Please set your Gemini API Key in settings first.");
            return;
        }
        setLoadingPhase(phase.id);
        try {
            const fetchedResult = await fetchCoursesForPhase(phase, apiKeys);
            setCourses(phase.id, fetchedResult);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoadingPhase(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="roadmap-container"
            style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{roadmapData.subject || subject}</h2>
                <p style={{ color: 'var(--text-muted)' }}>Structured Learning Roadmap</p>
            </div>

            {roadmapData.phases.map((phase, index) => (
                <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className="glass-panel"
                    style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
                >
                    {/* Connecting Line (except last) */}
                    {index < roadmapData.phases.length - 1 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-32px',
                            left: '50px',
                            width: '4px',
                            height: '32px',
                            background: 'linear-gradient(to bottom, var(--primary), var(--secondary))',
                            borderRadius: '2px'
                        }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '0.2rem 0.8rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                marginBottom: '0.5rem',
                                display: 'inline-block'
                            }}>
                                Phase {index + 1}
                            </span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{phase.title}</h3>
                            <p style={{ color: 'var(--text-muted)' }}>{phase.goal}</p>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 600 }}>
                                <Clock size={16} /> ~{phase.estimatedHours}h
                            </div>
                            <span style={{ fontSize: '0.9rem', color: '#888' }}>{phase.difficulty}</span>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '1rem' }}>
                            <List size={16} /> Key Topics to Cover:
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {phase.topics.map((topic, i) => {
                                const phaseData = courses[phase.id];
                                let isCovered = false;
                                if (phaseData) {
                                    const allCourses = [
                                        ...(phaseData.recommendedCourses || []),
                                        ...(phaseData.gapFillerCourses || [])
                                    ];
                                    isCovered = allCourses.some(c =>
                                        c.topicsCovered?.some(t => t.toLowerCase() === topic.toLowerCase())
                                    );
                                }
                                const hasData = !!phaseData;
                                return (
                                    <span key={i} style={{
                                        background: hasData
                                            ? (isCovered ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)')
                                            : 'rgba(255,255,255,0.05)',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        border: hasData
                                            ? (isCovered ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(248,113,113,0.35)')
                                            : '1px solid rgba(255,255,255,0.1)',
                                        color: hasData
                                            ? (isCovered ? '#4ade80' : '#f87171')
                                            : 'inherit',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {hasData && (isCovered ? '✓ ' : '✗ ')}{topic}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Courses Section */}
                    <div style={{ marginTop: '1rem' }}>
                        {!courses[phase.id] ? (
                            <button
                                className="glass-button"
                                onClick={() => handleLoadCourses(phase)}
                                disabled={loadingPhase === phase.id}
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {loadingPhase === phase.id ? <><Loader className="spin-animation" size={18} /> Finding Courses (Tavily + AI)...</> : 'Load Curated Courses'}
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Recommended Courses</h4>
                                {courses[phase.id].recommendedCourses.map(course => (
                                    <div key={course.url} style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        alignItems: 'flex-start'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <a href={course.url} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, display: 'block', marginBottom: '0.2rem', fontSize: '1.1rem' }}>
                                                {course.name}
                                            </a>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                {course.platform} • {course.instructor} • {course.estimatedHours || 'Duration not available'}
                                            </p>

                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                                <div style={{ color: '#4ade80' }}>
                                                    <strong>✓ Covers:</strong> {course.topicsCovered?.join(', ')}
                                                </div>
                                                {course.topicsMissing && course.topicsMissing.length > 0 && (
                                                    <div style={{ color: '#f87171' }}>
                                                        <strong>✗ Misses:</strong> {course.topicsMissing.join(', ')}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                <span style={{ background: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                    {course.coveragePercentage}% Coverage
                                                </span>
                                                {course.verificationStatus === 'fully_verified' && (
                                                    <span style={{ background: 'rgba(74, 222, 128, 0.15)', border: '1px solid #4ade80', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                                        ✓ Data verified
                                                    </span>
                                                )}
                                                {course.verificationStatus === 'partially_verified' && (
                                                    <span title="Some topic coverage claims are inferred — not all confirmed in Coursera curriculum data" style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                                        ⚠ Partially verified
                                                    </span>
                                                )}
                                                {(!course.verificationStatus || course.verificationStatus === 'ai_estimated') && (
                                                    <span title="No Coursera curriculum data available — coverage is AI-inferred from page snippet only" style={{ background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148,163,184,0.4)', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                        AI estimated
                                                    </span>
                                                )}
                                                <span style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Source: {course.dataSource}
                                                </span>
                                                {course.domainTags && course.domainTags.length > 0 && (
                                                    <span style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>
                                                        Tags: {course.domainTags.slice(0, 3).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleProgress(course.url)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: progress[course.url] ? 'var(--secondary)' : 'rgba(255,255,255,0.2)',
                                                transition: 'color 0.2s',
                                                paddingTop: '0.5rem'
                                            }}
                                        >
                                            <CheckCircle size={32} />
                                        </button>
                                    </div>
                                ))}

                                {/* ── GAP FILLERS ─────────────────────────────── */}
                                {courses[phase.id].gapFillerCourses?.length > 0 && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <h4 style={{
                                            borderBottom: '1px solid rgba(251,191,36,0.25)',
                                            paddingBottom: '0.5rem',
                                            color: '#fbbf24',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.95rem'
                                        }}>
                                            <AlertTriangle size={16} />
                                            Gap Fillers — Found for uncovered topics
                                        </h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                            These courses were discovered in a targeted search specifically to address topics the main recommendations missed.
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {courses[phase.id].gapFillerCourses.map(course => (
                                                <div key={course.url} style={{
                                                    display: 'flex',
                                                    gap: '1rem',
                                                    background: 'rgba(251,191,36,0.04)',
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(251,191,36,0.2)',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <a href={course.url} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, display: 'block', marginBottom: '0.2rem', fontSize: '1rem' }}>
                                                            {course.name}
                                                        </a>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                            {course.platform} • {course.instructor} • {course.estimatedHours || 'Duration not available'}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                                            <div style={{ color: '#4ade80' }}>
                                                                <strong>✓ Addresses:</strong> {course.topicsCovered?.join(', ')}
                                                            </div>
                                                            {course.topicsMissing?.length > 0 && (
                                                                <div style={{ color: '#f87171' }}>
                                                                    <strong>✗ Still misses:</strong> {course.topicsMissing.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <span style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                                Gap Filler
                                                            </span>
                                                            {course.verificationStatus === 'fully_verified' && (
                                                                <span style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid #4ade80', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>✓ Data verified</span>
                                                            )}
                                                            {course.verificationStatus === 'partially_verified' && (
                                                                <span title="Some claims inferred" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>⚠ Partially verified</span>
                                                            )}
                                                            {(!course.verificationStatus || course.verificationStatus === 'ai_estimated') && (
                                                                <span style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.4)', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem' }}>AI estimated</span>
                                                            )}
                                                            <span style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                                Source: {course.dataSource}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleProgress(course.url)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: progress[course.url] ? 'var(--secondary)' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s', paddingTop: '0.5rem' }}
                                                    >
                                                        <CheckCircle size={28} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── UNRESOLVED GAPS ──────────────────────────── */}
                                {courses[phase.id].unresolvedGaps?.length > 0 && (
                                    <div style={{ background: 'rgba(239,68,68,0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)', marginTop: '1rem' }}>
                                        <strong style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                            <AlertTriangle size={16} /> Unresolved Gaps — Search manually
                                        </strong>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', fontSize: '0.8rem', lineHeight: 1.6 }}>
                                            No course in our search covered these topics. We recommend searching for them individually on Coursera, YouTube, or official documentation:
                                        </p>
                                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                                            {courses[phase.id].unresolvedGaps.map(gap => (
                                                <li key={gap} style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{gap}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}

        </motion.div>
    );
}
