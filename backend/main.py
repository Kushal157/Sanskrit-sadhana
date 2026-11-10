import asyncio
import io
import os
import re
import struct
import subprocess
import sys
import uuid
import logging
import wave
import numpy as np
from typing import Any, Optional

# Ensure local imports work reliably
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
import torch
from g2p import text_to_phonemes
from alignment import align_phonemes
from scoring import (
    compute_detailed_results,
    per_phoneme_scores,
    compute_guru_laghu_ratio,
    extract_reference_segment,
    convert_alignment_to_guru_instruction,
)
from lesson_manager import (
    log_session_result,
    get_targeted_shlokas,
    get_high_error_phonemes,
    get_corrective_tip,
    get_session_summary,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sanskrit Sadhana Analysis Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def handle_api_prefix(request, call_next):
    """
    Support both direct root paths (used by internal service bindings)
    and /api-prefixed paths (used by public rewrites and reverse proxies).
    """
    path = request.scope.get("path", "")
    if path.startswith("/api/"):
        request.scope["path"] = path[4:]
    response = await call_next(request)
    return response

# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------
# Use faster_whisper with INT8 optimization for performance
MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
model: Optional[Any] = None
vad_model: Optional[Any] = None  # Silero VAD model for silence detection
SILENCE_THRESHOLD_MS = 800  # Flush buffer after 800ms of silence
translation_model_name = os.getenv("SANSKRIT_TRANSLATION_MODEL", "facebook/nllb-200-distilled-600M")
translation_source_lang = os.getenv("SANSKRIT_SOURCE_LANG", "san_Deva")
translation_target_lang = os.getenv("SANSKRIT_TARGET_LANG", "eng_Latn")
translation_tokenizer: Optional[Any] = None
translation_model: Optional[Any] = None
translation_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Reference audio cache directory
REF_AUDIO_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ref_audio_cache")
os.makedirs(REF_AUDIO_CACHE_DIR, exist_ok=True)

# WebSocket audio buffer: accumulate PCM before transcribing
_WS_BUFFER_TARGET_SAMPLES = 16000 * 2   # 2 seconds @ 16kHz


class MeaningRequest(BaseModel):
    text: str


class SessionSaveRequest(BaseModel):
    shloka_id: str
    phoneme_scores: list
    guru_laghu_metrics: dict
    overall_score: float
    timestamp: Optional[str] = None


class VivaEvaluateRequest(BaseModel):
    shloka_text: str
    audio_base64: str  # Base64-encoded PCM audio


def get_vad_model() -> Any:
    """Load Silero VAD model for real-time speech detection."""
    global vad_model
    if vad_model is not None:
        return vad_model
    try:
        vad_model, utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
        )
        logger.info("[VAD] Loaded Silero VAD model successfully")
        return vad_model
    except Exception as exc:
        logger.warning("[VAD] Failed to load Silero VAD (%s)", exc)
        return None


def get_model() -> Any:
    """Load faster_whisper with INT8 quantization for performance."""
    global model
    if model is None:
        try:
            from faster_whisper import WhisperModel
            print(f"Loading faster_whisper model: {MODEL_NAME} with INT8 optimization...")
            model = WhisperModel(
                MODEL_NAME,
                device="cpu",
                compute_type="int8",
            )
            logger.info("[Whisper] Loaded faster_whisper with INT8 on CPU")
        except Exception as exc:
            logger.warning("[Whisper] Failed to load faster_whisper (%s); falling back to standard Whisper", exc)
            import whisper
            model = whisper.load_model(MODEL_NAME)
    return model


def get_translation_model() -> tuple[Any, Any]:
    global translation_model, translation_tokenizer

    if translation_model is None or translation_tokenizer is None:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        print(f"Loading Sanskrit translation model: {translation_model_name}...")
        translation_tokenizer = AutoTokenizer.from_pretrained(translation_model_name)
        translation_model = AutoModelForSeq2SeqLM.from_pretrained(translation_model_name)
        translation_model.to(translation_device)
        translation_model.eval()

    return translation_tokenizer, translation_model


