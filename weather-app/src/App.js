import React, { useEffect, useMemo, useState } from "react";

// 🔹 Component กรอบข้อความ ใช้ซ้ำได้
function MessageBox({ type = "info", children }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    success: "bg-green-50 border-green-200 text-green-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    error: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`border rounded-xl p-4 shadow-sm mt-3 ${styles[type]}`}>
      {children}
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 ค้นหาเมือง
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=6&language=th&format=json`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("ไม่สามารถค้นหาสถานที่ได้");
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      }
    };
    const t = setTimeout(run, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  // 🔹 ดึงพยากรณ์อากาศ
  useEffect(() => {
    const controller = new AbortController();
    const fetchForecast = async () => {
      if (!selectedPlace) return;
      setLoading(true);
      setError("");
      setWeather(null);
      try {
        const { latitude, longitude } = selectedPlace;
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current_weather: "true",
          hourly: ["temperature_2m", "precipitation_probability"].join(","),
          daily: [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "sunrise",
            "sunset",
          ].join(","),
          timezone: "auto",
        });
        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("ดึงข้อมูลพยากรณ์ไม่สำเร็จ");
        const data = await res.json();
        setWeather({ ...data });
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error(e);
          setError(e.message || "เกิดข้อผิดพลาด");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
    return () => controller.abort();
  }, [selectedPlace]);

  const fmt = useMemo(
    () => new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "2-digit", month: "short" }),
    []
  );
  const fmtTime = useMemo(() => new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }), []);

  const tip = useMemo(() => {
    if (!weather?.daily) return "พิมพ์ชื่อเมืองด้านบน หรือใช้ตำแหน่งปัจจุบัน";
    const max = weather.daily.temperature_2m_max?.[0] ?? 0;
    const min = weather.daily.temperature_2m_min?.[0] ?? 0;
    const rain = weather.daily.precipitation_probability_max?.[0] ?? 0;
    if (rain >= 70) return "☔ มีโอกาสฝนสูง พกร่มด้วยนะ";
    if (max >= 35) return "🔥 ร้อนจัด ดื่มน้ำและหลบแดด";
    if (min <= 22) return "❄️ อากาศเย็น เตรียมเสื้อคลุมบางๆ";
    return "🌤 อากาศทั่วไป เหมาะกับกิจกรรมกลางแจ้ง";
  }, [weather]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("เบราว์เซอร์ไม่รองรับการขอพิกัด");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const rev = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=th&format=json`
          ).then(r => r.json());
          const place = rev?.results?.[0] || { name: "ตำแหน่งของฉัน", latitude, longitude };
          setSelectedPlace(place);
          setQuery(`${place.name}${place.admin1 ? ", " + place.admin1 : ""}`);
        } catch {
          setSelectedPlace({ name: "ตำแหน่งของฉัน", latitude, longitude });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError("ไม่สามารถใช้ตำแหน่งได้: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50 text-gray-800">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-700 mb-2">เว็บไซต์ทำนายสภาพอากาศ</h1>
          <p className="text-gray-600">ค้นหาเมือง ดูอุณหภูมิ ลม ฝน พร้อมสรุปคำแนะนำ</p>
        </header>

        {/* Search */}
        <div className="relative bg-white rounded-3xl shadow-xl p-5 border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาเมือง เช่น กรุงเทพฯ, Chiang Mai"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-64 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.id}-${s.latitude}-${s.longitude}`}
                      className="block w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
                      onClick={() => {
                        setSelectedPlace(s);
                        setSuggestions([]);
                      }}
                    >
                      <div className="font-medium">{s.name}{s.admin1 ? `, ${s.admin1}` : ""}</div>
                      <div className="text-sm text-gray-500">{s.country} • lat {s.latitude.toFixed(2)}, lon {s.longitude.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={useMyLocation}
                className="rounded-xl px-4 py-3 border border-gray-300 bg-white hover:bg-indigo-50 shadow-sm transition"
              >
                ใช้ตำแหน่งของฉัน
              </button>
              <button
                onClick={() => selectedPlace && setSelectedPlace({ ...selectedPlace })}
                disabled={!selectedPlace}
                className="rounded-xl px-4 py-3 bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                โหลดพยากรณ์อีกครั้ง
              </button>
            </div>
          </div>

          {/* Error Box */}
          {error && <MessageBox type="error">⚠️ {error}</MessageBox>}
        </div>

        {/* Current Weather + Tip */}
        {loading ? (
          <div className="text-center py-10 animate-pulse text-gray-500">กำลังโหลดข้อมูลพยากรณ์...</div>
        ) : weather ? (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Current */}
              <div className="md:col-span-2 bg-white rounded-3xl shadow-xl p-6 border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="text-xl font-semibold">{selectedPlace?.name}{selectedPlace?.admin1 ? `, ${selectedPlace.admin1}` : ""}</div>
                  <div className="text-gray-500 text-sm mb-4">
                    lat {Number(selectedPlace.latitude).toFixed(2)}, lon {Number(selectedPlace.longitude).toFixed(2)}
                  </div>
                  <div className="text-6xl font-bold text-indigo-700">{Math.round(weather.current_weather?.temperature ?? 0)}°C</div>
                  <div className="text-gray-600 mt-2 text-lg">
                    ความรู้สึก {Math.round(weather.current_weather?.temperature ?? 0)}° • ลม {Math.round(weather.current_weather?.windspeed ?? 0)} km/h
                  </div>
                </div>

                {/* Tip Box */}
                <MessageBox type="info">{tip}</MessageBox>
              </div>

              {/* Today highlights */}
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200 flex flex-col justify-between">
                <h2 className="font-semibold text-gray-700 mb-4">วันนี้</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-500 text-sm">สูงสุด</div>
                    <div className="font-bold text-indigo-700">{Math.round(weather.daily.temperature_2m_max?.[0] ?? 0)}°C</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">ต่ำสุด</div>
                    <div className="font-bold text-indigo-700">{Math.round(weather.daily.temperature_2m_min?.[0] ?? 0)}°C</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">โอกาสฝน</div>
                    <div className="font-bold text-indigo-700">{weather.daily.precipitation_probability_max?.[0] ?? 0}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">พระอาทิตย์ขึ้น/ตก</div>
                    <div className="font-bold text-indigo-700">
                      {fmtTime.format(new Date(weather.daily.sunrise?.[0]))} / {fmtTime.format(new Date(weather.daily.sunset?.[0]))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Temperature Chart */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">อุณหภูมิรายชั่วโมง</h2>
              <MiniLineChart labels={weather.hourly.time} values={weather.hourly.temperature_2m} />
            </div>

            {/* 7-day forecast */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">พยากรณ์ 7 วัน</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))` }}>
                {weather.daily.time.map((d, i) => (
                  <div key={d} className="bg-white rounded-2xl shadow-md p-4 border border-gray-200 flex flex-col items-center">
                    <div className="text-sm text-gray-500">{fmt.format(new Date(d))}</div>
                    <div className="mt-2 text-2xl font-bold text-indigo-700">{Math.round(weather.daily.temperature_2m_max?.[i] ?? 0)}°</div>
                    <div className="text-gray-600 text-sm">ต่ำ {Math.round(weather.daily.temperature_2m_min?.[i] ?? 0)}°</div>
                    <div className="mt-1 text-xs text-indigo-600">ฝน {weather.daily.precipitation_probability_max?.[i] ?? 0}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// 🔹 กราฟเส้นอุณหภูมิ responsive
function MiniLineChart({ labels, values }) {
  const [width, setWidth] = useState(0);
  const height = 200;
  const padding = 30;
  const containerRef = React.useRef(null);

  useEffect(() => {
    const updateWidth = () => setWidth(containerRef.current?.offsetWidth ?? 300);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const points = useMemo(() => {
    if (!labels?.length || !values?.length || width === 0) return [];
    const n = Math.min(labels.length, values.length);
    const xs = values.slice(0, n);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const scaleX = (i) => padding + (i * (width - padding * 2)) / (n - 1);
    const scaleY = (v) => height - padding - ((v - min) / (max - min || 1)) * (height - padding * 2);
    return xs.map((v, i) => [scaleX(i), scaleY(v)]);
  }, [labels, values, width]);

  const pathD = useMemo(() => {
    if (!points.length) return "";
    return points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  }, [points]);

  return (
    <div ref={containerRef} className="overflow-x-auto w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[200px]">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${points[points.length - 1]?.[0] ?? 0} ${height - padding} L ${points[0]?.[0] ?? 0} ${height - padding} Z`} fill="url(#grad)" />
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#4f46e5" />
        ))}
      </svg>
    </div>
  );
}
