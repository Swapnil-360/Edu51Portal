interface MarqueeTickerProps {
    isDarkMode: boolean;
}

const features = [
    { label: "World Cup '26 — Team Challenges & Leaderboard" },
    { label: 'AI Study Assistant — Ask anything, anytime' },
    { label: 'Semester Progress Tracker' },
    { label: 'Team Building & Kanban Board' },
    { label: 'Student Network & Connections' },
    { label: 'Course Materials & PDF Resources' },
    { label: 'Exam Questions Archive' },
    { label: 'Real-time Push Notifications' },
    { label: 'Google Drive Integration' },
    { label: 'Custom Class Routine Planner' },
    { label: 'Academic Calendar & Deadlines' },
    { label: 'Alumni Hub' },
    { label: 'Student Profile & Portfolio' },
    { label: 'Team Announcements & Chat' },
    { label: 'Major-Based Secure Access' },
];

export default function MarqueeTicker({ isDarkMode }: MarqueeTickerProps) {
    return (
        <div className="w-full mb-6">
            <div
                className={`relative overflow-hidden rounded-2xl border ${
                    isDarkMode
                        ? 'bg-[#16181c]/60 border-[#2f3336]/60 shadow-lg shadow-black/20'
                        : 'bg-white border-slate-200 shadow-md shadow-black/6'
                }`}
            >
                {/* Left fade */}
                <div
                    className={`pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 ${
                        isDarkMode
                            ? 'bg-gradient-to-r from-[#16181c] to-transparent'
                            : 'bg-gradient-to-r from-white to-transparent'
                    }`}
                />
                {/* Right fade */}
                <div
                    className={`pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 ${
                        isDarkMode
                            ? 'bg-gradient-to-l from-[#16181c] to-transparent'
                            : 'bg-gradient-to-l from-white to-transparent'
                    }`}
                />

                <div
                    className="flex items-center py-3.5 overflow-hidden whitespace-nowrap"
                    role="region"
                    aria-label="Available features"
                >
                    <div className="animate-marquee inline-flex items-center" style={{ willChange: 'transform' }}>
                        {[...features, ...features].map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-4 px-6">
                                <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-slate-500' : 'bg-slate-300'}`} />
                                <span className={`text-sm font-medium tracking-wide ${
                                    isDarkMode ? 'text-[#8b98a5]' : 'text-slate-600'
                                }`}>{f.label}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
