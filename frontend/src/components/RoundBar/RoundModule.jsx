import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css"; // Import the styles

const RoundModule = ({ initialProgress, title, Module, complete }) => {
    // Initialize the progress state
    const progress = initialProgress

    // Handle the input change
    // const handleInputChange = (e) => {
    //     let value = parseInt(e.target.value, 10);
    //     // Ensure value is between 0 and 100
    //     if (value >= 0 && value <= 100) {
    //         setProgress(value);
    //     }
    // };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Module
                    </div>
                    <h4 className="mt-3 truncate text-lg font-semibold text-slate-950">{title}</h4>
                    <p className="mt-2 text-sm text-slate-600">{Module}</p>
                    <p className="mt-1 text-sm text-slate-500">{complete}</p>
                </div>

                <div className="shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                        <CircularProgressbar
                            value={progress}
                            text={`${progress}%`}
                            styles={buildStyles({
                                pathColor: "#016E5B",
                                textColor: "#111827",
                                trailColor: "#e2e8f0",
                                strokeWidth: 8,
                            })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoundModule;
