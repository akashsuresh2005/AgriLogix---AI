import { haversineKm } from './geo';

/** Shelf-life days (index 0) — mirrored from backend ML constants. */
export const CROP_SHELF_DAYS = {
  Tomato: 7,
  Onion: 60,
  Potato: 90,
  Banana: 10,
  Mango: 14,
  Grapes: 14,
  Pomegranate: 30,
  Cabbage: 5,
  Capsicum: 14,
  Cauliflower: 5,
  Brinjal: 7,
  Okra: 3,
  Spinach: 3,
  Coconut: 60,
  Cucumber: 14,
};

const SPEED_MAP = {
  'National Highway': 60.0,
  'State Highway': 40.0,
  'Rural / Unpaved Road': 20.0,
};

const VIBRATION_MAP = {
  'National Highway': 1.0,
  'State Highway': 1.3,
  'Rural / Unpaved Road': 2.5,
};

export function normalizeFacilityName(name) {
  return String(name || '')
    .replace(/\s*\(FULL\)\s*$/i, '')
    .trim();
}

function resolveMandiPrice(facilityDistrict, facilityName, recommendedFacility, predictionMandiPrice) {
  if (
    predictionMandiPrice != null &&
    predictionMandiPrice > 0 &&
    normalizeFacilityName(facilityName) === normalizeFacilityName(recommendedFacility)
  ) {
    return { mandi_price_per_kg: predictionMandiPrice, price_source: 'Prediction API' };
  }
  return { mandi_price_per_kg: null, price_source: null };
}

/**
 * Top-3 facility options by haversine distance (Streamlit calculate_optimized_warehouse_matrix).
 */
export function calculateOptimizedWarehouseMatrix(
  fLat,
  fLng,
  crop,
  qtyTons,
  roadCond,
  warehouses,
  { recommendedFacility, predictionMandiPrice } = {}
) {
  if (!warehouses?.length) return [];

  const currentSpeed = SPEED_MAP[roadCond] ?? 40.0;
  const shelfLifeDays = CROP_SHELF_DAYS[crop] ?? 7;

  const enriched = warehouses
    .filter((w) =>
      w.latitude != null && w.longitude != null &&
      w.capacity_mt != null && w.occupancy_pct != null
    )
    .map((row) => {
      const baseDist = haversineKm(fLat, fLng, row.latitude, row.longitude);
      const occupancy = row.occupancy_pct;
      const capacityMt = row.capacity_mt;
      const availableCapacityTons = capacityMt * (1 - occupancy / 100.0);
      return { ...row, base_dist: baseDist, availableCapacityTons, occupancy };
    })
    .filter(
      (row) => row.occupancy >= 100.0 || row.availableCapacityTons >= qtyTons
    )
    .sort((a, b) => a.base_dist - b.base_dist)
    .slice(0, 3);

  return enriched.map((row) => {
    const { mandi_price_per_kg, price_source } = resolveMandiPrice(
      row.district,
      row.facility_name,
      recommendedFacility,
      predictionMandiPrice
    );

    const estTransitHours = row.base_dist / currentSpeed;
    const totalShelfHours = shelfLifeDays * 24.0;
    const survivalProb = Math.min(
      1,
      Math.max(0, totalShelfHours / (totalShelfHours + estTransitHours))
    );
    const totalTransitCost = row.base_dist * 12.0;
    const storageRentCost = row.price_per_ton_day == null ? null : row.price_per_ton_day * qtyTons * 3;
    const totalKg = qtyTons * 1000.0;
    const netEstimatedPayout = mandi_price_per_kg == null || storageRentCost == null
      ? null
      : totalKg * mandi_price_per_kg * survivalProb - totalTransitCost - storageRentCost;

    let facilityName = row.facility_name;
    if (row.occupancy >= 100.0) {
      facilityName += ' (FULL)';
    }

    return {
      facility_name: facilityName,
      facility_id: row.facility_id,
      district: row.district,
      latitude: row.latitude,
      longitude: row.longitude,
      base_dist: row.base_dist,
      capacity_mt: row.capacity_mt,
      available_capacity: row.availableCapacityTons,
      occupancy_pct: row.occupancy,
      mandi_price_per_kg,
      price_source,
      net_estimated_payout: netEstimatedPayout,
      price_per_ton_day: row.price_per_ton_day,
    };
  });
}

export function findWarehouseOption(options, facilityName) {
  const target = normalizeFacilityName(facilityName).toLowerCase();
  return (
    options.find((o) => normalizeFacilityName(o.facility_name).toLowerCase() === target) ||
    options[0] ||
    null
  );
}
