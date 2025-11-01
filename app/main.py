from fastapi import FastAPI
from app.routes.analysis import router as analysis_router

app = FastAPI(title="ML Diagnostic API")

app.include_router(analysis_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "ML API running successfully"}