def normalize_translation_input(text: str) -> str:
    return " ".join(text.replace("\r", "\n").split()).strip()


def split_translation_segments(text: str) -> list[str]:
    normalized = text.replace("\r", "\n")
    raw_segments = []

    for line in normalized.split("\n"):
        for segment in line.replace("॥", "|").replace("।", "|").split("|"):
            cleaned = segment.strip()
            if cleaned:
                raw_segments.append(cleaned)

    return raw_segments or [normalize_translation_input(text)]


def translate_segment(segment: str) -> str:
    tokenizer, translation_engine = get_translation_model()
    source_text = normalize_translation_input(segment)

    if not source_text:
        return ""

    tokenizer.src_lang = translation_source_lang
    encoded = tokenizer(
        source_text,
        return_tensors="pt",
        truncation=True,
        max_length=256,
    )
    encoded = {key: value.to(translation_device) for key, value in encoded.items()}

    forced_bos_token_id = None
    if hasattr(tokenizer, "lang_code_to_id") and translation_target_lang in tokenizer.lang_code_to_id:
        forced_bos_token_id = tokenizer.lang_code_to_id[translation_target_lang]

    generated = translation_engine.generate(
        **encoded,
        max_new_tokens=128,
        num_beams=4,
        forced_bos_token_id=forced_bos_token_id,
    )

    translated = tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()
    return translated


def translate_sanskrit_text(text: str) -> str:
    cleaned = normalize_translation_input(text)
    if not cleaned:
        return ""

    segments = split_translation_segments(cleaned)
    translated_segments = []

    for segment in segments:
        translated = translate_segment(segment)
        if translated:
            translated_segments.append(translated)

    return " ".join(translated_segments).strip()


def build_word_feedback(reference_text: str, alignment_data: Any) -> list[dict[str, Any]]:
    """Map phoneme-level alignment issues to words in the reference text."""
    words = tokenize_words(reference_text)
    if not words:
        return []

    ranges: list[dict[str, Any]] = []
    cursor = 0

    for idx, word in enumerate(words):
        phoneme_count = len(text_to_phonemes(word))
        if phoneme_count <= 0:
            continue

        start_idx = cursor
        end_idx = cursor + phoneme_count - 1
        ranges.append(
            {
                "word_index": idx,
                "word": word,
                "start": start_idx,
                "end": end_idx,
                "issue_count": 0,
            }
        )
        cursor += phoneme_count

    for step in alignment_data:
        if step.get("op") == "match":
            continue

        ref_idx = step.get("ref_idx")
        if ref_idx is None:
            continue

        for word_range in ranges:
            if word_range["start"] <= ref_idx <= word_range["end"]:
                word_range["issue_count"] += 1
                break

    feedback: list[dict[str, Any]] = []
    for word_range in ranges:
        issue_count = int(word_range["issue_count"])
        if issue_count <= 0:
            continue

        if issue_count >= 3:
            severity = "high"
        elif issue_count == 2:
            severity = "medium"
        else:
            severity = "low"

        feedback.append(
            {
                "word": word_range["word"],
                "word_index": word_range["word_index"],
                "issue_count": issue_count,
                "severity": severity,
            }
        )

    feedback.sort(key=lambda item: item["issue_count"], reverse=True)
    return feedback


def tokenize_words(text: str) -> list[str]:
    tokens: list[str] = []
    cleaned_text = text.replace("\n", " ").strip()

    if not cleaned_text:
        return tokens

    for raw in re.split(r"\s+", cleaned_text):
        token = raw.strip().strip(".,;:!?|।॥/\\()[]{}<>\"“”‘’")
        if token:
            tokens.append(token)

    return tokens


def phoneme_key(word: str) -> str:
    phonemes = text_to_phonemes(word)
    if not phonemes:
        return word.lower()

    joined = "-".join(str(item.get("ph", "")).lower() for item in phonemes if item.get("ph"))
    return joined or word.lower()


