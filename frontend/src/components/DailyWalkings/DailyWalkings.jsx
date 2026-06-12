import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { fetchDailyWalkinsChart } from "../../features/dashboard/dashboardFetch";

const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const toDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        fontSize: "13px",
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {p.dataKey === "walkings" ? "Walkings" : "Loss"} : <b>{p.value}</b>
        </p>
      ))}
    </div>
  );
};

const buildDays = (range, startDate, endDate) => {
  if (range === "custom" && startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  const totalDays = Math.max(1, Number(range) || 7);
  const today = new Date();

  if (totalDays === 7) {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const days = [];
    const cursor = new Date(startOfWeek);
    while (cursor <= today) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  return Array.from({ length: totalDays }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (totalDays - 1 - index));
    return d;
  });
};

const DailyWalkings = ({ range = "7", customRange, onRangeChange, onCustomRangeChange }) => {
  const [activeIdx, setActiveIdx] = useState(null);
  const [walkinResponse, setWalkinResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDailyWalkinsChart({
          range,
          startDate: customRange?.startDate,
          endDate: customRange?.endDate,
        });
        if (!mounted) return;
        setWalkinResponse(data);
      } catch {
        if (!mounted) return;
        setWalkinResponse(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();

    const refresh = () => load();
    window.addEventListener("dashboard:refresh", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("dashboard:refresh", refresh);
    };
  }, [range, customRange?.startDate, customRange?.endDate]);

  const days = useMemo(() => buildDays(range, customRange?.startDate, customRange?.endDate), [
    range,
    customRange?.startDate,
    customRange?.endDate,
  ]);

  const rangeLabel = days.length ? `${fmt(days[0])} - ${fmt(days[days.length - 1])}, ${days[0].getFullYear()}` : "";

  const data = useMemo(() => {
    const series = new Map((walkinResponse?.data || []).map((row) => [row._id, row]));

    return days.map((d) => {
      const key = toDateInput(d);
      const row = series.get(key) || { walkings: 0, loss: 0 };
      return {
        name: fmt(d),
        walkings: Number(row.walkings || 0),
        loss: Number(row.loss || 0),
      };
    });
  }, [walkinResponse, days]);

  return (
    <div
      className="w-full lg:flex-1 min-w-0"
      style={{
        height: "380px",
        padding: "20px",
        borderRadius: "18px",
        borderWidth: "0.6px",
        borderStyle: "solid",
        borderColor: "#e5e7eb",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>Daily Walkings</h3>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>{rangeLabel}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <select
            value={range}
            onChange={(e) => onRangeChange?.(e.target.value)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#374151",
              background: "#fff",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="7">This week to date</option>
            <option value="14">Last 14 days</option>
            <option value="45">Last 45 days</option>
            <option value="custom">Custom range</option>
          </select>

          {range === "custom" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <input
                type="date"
                value={customRange?.startDate || ""}
                onChange={(e) => onCustomRangeChange?.({ ...(customRange || {}), startDate: e.target.value })}
                style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 10px", fontSize: "13px" }}
              />
              <span style={{ color: "#9ca3af", fontSize: "13px" }}>to</span>
              <input
                type="date"
                value={customRange?.endDate || ""}
                onChange={(e) => onCustomRangeChange?.({ ...(customRange || {}), endDate: e.target.value })}
                style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 10px", fontSize: "13px" }}
              />
              <button
                type="button"
                onClick={() => {
                  onCustomRangeChange?.({ startDate: "", endDate: "" });
                  onRangeChange?.("7");
                }}
                style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", background: "#fff" }}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#f9fafb",
              borderRadius: "10px",
              animation: "pulse 1.5s infinite",
            }}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={(e) => {
                if (e.activeTooltipIndex !== undefined) setActiveIdx(e.activeTooltipIndex);
              }}
              onMouseLeave={() => setActiveIdx(null)}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              {activeIdx !== null && data[activeIdx] && (
                <ReferenceLine x={data[activeIdx].name} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="0" />
              )}
              <Line
                type="monotone"
                dataKey="walkings"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey="loss"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#ef4444" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DailyWalkings;
