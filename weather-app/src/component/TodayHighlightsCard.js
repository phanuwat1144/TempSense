import React from "react";

export default function TodayHighlightsCard({ weather, fmtTime }) {
  return (
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
  );
}
