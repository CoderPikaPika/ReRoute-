# Freight Rate Forecast Service

This service runs the supplied XGBoost models and predicts freight rate in USD per metric tonne for 14, 30, and 60 days.

## Start

    python -m pip install -r requirements.txt
    python -m uvicorn main:app --host 127.0.0.1 --port 8000

Health endpoint: http://127.0.0.1:8000/health

Prediction endpoint: POST http://127.0.0.1:8000/predict

This predicts market freight rates, not a shipment-specific ETA.