def build_word_mismatch_feedback(reference_text: str, hypothesis_text: str) -> list[dict[str, Any]]:
    from difflib import SequenceMatcher

    ref_words = tokenize_words(reference_text)
    hyp_words = tokenize_words(hypothesis_text)

    if not ref_words:
        return []

    ref_keys = [phoneme_key(word) for word in ref_words]
    hyp_keys = [phoneme_key(word) for word in hyp_words]
    matcher = SequenceMatcher(None, ref_keys, hyp_keys, autojunk=False)

    mismatches: list[dict[str, Any]] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue

        if tag == "replace":
            overlap = min(i2 - i1, j2 - j1)
            for offset in range(overlap):
                mismatches.append(
                    {
                        "mismatch_type": "replace",
                        "expected_word": ref_words[i1 + offset],
                        "pronounced_word": hyp_words[j1 + offset],
                        "expected_index": i1 + offset,
                        "pronounced_index": j1 + offset,
                    }
                )

            for extra_ref in range(i1 + overlap, i2):
                mismatches.append(
                    {
                        "mismatch_type": "delete",
                        "expected_word": ref_words[extra_ref],
                        "pronounced_word": None,
                        "expected_index": extra_ref,
                        "pronounced_index": None,
                    }
                )

            for extra_hyp in range(j1 + overlap, j2):
                mismatches.append(
                    {
                        "mismatch_type": "insert",
                        "expected_word": None,
                        "pronounced_word": hyp_words[extra_hyp],
                        "expected_index": None,
                        "pronounced_index": extra_hyp,
                    }
                )

        elif tag == "delete":
            for ref_idx in range(i1, i2):
                mismatches.append(
                    {
                        "mismatch_type": "delete",
                        "expected_word": ref_words[ref_idx],
                        "pronounced_word": None,
                        "expected_index": ref_idx,
                        "pronounced_index": None,
                    }
                )

        elif tag == "insert":
            for hyp_idx in range(j1, j2):
                mismatches.append(
                    {
                        "mismatch_type": "insert",
                        "expected_word": None,
                        "pronounced_word": hyp_words[hyp_idx],
                        "expected_index": None,
                        "pronounced_index": hyp_idx,
                    }
                )

    return mismatches


def preprocess_audio_for_analysis(input_path: str, temp_dir: str) -> str:
    """Denoise and normalize user audio for more stable pronunciation analysis."""
    processed_path = os.path.join(temp_dir, f"{uuid.uuid4()}-clean.wav")
    ffmpeg_cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-af",
        "highpass=f=120,lowpass=f=3800,afftdn=nf=-20",
        processed_path,
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
        return processed_path
    except Exception:
        # Fallback to original upload if ffmpeg preprocessing fails.
        return input_path


def normalize_token(token: str) -> str:
    return token.strip().strip(".,;:!?|।॥/\\()[]{}<>\"“”‘’").lower()


def is_probably_sanskrit_token(token: str) -> bool:
    if not token:
        return False

    # Accept Devanagari directly.
    if any("\u0900" <= ch <= "\u097F" for ch in token):
        return True

    # Allow transliteration tokens with common Sanskrit diacritics.
    if re.fullmatch(r"[a-zāīūṛṝḷṅñṭḍṇśṣḥṃm']+", token):
        return True

    return False


def sanitize_hypothesis_for_sanskrit(reference_text: str, hypothesis_text: str) -> str:
    """Keep Sanskrit-like words and words close to the reference lexicon."""
    ref_words = [normalize_token(word) for word in tokenize_words(reference_text)]
    ref_words = [word for word in ref_words if word]
    ref_keys = {phoneme_key(word) for word in ref_words}
    ref_set = set(ref_words)

    sanitized: list[str] = []
    raw_tokens = [normalize_token(item) for item in re.split(r"\s+", hypothesis_text.strip())]

    for token in raw_tokens:
        if not token:
            continue

        if token in ref_set:
            sanitized.append(token)
            continue

        if not is_probably_sanskrit_token(token):
            continue

        token_key = phoneme_key(token)
        if token_key in ref_keys:
            sanitized.append(token)

    return " ".join(sanitized)

