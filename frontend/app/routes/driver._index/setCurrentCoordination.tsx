import { useState } from "react";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { Coordinate } from "~/types";

function LocationInput() {
  const data = useClientChairRequestContext();
  const [coordinates, setCoordinates] = useState({
    latitude: "",
    longitude: "",
  });

  const handleNumberChange =
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setCoordinates((prevValues) => ({
        ...prevValues,
        [key]: e.target.value,
      }));
    };

  const handleConfirm = () => {
    const setData: Coordinate = {
      latitude: Number(coordinates.latitude),
      longitude: Number(coordinates.longitude),
    };
    if (isNaN(setData.latitude)) {
      setData.latitude = 0;
    }
    if (isNaN(setData.longitude)) {
      setData.longitude = 0;
    }
    data.chair?.currentCoordinate.setter(setData);
  };

  return (
    <div className="p-4 bg-neutral-100 shadow-md rounded-md">
      <h1 className="text-lg font-medium mb-2 text-center text-neutral-700">
        Enter Location
      </h1>

      <div className="mb-3">
        <label htmlFor="latitude" className="block text-neutral-600 mb-1">
          Latitude:
        </label>
        <input
          type="number"
          id="latitude"
          value={coordinates.latitude}
          onChange={handleNumberChange("latitude")}
          placeholder="Enter latitude"
          className="w-full px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
        />
      </div>

      <div className="mb-3">
        <label htmlFor="longtiude" className="block text-neutral-600 mb-1">
          Longitude:
        </label>
        <input
          type="number"
          id="longtiude"
          value={coordinates.longitude}
          onChange={handleNumberChange("longitude")}
          placeholder="Enter longitude"
          className="w-full px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
        />
      </div>

      <button
        onClick={handleConfirm}
        className="w-full bg-neutral-500 text-white py-1 rounded hover:bg-neutral-600 transition duration-200"
      >
        決定
      </button>
    </div>
  );
}

export default LocationInput;
