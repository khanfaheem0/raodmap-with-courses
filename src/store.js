import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            appPhase: 'search', // 'search', 'loading', 'roadmap'
            setAppPhase: (phase) => set({ appPhase: phase }),

            roadmapData: null,
            subject: '',
            setRoadmapData: (subject, data) => set({ subject, roadmapData: data, appPhase: 'roadmap' }),

            courses: {}, // { phaseId: [courses...] }
            setCourses: (phaseId, courses) =>
                set((state) => ({ courses: { ...state.courses, [phaseId]: courses } })),

            courseProgress: {}, // { courseId: boolean }
            toggleCourseProgress: (courseId) =>
                set((state) => ({
                    courseProgress: {
                        ...state.courseProgress,
                        [courseId]: !state.courseProgress[courseId]
                    }
                })),

            clearCoursesAndProgress: () => set({ courses: {}, courseProgress: {} }),

            apiKeys: {
                gemini: '',
                tavily: ''
            },
            setApiKeys: (keys) => set({ apiKeys: keys }),
        }),
        {
            name: 'learning-roadmap-storage',
            partialize: (state) => ({
                apiKeys: state.apiKeys,
                roadmapData: state.roadmapData,
                subject: state.subject,
                courses: state.courses,
                courseProgress: state.courseProgress
            }),
        }
    )
);