@app.get("/")
async def root() -> Any:
    return {
        "status": "online",
        "model": MODEL_NAME,
        "model_loaded": model is not None,
        "translation_model": translation_model_name,
        "translation_model_loaded": translation_model is not None,
    }


# ---------------------------------------------------------------------------
# Existing REST endpoints (unchanged)
# ---------------------------------------------------------------------------

@app.post("/meaning")
async def meaning(request: MeaningRequest) -> Any:
    cleaned_text = request.text.strip()

    if not cleaned_text:
        return {"meaning": "", "source": "empty"}

    try:
        translated = translate_sanskrit_text(cleaned_text)
        if translated:
            return {
                "meaning": translated,
                "source": "local-model",
                "model": translation_model_name,
            }
    except Exception as exc:
        return {
            "meaning": "",
            "source": "error",
            "error": str(exc),
            "model": translation_model_name,
        }

    return {
        "meaning": "",
        "source": "unavailable",
        "model": translation_model_name,
    }

@app.post("/analyze")
async def analyze_audio(
    audio: UploadFile = File(...),
    shloka_text: str = Form(""),
    ref_text: str = Form("")
) -> Any:
    reference_text = ref_text.strip() or shloka_text.strip()

    if not reference_text:
        return {"error": "shloka_text cannot be empty"}
        
    # 1. Save temp file
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(audio.filename or "")[1] or ".webm"
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
    
    with open(temp_path, "wb") as f:
        f.write(await audio.read())

    processed_audio_path = preprocess_audio_for_analysis(temp_path, temp_dir)
        
    try:
        model_instance = get_model()
        # 2. Transcription
        result: Any = model_instance.transcribe(
            processed_audio_path,
            language="sa",
            task="transcribe",
            initial_prompt=reference_text,
            temperature=0.0,
            condition_on_previous_text=False,
            no_speech_threshold=0.5,
            fp16=False,
        )
        raw_hyp_text = result.get('text', "")
        hyp_text = sanitize_hypothesis_for_sanskrit(reference_text, raw_hyp_text)
        
        # 3. G2P
        ref_phonemes = text_to_phonemes(reference_text)
        hyp_phonemes = text_to_phonemes(hyp_text)
        
        # 4. Alignment
        alignment = align_phonemes(ref_phonemes, hyp_phonemes)

        # 5. Word-level mismatch detection
        word_feedback = build_word_feedback(reference_text, alignment)
        word_mismatches = build_word_mismatch_feedback(reference_text, hyp_text)
        
        # 6. Scoring
        results = compute_detailed_results(
            alignment,
            len(ref_phonemes),
            word_mismatch_count=len(word_mismatches),
        )
        results["word_feedback"] = word_feedback
        results["word_mismatches"] = word_mismatches

        # Guru-Laghu novelty metric
        gl_metrics = compute_guru_laghu_ratio(alignment)
        ph_scores = per_phoneme_scores(alignment)

        return {
            "transcript": hyp_text,
            "raw_transcript": raw_hyp_text,
            "score": results["score"],
            "ref_phonemes": ref_phonemes,
            "hyp_phonemes": hyp_phonemes,
            "analysis": results,
            "phoneme_scores": ph_scores,
            "guru_laghu_metrics": gl_metrics,
        }

    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if processed_audio_path != temp_path and os.path.exists(processed_audio_path):
            os.remove(processed_audio_path)


# ---------------------------------------------------------------------------
# WebSocket: /ws/guru-teaching
# ---------------------------------------------------------------------------

