import axios from 'axios';

export interface HASensorReading {
  value: number;
  unit: string;
  recordedAt: string;
}

export async function fetchHASensorReading(
  haBaseUrl: string,
  haToken: string,
  entityId: string
): Promise<HASensorReading> {
  const url = `${haBaseUrl.replace(/\/$/, '')}/api/states/${entityId}`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${haToken}` },
    timeout: 10_000,
  });

  const raw = parseFloat(data.state);
  if (isNaN(raw)) {
    throw new Error(`Entity ${entityId} returned non-numeric state: "${data.state}"`);
  }

  return {
    value: raw,
    unit: data.attributes?.unit_of_measurement ?? '',
    recordedAt: data.last_updated ?? new Date().toISOString(),
  };
}

export async function isHAAvailable(haBaseUrl: string, haToken: string): Promise<boolean> {
  if (!haBaseUrl || !haToken) return false;
  try {
    await axios.get(`${haBaseUrl.replace(/\/$/, '')}/api/`, {
      headers: { Authorization: `Bearer ${haToken}` },
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}
