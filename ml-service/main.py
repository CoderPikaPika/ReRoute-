from pathlib import Path
import json
from csv import DictWriter
from datetime import date as Date, datetime
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from xgboost import XGBRegressor

BASE = Path(__file__).resolve().parent / "models"
DATA_DIR = Path(__file__).resolve().parent / "data"
CATBOOST_BASE = BASE / "catboost"
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

CATBOOST_MODELS = {}
CATBOOST_LOAD_ERROR = None
try:
    for horizon in (14, 30, 60):
        CATBOOST_MODELS[horizon] = joblib.load(CATBOOST_BASE / f"catboost_freight_rate_{horizon}_day_model.joblib")
except Exception as error:
    CATBOOST_LOAD_ERROR = str(error)

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

class AdvancedForecastInput(BaseModel):
    origin_port: str = "Hay_Point_AU"
    destination_port: str = "Paradip"
    origin_country: str = "Australia"
    cargo_type: str = "Thermal_Coal"
    cargo_quantity_mt: float = Field(100000, gt=0)
    vessel_type: str = "Panamax"
    vessel_dwt_mt: float = Field(75000, gt=0)
    vessel_age_years: float = Field(10, ge=0, le=80)
    vessel_draft_m: float = Field(13.8, gt=0, le=30)
    vessel_loa_m: float = Field(225, gt=0, le=500)
    vessel_beam_m: float = Field(32.3, gt=0, le=100)
    distance_nm: float = Field(4892, gt=0)
    freight_rate_usd_mt: float = Field(..., gt=0)
    bunker_price_usd_mt: float = Field(..., gt=0)
    commodity_price_usd_mt: float = Field(125, gt=0)
    origin_congestion_pct: float = Field(50, ge=0, le=100)
    destination_congestion_pct: float = Field(50, ge=0, le=100)
    origin_waiting_hours: float = Field(24, ge=0)
    destination_waiting_hours: float = Field(24, ge=0)
    vessel_availability: float = Field(120, ge=0)
    freight_volume_thousand_mt: float = Field(5_000_000, ge=0)

def season_for(month: int) -> str:
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Spring"
    if month in (6, 7, 8):
        return "Summer"
    return "Autumn"

def advanced_feature_row(x: AdvancedForecastInput):
    now = datetime.utcnow()
    month = now.month
    quarter = (month - 1) // 3 + 1
    day_of_year = now.timetuple().tm_yday
    total_congestion = (x.origin_congestion_pct + x.destination_congestion_pct) / 2
    total_waiting = x.origin_waiting_hours + x.destination_waiting_hours
    return {
        "origin_port": x.origin_port,
        "destination_port": x.destination_port,
        "origin_country": x.origin_country,
        "cargo_type": x.cargo_type,
        "cargo_quantity_mt": x.cargo_quantity_mt,
        "vessel_type": x.vessel_type,
        "vessel_dwt_mt": x.vessel_dwt_mt,
        "vessel_age_years": x.vessel_age_years,
        "vessel_draft_m": x.vessel_draft_m,
        "vessel_loa_m": x.vessel_loa_m,
        "vessel_beam_m": x.vessel_beam_m,
        "distance_nm": x.distance_nm,
        "freight_rate_usd_mt": x.freight_rate_usd_mt,
        "bunker_price_usd_mt": x.bunker_price_usd_mt,
        "commodity_price_usd_mt": x.commodity_price_usd_mt,
        "origin_congestion_pct": x.origin_congestion_pct,
        "destination_congestion_pct": x.destination_congestion_pct,
        "origin_waiting_hours": x.origin_waiting_hours,
        "destination_waiting_hours": x.destination_waiting_hours,
        "vessel_availability": x.vessel_availability,
        "freight_volume_thousand_mt": x.freight_volume_thousand_mt,
        "year": now.year,
        "month": month,
        "quarter": quarter,
        "day_of_week": now.weekday(),
        "day_of_year": day_of_year,
        "season": season_for(month),
        "route": f"{x.origin_port}_to_{x.destination_port}",
        "total_congestion_pct": total_congestion,
        "total_waiting_hours": total_waiting,
        "congestion_gap_pct": abs(x.origin_congestion_pct - x.destination_congestion_pct),
        "cargo_utilization_pct": min(100, x.cargo_quantity_mt / x.vessel_dwt_mt * 100),
        "month_sin": float(np.sin((2 * np.pi * month) / 12)),
        "month_cos": float(np.cos((2 * np.pi * month) / 12)),
    }

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
        "catboost": {
            "status": "ok" if CATBOOST_MODELS else "unavailable",
            "models_loaded": sorted(CATBOOST_MODELS.keys()),
            "feature_count": len(CATBOOST_MODELS[14]["features"]) if 14 in CATBOOST_MODELS else 0,
            "error": CATBOOST_LOAD_ERROR,
        },
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

@app.post("/predict/advanced")
def predict_advanced(x: AdvancedForecastInput):
    if not CATBOOST_MODELS:
        raise HTTPException(status_code=503, detail={"code": "CATBOOST_UNAVAILABLE", "message": "CatBoost models are unavailable", "detail": CATBOOST_LOAD_ERROR})
    row = advanced_feature_row(x)
    current = x.freight_rate_usd_mt
    forecasts = []
    for horizon in (14, 30, 60):
        bundle = CATBOOST_MODELS[horizon]
        frame = pd.DataFrame([[row[name] for name in bundle["features"]]], columns=bundle["features"])
        prediction = bundle["model"].predict(frame)[0]
        forecasts.append(result(horizon, current, prediction))
    return {
        "forecasts": forecasts,
        "data_source": "CatBoost multi-horizon model",
        "features_used": CATBOOST_MODELS[14]["features"],
        "disclaimer": "Predictions use the supplied CatBoost model. Validate external market inputs before operational use.",
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
