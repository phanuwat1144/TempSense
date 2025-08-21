import React from "react";
import MessageBox from "./MessageBox";

export default function CurrentWeatherCard({ selectedPlace, weather, tip }) {
  return (
    <div className="md:col-span-2 bg-white rounded-3xl shadow-xl p-6 border border-gray-200 flex flex-col justify-between">
      <div>
        <div className="text-xl font-semibold">
          {selectedPlace?.name}{selectedPlace?.admin1 ? `, ${selectedPlace.admin1}` : ""}
        </div>
        <div className="text-gray-500 text-sm mb-4">
          lat {Number(selectedPlace.latitude).toFixed(2)}, lon {Number(selectedPlace.longitude).toFixed(2)}
        </div>
        <div className="text-6xl font-bold text-indigo-700">
          {Math.round(weather.current_weather?.temperature ?? 0)}°C
        </div>
        <div className="text-gray-600 mt-2 text-lg">
          ความรู้สึก {Math.round(weather.current_weather?.temperature ?? 0)}° • ลม {Math.round(weather.current_weather?.windspeed ?? 0)} km/h
        </div>
      </div>
      <MessageBox type="info">{tip}</MessageBox>
    </div>
  );
}