def _transcribe_pcm_buffer(pcm_bytes: bytes, reference_text: str) -> str:
    """
    Convert raw PCM-16 LE 16kHz mono bytes to a Whisper transcription.
    Tries INT8-quantized model first; falls back to standard Whisper.
    """
    import numpy as np
    import tempfile
    import soundfile as sf  # type: ignore

    # Decode 16-bit LE samples → float32 in [-1, 1]
    n_samples = len(pcm_bytes) // 2
    samples = struct.unpack_from(f"<{n_samples}h", pcm_bytes)
    audio_f32 = np.array(samples, dtype=np.float32) / 32768.0

    # Write to a temp WAV for Whisper
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        sf.write(tmp_path, audio_f32, 16000, format="WAV", subtype="PCM_16")

        # Try INT8 faster-whisper first
        qt_model = get_quantized_model()
        if qt_model is not None:
            segments, _ = qt_model.transcribe(
                tmp_path,
                language="sa",
                initial_prompt=reference_text,
                beam_size=1,
            )
            return " ".join(seg.text for seg in segments).strip()

        # Fall back to standard openai-whisper
        wm = get_model()
        result: Any = wm.transcribe(
            tmp_path,
            language="sa",
            task="transcribe",
            initial_prompt=reference_text,
            temperature=0.0,
            condition_on_previous_text=False,
            no_speech_threshold=0.5,
            fp16=False,
        )
        return result.get("text", "")
    finally:
        if os.path.isfile(tmp_path):
            os.remove(tmp_path)


@app.websocket("/ws/guru-teaching")
@app.websocket("/api/ws/guru-teaching")
async def ws_guru_teaching(websocket: WebSocket) -> None:
    """
    Real-time Guru-Shishya teaching WebSocket.

    Protocol
    --------
    Client → Server (binary):
        PCM 16-bit LE mono 16kHz audio chunks.

    Client → Server (text, JSON):
        { "type": "config",
          "shloka_text": "...",
          "ref_text": "...",
          "shloka_id": "..."
        }
        Send this frame FIRST before sending audio.

        { "type": "end" }  — signals end of recording.

    Server → Client (text, JSON):
        { "type": "alignment",
          "phoneme_scores": [...],
          "guru_laghu_metrics": {...},
          "transcript": str,
          "score": int,
          "errors": [...]
        }

        { "type": "guru_interrupt",
          "ref_idx": int,
          "ref_ph": str,
          "score": float,
          "linguistic_tag": str,
          "tip": { "title": str, "tip": str, "example": str }
        }

        { "type": "error", "message": str }
    """
    await websocket.accept()
    logger.info("[WS] Client connected to /ws/guru-teaching")

    reference_text = ""
    shloka_id = ""
    pcm_buffer: bytes = b""
    last_alignment: list = []

    try:
        while True:
            message = await websocket.receive()

            # ---- Text frame: config or end signal ----
            if "text" in message:
                try:
                    frame = __import__("json").loads(message["text"])
                except Exception:
                    await websocket.send_json({"type": "error", "message": "Invalid JSON frame"})
                    continue

                if frame.get("type") == "config":
                    reference_text = (
                        frame.get("ref_text", "").strip()
                        or frame.get("shloka_text", "").strip()
                    )
                    shloka_id = frame.get("shloka_id", "")
                    pcm_buffer = b""
                    logger.info(
                        "[WS] Config received: shloka_id=%s, ref_text_len=%d",
                        shloka_id, len(reference_text),
                    )
                    await websocket.send_json({"type": "ready"})

                elif frame.get("type") == "end":
                    # Process whatever is left in the buffer
                    if pcm_buffer and len(pcm_buffer) > 3200:  # > 100ms
                        await _process_and_send(websocket, pcm_buffer, reference_text, shloka_id, last_alignment)
                        pcm_buffer = b""
                    try:
                        await websocket.send_json({"type": "session_end"})
                    except Exception:
                        pass

            # ---- Binary frame: PCM audio chunk ----
            elif "bytes" in message:
                if not reference_text:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Send config frame with shloka_text first",
                    })
                    continue

                chunk: bytes = message["bytes"]
                pcm_buffer += chunk

                # Process once we have ~2 seconds of audio
                if len(pcm_buffer) >= _WS_BUFFER_TARGET_SAMPLES * 2:  # × 2 bytes per sample
                    result_alignment = await _process_and_send(
                        websocket, pcm_buffer, reference_text, shloka_id, last_alignment
                    )
                    if result_alignment:
                        last_alignment = result_alignment
                    # Keep a 0.5 s overlap for continuity
                    overlap = 16000 * 1  # 1 s overlap
                    pcm_buffer = pcm_buffer[-(overlap * 2):]

    except WebSocketDisconnect:
        logger.info("[WS] Client disconnected from /ws/guru-teaching")
    except Exception as exc:
        logger.error("[WS] Unexpected error: %s", exc)
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass


