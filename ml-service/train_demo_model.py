"""Create a reproducible demo dataset and train local XGBoost forecast models.

The generated records are simulated market scenarios for UI/demo use. They are
not a substitute for paid Baltic freight data or production forecasting data.
"""

from csv import DictWriter
from math import pi, sin
from pathlib import Path

import numpy as np
from xgboost import XGBRegressor

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"
FEATURES = ["day_of_year", "day_of_year_sin", "freight_rate_usd_mt", "bunker_price_usd_mt", "days_since_start"]
MODEL_FILES = {
    14: "xgboost_freight_rate_14d_tuned_5_features.json",
    30: "xgboost_freight_rate_30d_tuned_5_features.json",
    60: "xgboost_freight_rate_60d_tuned_5_features.json",
}

def market_rate(day: int, bunker: float, rng: np.random.Generator) -> float:
    annual = 2.2 * sin((2 * pi * day) / 365)
    quarter = 0.8 * sin((2 * pi * day) / 91)
    trend = 0.0015 * day
    disruption = 2.4 if (day % 470) in range(18, 31) else 0
    noise = rng.normal(0, 0.45)
    return max(8.0, 17.2 + annual + quarter + trend + 0.012 * (bunker - 90) + disruption + noise)

def main() -> None:
    rng = np.random.default_rng(42)
    DATA_DIR.mkdir(exist_ok=True)
    MODEL_DIR.mkdir(exist_ok=True)
    rows = []

    for day in range(1, 1827):
        day_of_year = ((day - 1) % 365) + 1
        bunker = 92 + 12 * sin((2 * pi * day) / 280) + rng.normal(0, 2.2)
        current = market_rate(day, bunker, rng)
        rows.append({
            "day_of_year": day_of_year,
            "day_of_year_sin": sin((2 * pi * day_of_year) / 365),
            "freight_rate_usd_mt": round(current, 4),
            "bunker_price_usd_mt": round(bunker, 4),
            "days_since_start": day,
        })

    with (DATA_DIR / "demo_freight_market.csv").open("w", newline="", encoding="utf-8") as file:
        writer = DictWriter(file, fieldnames=FEATURES)
        writer.writeheader()
        writer.writerows(rows)

    for horizon, filename in MODEL_FILES.items():
        usable = rows[:-horizon]
        X = np.array([[row[field] for field in FEATURES] for row in usable], dtype=float)
        y = np.array([market_rate(index + horizon + 1, rows[index + horizon]["bunker_price_usd_mt"], rng) for index in range(len(usable))])
        model = XGBRegressor(
            n_estimators=260,
            max_depth=4,
            learning_rate=0.04,
            subsample=0.88,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
        )
        model.fit(X, y)
        model.save_model(MODEL_DIR / filename)
        print("Trained", horizon, "day model")

if __name__ == "__main__":
    main()
