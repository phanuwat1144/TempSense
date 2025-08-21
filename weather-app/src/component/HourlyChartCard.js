import React from "react";
import MiniLineChart from "./MiniLineChart";

export default function HourlyChartCard({ weather }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">อุณหภูมิรายชั่วโมง</h2>
      <MiniLineChart labels={weather.hourly.time} values={weather.hourly.temperature_2m} />
    </div>
  );
}