async def _process_and_send(
    websocket: WebSocket,
    pcm_bytes: bytes,
    reference_text: str,
    shloka_id: str,
    prev_alignment: list,
) -> list:
    """
    Transcribe a PCM buffer, run weighted DTW alignment, and push JSON frames.
    Returns the updated alignment path for overlap continuity.
    """
    # Guard: don't attempt to send if WS is already closing
    from starlette.websockets import WebSocketState
    def _ws_open() -> bool:
        return websocket.client_state == WebSocketState.CONNECTED

    try:
        # Run Whisper in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        raw_hyp = await loop.run_in_executor(
            None, _transcribe_pcm_buffer, pcm_bytes, reference_text
        )

        hyp_text = sanitize_hypothesis_for_sanskrit(reference_text, raw_hyp)

        ref_phonemes = text_to_phonemes(reference_text)
        hyp_phonemes = text_to_phonemes(hyp_text) if hyp_text else []

        alignment = align_phonemes(ref_phonemes, hyp_phonemes)
        ph_scores = per_phoneme_scores(alignment)
        gl_metrics = compute_guru_laghu_ratio(alignment)
        results = compute_detailed_results(alignment, len(ref_phonemes))

        if not _ws_open():
            return alignment

        # Send alignment frame
        await websocket.send_json({
            "type": "alignment",
            "phoneme_scores": ph_scores,
            "guru_laghu_metrics": gl_metrics,
            "transcript": hyp_text,
            "score": results.get("score", 0),
            "errors": results.get("errors", []),
        })

        if not _ws_open():
            return alignment

        # Emit ONE Guru Interrupt per batch — the single worst-scoring phoneme only.
        # This prevents popup storms when multiple phonemes score below theta.
        THETA = 0.6
        worst: Optional[dict] = None
        for ps in ph_scores:
            if ps.get("score", 1.0) < THETA and ps.get("ref_ph"):
                if worst is None or ps["score"] < worst["score"]:
                    worst = ps

        if worst and _ws_open():
            tip = get_corrective_tip(worst.get("linguistic_tag"))
            await websocket.send_json({
                "type": "guru_interrupt",
                "ref_idx": worst.get("ref_idx"),
                "ref_ph": worst.get("ref_ph"),
                "hyp_ph": worst.get("hyp_ph"),
                "score": worst.get("score"),
                "linguistic_tag": worst.get("linguistic_tag"),
                "tip": tip,
            })

        # Log to session history (non-blocking)
        asyncio.get_event_loop().call_soon(
            log_session_result,
            {
                "shloka_id": shloka_id,
                "phoneme_scores": ph_scores,
                "guru_laghu_metrics": gl_metrics,
                "overall_score": results.get("score", 0),
            },
        )

        return alignment

    except Exception as exc:
        logger.error("[WS] _process_and_send failed: %s", exc)
        if _ws_open():
            try:
                await websocket.send_json({"type": "error", "message": str(exc)})
            except Exception:
                pass
        return []


# ---------------------------------------------------------------------------
# Session API endpoints
# ---------------------------------------------------------------------------

@app.post("/session/save")
async def session_save(request: SessionSaveRequest) -> Any:
    """Save a frontend-initiated session result to the lesson history."""
    log_session_result(request.dict())
    return {"status": "saved"}


@app.get("/session/targeted-shlokas")
async def session_targeted_shlokas(phonemes: Optional[str] = None) -> Any:
    """
    Return shlokas ranked by how well they target the learner's weak phonemes.
    ``phonemes`` is an optional comma-separated list to override history-based selection.
    """
    ph_list = [p.strip() for p in phonemes.split(",")] if phonemes else None
    return {"targeted_shlokas": get_targeted_shlokas(ph_list)}


