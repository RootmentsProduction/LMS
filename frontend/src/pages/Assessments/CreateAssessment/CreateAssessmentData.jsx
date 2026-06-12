import { useState } from "react";
import { useNavigate } from "react-router-dom";
import baseUrl from "../../../api/api";
import { toast } from "react-toastify";
import SideNav from "../../../components/SideNav/SideNav";

/* ── Shared styles ───────────────────────────────────────────────────────── */
const inputStyle = {
  width: "100%", height: "40px", border: "1px solid #e5e7eb", borderRadius: "8px",
  padding: "0 12px", fontSize: "13px", color: "#111827", background: "#fff",
  outline: "none", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const Field = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

/* ── Question card ───────────────────────────────────────────────────────── */
const QuestionCard = ({ q, qIndex, onChange, onOptionChange, onCorrectAnswer, onRemove, total }) => (
  <div style={{
    background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb",
    padding: "20px", display: "flex", flexDirection: "column", gap: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  }}>
    {/* Card header */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: 26, height: 26, borderRadius: "6px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#374151" }}>
          {qIndex + 1}
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Question {qIndex + 1}</span>
      </div>
      {total > 1 && (
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px", display: "flex", alignItems: "center" }}
          title="Remove question">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      )}
    </div>

    {/* Question text */}
    <input
      type="text"
      placeholder="Enter your question here…"
      value={q.questionText}
      onChange={e => onChange(qIndex, "questionText", e.target.value)}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = "#111827"}
      onBlur={e => e.target.style.borderColor = "#e5e7eb"}
    />

    {/* Options */}
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Options — select correct answer</span>
      {q.options.map((option, oIndex) => (
        <div key={oIndex} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Radio */}
          <div
            onClick={() => onCorrectAnswer(qIndex, oIndex)}
            style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
              border: `2px solid ${q.correctAnswer === option && option ? "#111827" : "#d1d5db"}`,
              background: q.correctAnswer === option && option ? "#111827" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}
          >
            {q.correctAnswer === option && option && (
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
            )}
          </div>
          <input
            type="text"
            placeholder={`Option ${oIndex + 1}`}
            value={option}
            onChange={e => onOptionChange(qIndex, oIndex, e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            onFocus={e => e.target.style.borderColor = "#111827"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>
      ))}
    </div>

    {/* Correct answer indicator */}
    {q.correctAnswer && (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#16a34a" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Correct: <strong>{q.correctAnswer}</strong>
      </div>
    )}
  </div>
);

/* ── Main component ──────────────────────────────────────────────────────── */
const CreateAssessmentData = () => {
  const navigate = useNavigate();
  const [moduleTitle, setModuleTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([
    { questionText: "", options: ["", "", "", ""], correctAnswer: "" },
  ]);
  const token = localStorage.getItem("token");

  const handleQuestionChange = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    // clear correctAnswer if the option it pointed to changed
    if (updated[qIndex].correctAnswer === questions[qIndex].options[oIndex]) {
      updated[qIndex].correctAnswer = "";
    }
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIndex, oIndex) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = updated[qIndex].options[oIndex];
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { questionText: "", options: ["", "", "", ""], correctAnswer: "" }]);
  };

  const removeQuestion = (qIndex) => {
    setQuestions(prev => prev.filter((_, i) => i !== qIndex));
  };

  const handleSave = async () => {
    if (!moduleTitle.trim()) { toast.warning("Assessment title is required."); return; }
    if (duration && Number(duration) <= 0) {
      toast.warning("Duration must be greater than zero.");
      return;
    }
    if (deadline && Number(deadline) <= 0) {
      toast.warning("Days to complete must be greater than zero.");
      return;
    }
    if (questions.some(q => !q.questionText.trim() || q.options.some(option => !option.trim()) || !q.correctAnswer || !q.options.includes(q.correctAnswer))) {
      toast.warning("Please complete all questions, fill every option, and select a correct answer for each.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: moduleTitle.trim(),
        duration: Number(duration),
        deadline: Number(deadline),
        questions: questions.map((q) => ({
          questionText: q.questionText.trim(),
          options: q.options.map((option) => option.trim()),
          correctAnswer: q.correctAnswer.trim(),
        })),
      };
      const response = await fetch(`${baseUrl.baseUrl}api/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || "Failed to create assessment"); return; }
      toast.success(data.message || "Assessment created successfully");
      navigate("/assessments");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-0 md:ml-[120px]" style={{ paddingTop: "24px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "24px" }}>

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6" style={{}}>
          <div>
            <button onClick={() => navigate("/assessments")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "13px", fontWeight: 500, padding: 0, marginBottom: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Assessments
            </button>
            <h1 style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.2, color: "#111827", margin: 0 }}>Create Assessment</h1>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0" }}>
              Build a new assessment with questions and answer options
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => navigate("/assessments")}
              style={{ height: "38px", padding: "0 18px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff", color: "#374151", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ height: "38px", padding: "0 20px", border: "none", borderRadius: "8px", background: saving ? "#9ca3af" : "#111827", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
              {saving ? (
                <>
                  <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "ca-spin 0.7s linear infinite" }} />
                  Saving…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Save Assessment
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start" style={{}}>

          {/* ── Left: Assessment details ── */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            {/* Card header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 30, height: 30, borderRadius: "8px", background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c026d3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: 0 }}>Assessment Details</p>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Basic information</p>
              </div>
            </div>

            {/* Fields */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <Field label="Assessment Title" required>
                <input type="text" placeholder="e.g. Customer Service Excellence"
                  value={moduleTitle} onChange={e => setModuleTitle(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </Field>

              <Field label="Duration (minutes)">
                <input type="number" placeholder="e.g. 30"
                  value={duration} onChange={e => setDuration(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </Field>

              <Field label="Days to Complete">
                <input type="number" placeholder="e.g. 7"
                  value={deadline} onChange={e => setDeadline(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </Field>

              {/* Summary */}
              <div style={{ marginTop: "4px", padding: "12px", background: "#f9fafb", borderRadius: "10px", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>{questions.length}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" }}>Questions</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>{duration || "—"}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" }}>Minutes</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>{deadline || "—"}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" }}>Days</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Questions ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {questions.map((q, qIndex) => (
              <QuestionCard
                key={qIndex}
                q={q}
                qIndex={qIndex}
                total={questions.length}
                onChange={handleQuestionChange}
                onOptionChange={handleOptionChange}
                onCorrectAnswer={handleCorrectAnswerChange}
                onRemove={() => removeQuestion(qIndex)}
              />
            ))}

            {/* Add Question button */}
            <button onClick={addQuestion}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "12px", border: "2px dashed #e5e7eb", borderRadius: "14px", background: "transparent", color: "#6b7280", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#111827"; e.currentTarget.style.color = "#111827"; e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "transparent"; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Question
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes ca-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CreateAssessmentData;
