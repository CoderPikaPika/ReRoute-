from pathlib import Path
import json
from csv import DictWriter
from datetime import date as Date
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from xgboost import XGBRegressor

BASE = Path(__file__).resolve().parent / "models"
DATA_DIR = Path(__file__).resolve().parent / "data"
MODELS = {
    14: XGBRegressor(),
    30: XGBRegressor(),
    60: XGBRegressor(),
}
FILES = {
    14: "xgboost_freight_rate_14d_tuned_5_features.json",
    30: "xgboost_freight_rate_30d_tuned_5_features.json",
    60: "xgboost_freight_rate_60d_tuned_5_features.json",
}
for horizon, model in MODELS.items():
    model.load_model(BASE / FILES[horizon])

FEATURES = ["day_of_year", "day_of_year_sin", "freight_rate_usd_mt", "bunker_price_usd_mt", "days_since_start"]

app = FastAPI(title="Freight Forecasting API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ForecastInput(BaseModel):
    day_of_year: float = Field(..., ge=1, le=366)
    day_of_year_sin: float
    freight_rate_usd_mt: float = Field(..., gt=0)
    bunker_price_usd_mt: float = Field(..., gt=0)
    days_since_start: float = Field(..., ge=0)

class MarketDataRecord(BaseModel):
    date: Date
    freight_rate_usd_mt: float = Field(..., gt=0)
    bunker_price_usd_mt: float = Field(..., gt=0)

class MarketDataImport(BaseModel):
    records: list[MarketDataRecord] = Field(..., min_length=61)

def vectorize(x: ForecastInput):
    return np.array([[getattr(x, f) for f in FEATURES]], dtype=float)

def result(horizon, current, prediction):
    change = prediction - current
    return {
        "forecast_days": horizon,
        "predicted_freight_rate_usd_mt": round(float(prediction), 4),
        "current_freight_rate_usd_mt": round(float(current), 4),
        "change_usd_mt": round(float(change), 4),
        "change_percent": round(float(change / current * 100), 2),
        "direction": "Increase" if change > 0.05 else "Decrease" if change < -0.05 else "Stable"
    }

def model_source():
    return "imported historical CSV" if (DATA_DIR / "imported_market_data.csv").exists() else "reproducible synthetic demo market dataset"

def train_imported_records(records):
    sorted_records = sorted(records, key=lambda item: item.date)
    DATA_DIR.mkdir(exist_ok=True)
    with (DATA_DIR / "imported_market_data.csv").open("w", newline="", encoding="utf-8") as file:
        writer = DictWriter(file, fieldnames=["date", "freight_rate_usd_mt", "bunker_price_usd_mt"])
        writer.writeheader()
        for item in sorted_records:
            writer.writerow({"date": item.date.isoformat(), "freight_rate_usd_mt": item.freight_rate_usd_mt, "bunker_price_usd_mt": item.bunker_price_usd_mt})

    for horizon, filename in FILES.items():
        samples = sorted_records[:-horizon]
        X = []
        y = []
        for index, item in enumerate(samples):
            day_of_year = item.date.timetuple().tm_yday
            X.append([
                day_of_year,
                np.sin((2 * np.pi * day_of_year) / 365),
                item.freight_rate_usd_mt,
                item.bunker_price_usd_mt,
                index,
            ])
            y.append(sorted_records[index + horizon].freight_rate_usd_mt)
        model = XGBRegressor(
            n_estimators=260,
            max_depth=4,
            learning_rate=0.04,
            subsample=0.88,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
        )
        model.fit(np.array(X, dtype=float), np.array(y, dtype=float))
        model.save_model(BASE / filename)
        MODELS[horizon] = model

@app.get("/")
def root():
    return {"service": "Freight Forecasting API", "horizons": [14, 30, 60]}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": [14, 30, 60],
        "features": FEATURES,
        "data_source": model_source(),
    }

@app.post("/predict")
def predict(x: ForecastInput):
    X = vectorize(x)
    current = x.freight_rate_usd_mt
    forecasts = [result(h, current, MODELS[h].predict(X)[0]) for h in (14, 30, 60)]
    return {
        "forecasts": forecasts,
        "data_source": model_source(),
        "disclaimer": "Prototype model output. Validate imported market data before production use.",
    }

@app.post("/data/import")
def import_market_data(payload: MarketDataImport):
    train_imported_records(payload.records)
    return {
        "success": True,
        "records_imported": len(payload.records),
        "models_retrained": [14, 30, 60],
        "data_source": "imported historical CSV",
    }
