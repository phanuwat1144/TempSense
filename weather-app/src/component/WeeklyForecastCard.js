import React from "react";

export default function WeeklyForecastCard({ weather, fmt }) {
  return (
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
  );
}
