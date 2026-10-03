from io import BytesIO
import base64
import asyncio
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import cv2
import numpy as np

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from PIL import Image

from app.predictor import predict_leaf, model
from app.image_analysis import analyze_affected_area
from app.gradcam import generate_gradcam
from app.disease_info import get_disease_info
from app.report_generator import generate_pdf_report


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="PlantVision AI API",
    description=(
        "AI-powered plant disease detection API "
        "using MobileNetV2, OpenCV and Explainable AI."
    ),
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# FRONTEND
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

FRONTEND_DIR = BASE_DIR / "frontend"


app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)


# =========================================================
# HELPER — NUMPY IMAGE TO BASE64 PNG
# =========================================================

def numpy_to_base64(
    image_array,
    is_rgb=False
):

    """
    Convert a NumPy image into a Base64 PNG
    that can be displayed directly by a browser.
    """

    array = np.asarray(
        image_array
    )


    # -----------------------------------------
    # NORMALIZE FLOAT IMAGES
    # -----------------------------------------

    if array.dtype != np.uint8:

        array = np.nan_to_num(
            array
        )

        if array.max() <= 1.0:

            array = array * 255

        array = np.clip(
            array,
            0,
            255
        ).astype(np.uint8)


    # -----------------------------------------
    # RGB → BGR FOR OPENCV ENCODING
    # -----------------------------------------

    if (
        is_rgb
        and array.ndim == 3
        and array.shape[2] == 3
    ):

        array = cv2.cvtColor(
            array,
            cv2.COLOR_RGB2BGR
        )


    # -----------------------------------------
    # ENCODE PNG
    # -----------------------------------------

    success, encoded_image = (
        cv2.imencode(
            ".png",
            array
        )
    )


    if not success:

        raise ValueError(
            "Could not encode analysis image."
        )


    encoded_string = (
        base64.b64encode(
            encoded_image.tobytes()
        ).decode("utf-8")
    )


    return (
        "data:image/png;base64,"
        + encoded_string
    )


# =========================================================
# HELPER — READ UPLOADED IMAGE
# =========================================================

async def read_uploaded_image(
    file: UploadFile
):

    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png"
    }


    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid file type. "
                "Please upload a JPG, JPEG or PNG image."
            )
        )


    image_bytes = await file.read()


    if not image_bytes:

        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty."
        )


    try:

        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")

    except Exception:

        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file could not "
                "be read as a valid image."
            )
        )


    return image


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return FileResponse(
        FRONTEND_DIR / "index.html"
    )

# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "model": "MobileNetV2",
        "classes": 27
    }