@app.get("/session/summary")
async def session_summary() -> Any:
    """Return aggregate session metrics for the paper's Results section."""
    return get_session_summary()


@app.get("/reference-audio/{shloka_id}/{phoneme_ref_idx}")
async def reference_audio_segment(
    shloka_id: str,
    phoneme_ref_idx: int,
    window_ms: int = 300,
) -> Any:
    """
    Extract and return a 200–500ms PCM audio fragment from the expert reference.

    The client passes the shloka_id and the ref_idx of the mispronounced phoneme.
    The server looks up a cached WAV (or downloads and converts the source audio)
    and returns the slice as ``audio/wav``.
    """
    cache_path = os.path.join(REF_AUDIO_CACHE_DIR, f"{shloka_id}.wav")

    if not os.path.isfile(cache_path):
        # Attempt to download the reference audio from the shloka's URL
        # This requires the frontend to have first called /analyze which sets up
        # the cache; or the admin can pre-populate REF_AUDIO_CACHE_DIR.
        return Response(
            content=b"",
            media_type="audio/wav",
            headers={"X-Reference-Status": "not-cached"},
        )

    # We need a stored alignment for this shloka — use a dummy single-phoneme alignment
    # if one isn't available; the segment extractor will still produce a clip.
    dummy_alignment = [{"ref_idx": phoneme_ref_idx}]
    pcm_bytes = extract_reference_segment(
        alignment_data=dummy_alignment,
        ref_audio_path=cache_path,
        phoneme_ref_idx=phoneme_ref_idx,
        window_ms=window_ms,
    )

    if not pcm_bytes:
        return Response(content=b"", media_type="audio/wav")

    # Wrap raw PCM in a WAV header
    wav_bytes = _pcm_to_wav(pcm_bytes, sample_rate=16000, num_channels=1, bits_per_sample=16)
    return Response(content=wav_bytes, media_type="audio/wav")


def _pcm_to_wav(
    pcm_data: bytes,
    sample_rate: int = 16000,
    num_channels: int = 1,
    bits_per_sample: int = 16,
) -> bytes:
    """Wrap raw PCM bytes in a minimal RIFF/WAV header."""
    data_size = len(pcm_data)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,                              # PCM
        num_channels,
        sample_rate,
        sample_rate * num_channels * bits_per_sample // 8,
        num_channels * bits_per_sample // 8,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm_data


def _detect_voice_activity(pcm_bytes: bytes, sample_rate: int = 16000) -> bool:
    """
    Use Silero VAD to detect if there's active speech in the audio.
    Returns True if speech is detected, False otherwise.
    """
    try:
        vad = get_vad_model()
        if vad is None:
            return True  # Assume voice activity if VAD unavailable
        
        # Convert bytes to float32 tensor
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        audio_tensor = torch.from_numpy(audio_int16).unsqueeze(0)
        
        # Get VAD output (confidence of speech presence)
        with torch.no_grad():
            speech_probs = vad(audio_tensor, sample_rate)
        
        # If confidence > 0.5, consider it voice activity
        return float(speech_probs.item()) > 0.5
    except Exception as exc:
        logger.warning("[VAD] Error detecting voice activity: %s", exc)
        return True


