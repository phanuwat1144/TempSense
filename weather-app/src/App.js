import React, { useEffect, useMemo, useState } from "react";
import { Sun, CloudRain, Thermometer, Droplets } from "lucide-react";


// เว็บไซต์ทำนายสภาพอากาศ (ไม่ต้องใช้ API key) ด้วย Open-Meteo
// ฟีเจอร์หลัก:
// - ค้นหาเมือง (ภาษาไทยได้) และเลือกผลลัพธ์
// - ใช้ตำแหน่งปัจจุบัน (Geolocation)
// - แสดงสภาพอากาศปัจจุบัน + พยากรณ์ 7 วัน
// - กราฟแนวโน้มอุณหภูมิรายชั่วโมง (เรียบง่ายด้วย <svg>)
// - เคล็ดลับ/สรุปการทำนายอย่างย่อ (heuristic)

export default function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ค้นหาเมืองด้วย Open-Meteo Geocoding API
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
        if (e.name !== "AbortError") {
          console.error(e);
        }
      }
    };
    const t = setTimeout(run, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  // ดึงพยากรณ์เมื่อเลือกสถานที่
  useEffect(() => {
    const controller = new AbortController();
    const fetchForecast = async () => {
      if (!selectedPlace) return;
      setLoading(true);
      setError("");
      setWeather(null);
      try {
        const { latitude, longitude, timezone } = selectedPlace;
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "wind_speed_10m",
          ].join(","),
          hourly: [
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "relative_humidity_2m",
            "wind_speed_10m",
          ].join(","),
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
        setWeather({ ...data, timezone });
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

  // แปลงวัน/เวลาให้อ่านง่าย (ภาษาไทย)
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("th-TH", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    []
  );
  const fmtTime = useMemo(
    () => new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }),
    []
  );

  // วิเคราะห์ง่ายๆ เพื่อสร้าง "สรุปคำแนะนำ"
  const tip = useMemo(() => {
    if (!weather?.daily) return "พิมพ์ชื่อเมืองด้านบน หรือใช้ตำแหน่งปัจจุบัน";
    const max = weather.daily.temperature_2m_max?.[0];
    const min = weather.daily.temperature_2m_min?.[0];
    const rain = weather.daily.precipitation_probability_max?.[0];
    if (rain >= 70) return "มีโอกาสฝนตกสูง พกร่มหรือเสื้อกันฝนด้วยนะ";
    if (max >= 35) return "อากาศร้อนจัด ดื่มน้ำเยอะๆ และหลบแดด";
    if (min <= 22) return "อากาศค่อนข้างเย็น เตรียมเสื้อคลุมบางๆ";
    return "อากาศทั่วไป เหมาะกับการทำกิจกรรมกลางแจ้ง";
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
          // Reverse geocoding เพื่อเอาชื่อเมืองสวยๆ
          const rev = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=th&format=json`
          ).then((r) => r.json());
          const place = rev?.results?.[0] || {
            name: "ตำแหน่งของฉัน",
            country: "",
            admin1: "",
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
          setSelectedPlace(place);
          setQuery(`${place.name}${place.admin1 ? ", " + place.admin1 : ""}`);
        } catch (e) {
          console.error(e);
          setSelectedPlace({
            name: "ตำแหน่งของฉัน",
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 text-slate-800">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <header className="flex flex-col gap-2 items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">เว็บไซต์ทำนายสภาพอากาศ</h1>
          <p className="text-slate-600 text-center">ค้นหาเมือง ดูอุณหภูมิ ลม และโอกาสฝน พร้อมสรุปคำแนะนำใช้งานจริง</p>
        </header>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาเมือง เช่น กรุงเทพฯ, Chiang Mai, Tokyo"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {!!suggestions.length && (
                <div className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-md max-h-64 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.id}-${s.latitude}-${s.longitude}`}
                      className="block w-full text-left px-4 py-2 hover:bg-indigo-50"
                      onClick={() => {
                        setSelectedPlace(s);
                        setSuggestions([]);
                      }}
                    >
                      <div className="font-medium">
                        {s.name}
                        {s.admin1 ? `, ${s.admin1}` : ""}
                      </div>
                      <div className="text-sm text-slate-500">
                        {s.country} • lat {s.latitude.toFixed(2)}, lon {s.longitude.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={useMyLocation}
                className="rounded-xl px-4 py-3 border border-slate-300 bg-white hover:bg-slate-50 shadow-sm"
              >
                ใช้ตำแหน่งของฉัน
              </button>
              <button
                onClick={() => selectedPlace && setSelectedPlace({ ...selectedPlace })}
                disabled={!selectedPlace}
                className="rounded-xl px-4 py-3 bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-40"
              >
                โหลดพยากรณ์อีกครั้ง
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>

        {/* Summary / Current */}
        <section className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-5 border border-slate-200 min-h-[140px]">
            {!weather && !loading && (
              <div className="text-slate-500">เริ่มจากการค้นหาเมืองด้านบน หรือกด "ใช้ตำแหน่งของฉัน"</div>
            )}
            {loading && <div className="animate-pulse text-slate-500">กำลังโหลดข้อมูลพยากรณ์…</div>}
            {weather && (
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {selectedPlace?.name}
                    {selectedPlace?.admin1 ? `, ${selectedPlace.admin1}` : ""}
                  </div>
                  <div className="text-slate-500 text-sm">
                    lat {Number(selectedPlace.latitude).toFixed(2)}, lon {Number(selectedPlace.longitude).toFixed(2)}
                  </div>
                  <div className="mt-3 text-5xl font-bold">
                    {Math.round(weather.current?.temperature_2m)}°C
                  </div>
                  <div className="text-slate-600 mt-1">
                    รู้สึก {Math.round(weather.current?.apparent_temperature)}° • ลม {Math.round(weather.current?.wind_speed_10m)} km/h • ความชื้น {weather.current?.relative_humidity_2m}%
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 w-full sm:w-auto">
                  <div className="font-semibold mb-1">สรุปคำแนะนำ</div>
                  <div className="text-indigo-900">{tip}</div>
                </div>
              </div>
            )}
          </div>

          {/* Today highlights */}
<div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-5 border border-slate-200">
  <div className="font-semibold mb-3 flex items-center gap-2 text-indigo-700">
    <Sun className="w-5 h-5" /> วันนี้
  </div>
  {weather ? (
    <ul className="grid grid-cols-2 gap-3 text-sm">
      <li className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 text-orange-700 font-medium">
          <Thermometer className="w-4 h-4" /> สูงสุด
        </div>
        <div className="text-2xl font-bold">
          {Math.round(weather.daily.temperature_2m_max?.[0])}°C
        </div>
      </li>
      <li className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 font-medium">
          <Thermometer className="w-4 h-4" /> ต่ำสุด
        </div>
        <div className="text-2xl font-bold">
          {Math.round(weather.daily.temperature_2m_min?.[0])}°C
        </div>
      </li>
      <li className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-700 font-medium">
          <CloudRain className="w-4 h-4" /> โอกาสฝน
        </div>
        <div className="text-2xl font-bold">
          {weather.daily.precipitation_probability_max?.[0]}%
        </div>
      </li>
      <li className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 text-yellow-700 font-medium">
          <Sun className="w-4 h-4" /> พระอาทิตย์ขึ้น/ตก
        </div>
        <div className="font-medium">
          {fmtTime.format(new Date(weather.daily.sunrise?.[0]))} / {fmtTime.format(new Date(weather.daily.sunset?.[0]))}
        </div>
      </li>
    </ul>
  ) : (
    <div className="text-slate-500">—</div>
  )}
</div>
        </section>

        {/* Hourly temperature chart (next 24h) */}
        {weather && (
          <section className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 mt-4">
            <div className="font-semibold mb-3">อุณหภูมิรายชั่วโมง (24 ชั่วโมงถัดไป)</div>
            <MiniLineChart
              labels={weather.hourly.time.slice(0, 24)}
              values={weather.hourly.temperature_2m.slice(0, 24)}
            />
          </section>
        )}

        {/* 7-day forecast */}
        {weather && (
          <section className="mt-4">
            <div className="font-semibold mb-2">พยากรณ์ 7 วัน</div>
            <div className="grid md:grid-cols-7 gap-3">
              {weather.daily.time.map((d, i) => (
                <div key={d} className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200">
                  <div className="text-sm text-slate-500">{fmt.format(new Date(d))}</div>
                  <div className="mt-2 text-3xl font-bold">{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                  <div className="text-slate-600">ต่ำสุด {Math.round(weather.daily.temperature_2m_min[i])}°</div>
                  <div className="mt-1 text-sm">ฝน {weather.daily.precipitation_probability_max?.[i] ?? 0}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 text-center text-sm text-slate-500">
          ข้อมูลโดย Open‑Meteo • สร้างด้วย React + Tailwind • ใช้งานได้ฟรี
        </footer>
      </div>
    </div>
  );
}

function MiniLineChart({ labels, values }) {
  const width = 900;
  const height = 200;
  const padding = 28;

  const points = useMemo(() => {
    if (!labels?.length || !values?.length) return [];
    const n = Math.min(labels.length, values.length);
    const xs = values.slice(0, n);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const scaleX = (i) => padding + (i * (width - padding * 2)) / (n - 1);
    const scaleY = (v) => height - padding - ((v - min) / (max - min || 1)) * (height - padding * 2);
    return xs.map((v, i) => [scaleX(i), scaleY(v)]);
  }, [labels, values]);

  const pathD = useMemo(() => {
    if (!points.length) return "";
    return points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  }, [points]);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-[900px] h-[200px]">
        {/* กริดแนวนอน */}
        {[0, 1, 2, 3].map((g) => (
          <line
            key={g}
            x1={padding}
            x2={width - padding}
            y1={padding + g * ((height - padding * 2) / 3)}
            y2={padding + g * ((height - padding * 2) / 3)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
        ))}
        {/* เส้นกราฟ */}
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" />
        {/* จุด */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#4f46e5" />
        ))}
      </svg>
    </div>
  );
}