# =========================================================
# PREDICT
# =========================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):

    try:

        # -------------------------------------------------
        # READ IMAGE
        # -------------------------------------------------

        image = await read_uploaded_image(
            file
        )


        # -------------------------------------------------
        # DISEASE PREDICTION
        # -------------------------------------------------

        result = predict_leaf(
            image
        )


        # -------------------------------------------------
        # VISUAL LEAF ANALYSIS
        # -------------------------------------------------

        area_result = analyze_affected_area(
            image
        )


        # -------------------------------------------------
        # GRAD-CAM
        # -------------------------------------------------

        gradcam_result = generate_gradcam(
            image,
            model,
            result["class_index"]
        )


        # -------------------------------------------------
        # DISEASE INFORMATION
        # -------------------------------------------------

        disease_details = get_disease_info(
            result["class"]
        )


        # -------------------------------------------------
        # TOP PREDICTIONS
        # -------------------------------------------------

        top_predictions = []


        for prediction in result[
            "top_predictions"
        ]:

            top_predictions.append(
                {
                    "plant":
                        prediction["plant"],

                    "disease":
                        prediction["disease"],

                    "class":
                        prediction.get("class"),

                    "confidence": round(
                        float(
                            prediction[
                                "confidence"
                            ]
                        ) * 100,
                        2
                    )
                }
            )


        # -------------------------------------------------
        # CONVERT ANALYSIS IMAGES
        # -------------------------------------------------

        original_image_base64 = (
            numpy_to_base64(
                area_result["image"],
                is_rgb=True
            )
        )


        leaf_mask_base64 = (
            numpy_to_base64(
                area_result["leaf_mask"]
            )
        )


        affected_mask_base64 = (
            numpy_to_base64(
                area_result[
                    "affected_mask"
                ]
            )
        )


        heatmap_base64 = (
            numpy_to_base64(
                gradcam_result[
                    "colored_heatmap"
                ],
                is_rgb=True
            )
        )


        overlay_base64 = (
            numpy_to_base64(
                gradcam_result[
                    "overlay"
                ],
                is_rgb=True
            )
        )


        # -------------------------------------------------
        # HEALTH GUIDANCE
        # -------------------------------------------------

        health_guidance = {

            "healthy": bool(
                disease_details[
                    "healthy"
                ]
            ),

            "about":
                disease_details[
                    "about"
                ],

            "common_visual_signs":
                disease_details[
                    "symptoms"
                ],

            "suggested_next_steps":
                disease_details[
                    "actions"
                ],

            "prevention":
                disease_details[
                    "prevention"
                ]
        }


        # -------------------------------------------------
        # FINAL RESPONSE
        # -------------------------------------------------

        return {

            "success": True,


            # =============================================
            # PREDICTION
            # =============================================

            "prediction": {

                "plant":
                    result["plant"],

                "disease":
                    result["disease"],

                "class":
                    result["class"],

                "class_index": int(
                    result["class_index"]
                ),

                "confidence": round(
                    float(
                        result["confidence"]
                    ) * 100,
                    2
                ),

                "confidence_status":
                    result[
                        "confidence_status"
                    ],

                "message":
                    result["message"]
            },


            # =============================================
            # TOP 3
            # =============================================

            "top_predictions":
                top_predictions,


            # =============================================
            # VISUAL ANALYSIS
            # =============================================

            "visual_analysis": {

                "affected_percentage":
                    round(
                        float(
                            area_result[
                                "affected_percentage"
                            ]
                        ),
                        2
                    ),

                "original_image":
                    original_image_base64,

                "leaf_mask":
                    leaf_mask_base64,

                "affected_mask":
                    affected_mask_base64,

                "note": (
                    "The affected-area value is an "
                    "image-based estimate derived from "
                    "color and region analysis. It is "
                    "not an exact biological disease "
                    "severity measurement."
                )
            },


            # =============================================
            # EXPLAINABLE AI
            # =============================================

            "gradcam": {

                "heatmap":
                    heatmap_base64,

                "overlay":
                    overlay_base64,

                "note": (
                    "Warmer regions indicate stronger "
                    "model attention. Grad-CAM shows "
                    "where the model focused when "
                    "producing its prediction."
                )
            },


            # =============================================
            # HEALTH GUIDANCE
            # =============================================

            "health_guidance":
                health_guidance,


            # =============================================
            # DISCLAIMER
            # =============================================

            "disclaimer": (
                "PlantVision AI provides automated "
                "image-based analysis and general "
                "educational information. Predictions "
                "may be incorrect, especially when "
                "confidence is low. For serious or "
                "rapidly spreading plant problems, "
                "consult a qualified local agricultural "
                "professional."
            )
        }


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "PlantVision analysis failed: "
                f"{str(error)}"
            )
        )


# =========================================================
# PDF REPORT
# =========================================================

@app.post("/report")
async def create_report(
    file: UploadFile = File(...)
):

    try:

        # -------------------------------------------------
        # READ IMAGE
        # -------------------------------------------------

        image = await read_uploaded_image(
            file
        )


        # -------------------------------------------------
        # RUN ANALYSIS
        # -------------------------------------------------

        result = predict_leaf(
            image
        )


        area_result = analyze_affected_area(
            image
        )


        disease_details = get_disease_info(
            result["class"]
        )


        # -------------------------------------------------
        # GENERATE PDF
        # -------------------------------------------------

        pdf_bytes = generate_pdf_report(
            result,
            area_result,
            disease_details
        )


        # -------------------------------------------------
        # RETURN DOWNLOAD
        # -------------------------------------------------

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    "attachment; "
                    "filename=PlantVision_Analysis_Report.pdf"
                )
            }
        )


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate report: "
                f"{str(error)}"
            )
        )

# =========================================================
# ELEVENLABS REPORT NARRATION
# =========================================================

@app.post("/report-audio")
async def create_report_audio(payload: dict):
    """Generate speech for a localized report narration."""
    text = payload.get("text", "")
    language = payload.get("language", "en")

    if not isinstance(text, str) or not text.strip() or len(text) > 1900:
        raise HTTPException(
            status_code=400,
            detail="Narration text must be between 1 and 1900 characters."
        )

    language_codes = {"en": "en", "hi": "hi", "or": "or", "bn": "bn"}
    if language not in language_codes:
        raise HTTPException(status_code=400, detail="Unsupported narration language.")

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Speech is not configured. Add ELEVENLABS_API_KEY to the service environment."
        )

    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
    request_body = json.dumps({
        "inputs": [{"text": text.strip(), "voice_id": voice_id}],
        "model_id": "eleven_v4",
        "language_code": language_codes[language],
        "apply_text_normalization": "auto"
    }).encode("utf-8")
    request = Request(
        "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128",
        data=request_body,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )

    def fetch_audio():
        with urlopen(request, timeout=90) as response:
            return response.read()

    try:
        audio = await asyncio.to_thread(fetch_audio)
    except HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs rejected the speech request (HTTP {error.code}). Check the configured voice and account."
        )
    except (URLError, TimeoutError):
        raise HTTPException(
            status_code=502,
            detail="Could not reach ElevenLabs. Try again shortly."
        )

    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="plantvision-report.mp3"'}
    )