def _extract_audio_segment(pcm_bytes: bytes, start_ms: int, end_ms: int, sample_rate: int = 16000) -> bytes:
    """Extract a segment of audio between timestamps (in milliseconds)."""
    bytes_per_sample = 2  # 16-bit PCM
    start_byte = (start_ms * sample_rate // 1000) * bytes_per_sample
    end_byte = (end_ms * sample_rate // 1000) * bytes_per_sample
    return pcm_bytes[start_byte:end_byte]


def _transcribe_audio(pcm_bytes: bytes) -> str:
    """Transcribe PCM audio to text using faster_whisper."""
    try:
        whisper_model = get_model()
        
        # Convert PCM bytes to audio format expected by whisper
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
        if hasattr(whisper_model, 'transcribe'):
            # faster_whisper interface
            result = whisper_model.transcribe(audio_int16, language="sa")
            return result[0] if result and len(result) > 0 else ""
        else:
            # fallback to standard whisper
            import whisper
            result = whisper.transcribe(whisper_model, audio_int16, language="sa")
            return result.get("text", "")
    except Exception as exc:
        logger.error("[Transcription] Error: %s", exc)
        return ""


@app.post("/viva-evaluate")
async def viva_evaluate(request: VivaEvaluateRequest) -> Any:
    """
    Evaluate Shishya pronunciation with guru verdict and correction feedback.
    
    Returns:
    {
        "guru_verdict": str,  # Feedback message from the guru
        "mispronounced_word": str,  # Word with the most errors
        "timestamps": [start_ms, end_ms],  # Audio segment for correction
        "score": float,  # Overall pronunciation score
        "detailed_errors": list  # Detailed phoneme-level errors
    }
    """
    try:
        import base64
        from io import BytesIO
        
        # Decode audio from base64
        audio_bytes = base64.b64decode(request.audio_base64)
        
        # Check for voice activity
        has_speech = _detect_voice_activity(audio_bytes)
        if not has_speech:
            return {
                "guru_verdict": "Shishya, I did not hear your voice clearly. Please speak louder.",
                "mispronounced_word": "silence",
                "timestamps": [0, 0],
                "score": 0.0,
                "detailed_errors": [],
            }
        
        # Transcribe audio
        hypothesis_text = _transcribe_audio(audio_bytes)
        if not hypothesis_text:
            return {
                "guru_verdict": "I could not understand your pronunciation. Please try again, enunciating clearly.",
                "mispronounced_word": "unclear",
                "timestamps": [0, 0],
                "score": 0.0,
                "detailed_errors": [],
            }
        
        # Align pronunciation with reference
        reference_phonemes = text_to_phonemes(request.shloka_text)
        hypothesis_phonemes = text_to_phonemes(hypothesis_text)
        
        alignment_result = align_phonemes(reference_phonemes, hypothesis_phonemes)
        alignment_data = alignment_result.get("alignment", [])
        
        # Compute detailed results
        detailed_results = compute_detailed_results(
            alignment_data,
            len(reference_phonemes),
        )
        
        # Get guru instruction from error analysis
        guru_instruction = convert_alignment_to_guru_instruction(
            alignment_data,
            reference_phonemes,
            hypothesis_phonemes,
        )
        
        # Find mispronounced word and timestamps
        errors = detailed_results.get("errors", [])
        mispronounced_word = ""
        max_errors = 0
        error_timestamp_start = 0
        error_timestamp_end = 500  # Default 500ms segment
        
        if errors:
            # Find the word with most errors
            for error in errors:
                ref_idx = error.get("ref_idx", -1)
                if ref_idx >= 0 and ref_idx < len(reference_phonemes):
                    ref_ph = reference_phonemes[ref_idx]
                    if ref_ph.get("word"):
                        mispronounced_word = ref_ph.get("word")
                        # Estimate timestamps based on phoneme timing
                        error_timestamp_start = int((ref_idx / max(1, len(reference_phonemes))) * 5000)  # Scale to 5s max
                        error_timestamp_end = min(error_timestamp_start + 500, 5000)
                        break
        
        # Extract error audio segment for playback
        error_audio_segment = _extract_audio_segment(
            audio_bytes,
            error_timestamp_start,
            error_timestamp_end,
        )
        
        score = detailed_results.get("score", 0.0)
        
        return {
            "guru_verdict": guru_instruction,
            "mispronounced_word": mispronounced_word or "word_boundary",
            "timestamps": [error_timestamp_start, error_timestamp_end],
            "score": float(score),
            "detailed_errors": errors,
            "hypothesis_text": hypothesis_text,
            "reference_text": request.shloka_text,
        }
        
    except Exception as exc:
        logger.error("[/viva-evaluate] Error: %s", exc)
        return {
            "guru_verdict": f"Error in evaluation: {str(exc)}",
            "mispronounced_word": "error",
            "timestamps": [0, 0],
            "score": 0.0,
            "detailed_errors": [],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
