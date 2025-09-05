import React, { useState, useEffect, useMemo } from "react";

/* ---------- MessageBox ---------- */
function MessageBox({ type = "info", children }) {
  const styles = {
    info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300",
    success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-600 text-green-700 dark:text-green-300",
    warning: "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300",
    error: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-600 text-red-700 dark:text-red-300",
  };

  return (
    <div className={`border rounded-xl p-4 shadow-sm mt-3 ${styles[type]}`}>
      {children}
    </div>
  );
}

/* ---------- MiniLineChart ---------- */
function MiniLineChart({ data }) {
  const [width, setWidth] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(null);
  const height = 100; // ปรับสูงกราฟให้เล็กลง
  const padding = 20;
  const containerRef = React.useRef(null);

  useEffect(() => {
    const updateWidth = () => setWidth(containerRef.current?.offsetWidth ?? 300);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const points = useMemo(() => {
    if (!data?.length || width === 0) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data.map((val, i) => [
      padding + (i * (width - padding * 2)) / (data.length - 1),
      height - padding - ((val - min) / range) * (height - padding * 2),
    ]);
  }, [data, width]);

  const pathD = useMemo(() => {
    if (!points.length) return "";
    return points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  }, [points]);

  return (
    <div ref={containerRef} className="overflow-x-auto w-full relative h-[120px] mt-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L ${points[points.length - 1]?.[0] ?? 0} ${height - padding} L ${points[0]?.[0] ?? 0} ${height - padding} Z`}
          fill="url(#grad)"
        />
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill={hoverIdx === i ? "#f97316" : "#2563eb"}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="absolute bg-indigo-700 text-white text-xs px-2 py-1 rounded shadow pointer-events-none"
          style={{
            left: points[hoverIdx][0] - 20,
            top: points[hoverIdx][1] - 30,
          }}
        >
          {data[hoverIdx]}°C
        </div>
      )}
    </div>
  );
}

/* ---------- SearchBox ---------- */
function SearchBox({ onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return setSuggestions([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=th&format=json`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 ค้นหาสถานที่ (ภาษาอังกฤษ)"
        className="w-full p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
      />
      {loading && <p className="absolute right-2 top-3 text-gray-400">⏳</p>}

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-xl mt-1 shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s.id}
              onClick={() => {
                setQuery(`${s.name}, ${s.country}`);
                setSuggestions([]);
                onSelect(s);
              }}
              className="p-3 hover:bg-indigo-100 cursor-pointer"
            >
              {s.name}, {s.country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- WeatherCard ---------- */
function WeatherCard({ forecast, location }) {
  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-2xl font-bold text-indigo-700 text-center">
        🌍 พยากรณ์อากาศ {location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {forecast.hourly.time.map((t, i) => (
          <div
            key={i}
            className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-lg border rounded-xl p-4 shadow-md"
          >
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
              {new Intl.DateTimeFormat("th-TH", {
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(t))}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              🌡️ อุณหภูมิ: {forecast.hourly.temperature_2m[i]}°C
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              💨 ลม: {forecast.hourly.windspeed_10m[i]} km/h
            </p>
            <MiniLineChart data={forecast.hourly.temperature_2m} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [forecast, setForecast] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchForecast = async (lat, lon, place) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,windspeed_10m&forecast_days=1&timezone=auto`
      );
      if (!res.ok) throw new Error("โหลดข้อมูลล้มเหลว");

      const data = await res.json();
      setForecast(data);
      setLocation(place);
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        fetchForecast(
          pos.coords.latitude,
          pos.coords.longitude,
          "ตำแหน่งของฉัน"
        ),
      () => setError("ไม่สามารถเข้าถึงตำแหน่งของคุณได้")
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-800 dark:text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-300">
          🌤️ ระบบพยากรณ์อากาศ TempSense
        </h1>

        <div className="mt-6 space-y-4">
          <SearchBox onSelect={(s) => fetchForecast(s.latitude, s.longitude, s.name)} />
        </div>

        {error && <MessageBox type="error">⚠️ {error}</MessageBox>}
        {loading && <MessageBox type="info">⏳ กำลังโหลด...</MessageBox>}
        {forecast && <WeatherCard forecast={forecast} location={location} />}
      </div>
    </div>
  );
}
