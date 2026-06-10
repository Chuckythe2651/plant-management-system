import axios from 'axios';

export interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  city: string;
  uv_index?: number;
}

export async function getCurrentWeather(
  apiKey: string,
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  if (!apiKey) return null;

  try {
    const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat, lon, appid: apiKey, units: 'imperial' },
      timeout: 5000,
    });

    const d = res.data;
    return {
      temperature: Math.round(d.main.temp),
      feels_like: Math.round(d.main.feels_like),
      humidity: d.main.humidity,
      description: d.weather[0]?.description ?? '',
      icon: d.weather[0]?.icon ?? '',
      wind_speed: Math.round(d.wind?.speed ?? 0),
      city: d.name,
    };
  } catch {
    return null;
  }
}
