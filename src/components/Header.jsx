import React from 'react';
import { Settings, BookOpen, Download } from 'lucide-react';
import { useStore } from '../store';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Header({ onOpenSettings }) {
    const phase = useStore((state) => state.appPhase);
    const courses = useStore((state) => state.courses);
    const progress = useStore((state) => state.courseProgress);

    const calculateProgress = () => {
        let total = 0;
        let completed = 0;
        Object.values(courses).forEach(phaseData => {
            if (phaseData && phaseData.recommendedCourses) {
                phaseData.recommendedCourses.forEach(course => {
                    total++;
                    if (progress[course.url]) completed++;
                });
            }
        });
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    const percent = calculateProgress();

    const handleExportPDF = async () => {
        const roadmapElement = document.getElementById('roadmap-container');
        if (!roadmapElement) return;

        try {
            const canvas = await html2canvas(roadmapElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('learning-roadmap.pdf');
        } catch (error) {
            console.error("Export failed", error);
        }
    };

    return (
        <header className="glass-panel" style={{
            margin: '1rem',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen color="var(--primary)" size={28} />
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    Roadmap<span style={{ color: 'var(--primary)' }}>Gen</span>
                </h1>
            </div>

            {phase === 'roadmap' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, padding: '0 2rem' }}>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{percent}%</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
                {phase === 'roadmap' && (
                    <button className="glass-button" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={18} /> Export PDF
                    </button>
                )}
                <button className="glass-button" onClick={onOpenSettings} title="Settings & API Keys">
                    <Settings size={20} />
                </button>
            </div>
        </header>
    );
}
