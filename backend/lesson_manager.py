"""
lesson_manager.py — Stateful Guru-Shishya Lesson Engine.

Responsibilities:
  1. Persist session results (phoneme error counts, guru-laghu metrics).
  2. Identify "High-Error Phonemes" from accumulated session history.
  3. Rank shlokas by frequency of those problem phonemes for "Guru Teaching" mode.
  4. Provide an endpoint-ready interface for the FastAPI backend.

Storage: A local JSON file (``session_history.json``) acts as a lightweight
database.  It is flushed on each save so that multiple server restarts do not
lose data.  A production deployment would swap this for SQLite or Postgres.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Storage path
# ---------------------------------------------------------------------------

_HISTORY_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "session_history.json",
)

# ---------------------------------------------------------------------------
# Phoneme → shloka index
# Maps each IPA phoneme symbol to the shloka IDs that contain it.
# Built from the PHONEME_PROFILE metadata injected into the shloka data.
# ---------------------------------------------------------------------------

# Hard-coded phoneme profile for the shlokas in the library.
# Format: { phoneme_symbol: [shloka_id, ...] }
# This covers the most pedagogically significant phonemes.
PHONEME_SHLOKA_INDEX: Dict[str, List[str]] = {
    # Mahaprana consonants — aspiration-critical
    "kʰ": ["gita-2-47", "gayatri", "kalabhairava"],
    "gʰ": ["gita-4-7", "mahamrityunjaya"],
    "cʰ": ["sahana-vavatu", "gita-18-66"],
    "jʰ": ["vidya-shloka", "gita-6-5"],
    "ʈʰ": ["dakshinamurti"],
    "ɖʰ": ["subhashita-1"],
    "tʰ": ["gita-2-62", "gayatri-shanti"],
    "dʰ": ["ganesha-shloka", "mahamrityunjaya", "lingashtakam"],
    "pʰ": ["shri-guru", "gita-9-27"],
    "bʰ": ["deepam", "parame-shwara", "lingashtakam"],
    # Dirgha (Guru) vowels — duration-critical
    "aː": ["gayatri", "gita-2-47", "asato-ma", "mahamrityunjaya"],
    "iː": ["gita-2-62", "gita-6-5", "saraswati", "shri-guru"],
    "uː": ["sahana-vavatu", "gayatri-shanti", "gita-18-66"],
    # Retroflex consonants — place-critical
    "ʈ":  ["ganesha-shloka", "subhashita-1"],
    "ɖ":  ["gita-4-7"],
    "ɳ":  ["gita-2-47", "gayatri", "mahamrityunjaya"],
    "ʂ":  ["gita-9-27", "dakshinamurti"],
    "ʃ":  ["shivaya", "gita-18-66"],
    # Sibilants
    "s":  ["sarve-bhavantu", "peace-prayer", "sahana-vavatu"],
    # Nasals
    "ŋ":  ["vidya-shloka", "gita-6-5"],
    "ɲ":  ["gita-4-7", "kalabhairava"],
    # Visarga / Anusvara
    "h":  ["morning-prayer", "annapurna", "durga-devi"],
    "m":  ["shivaya", "mahamrityunjaya"],
}

# Corrective tips indexed by linguistic_tag (mirrors alignment.py tags)
CORRECTIVE_TIPS: Dict[str, Dict[str, str]] = {
    "mahaprana": {
        "title": "Mahaprana Correction",
        "tip": (
            "You missed the aspirated breath burst. "
            "Place your palm in front of your mouth — you should feel a puff "
            "of air for 'kha', 'gha', 'tha', 'dha', etc. "
            "Practise: ka–kha, ga–gha in pairs."
        ),
        "example": "क–ख, ग–घ, त–थ, द–ध",
    },
    "guru_laghu": {
        "title": "Vowel Duration (Guru-Laghu) Correction",
        "tip": (
            "Long vowels (ā, ī, ū) must be held for exactly twice the duration "
            "of their short counterparts (a, i, u). "
            "Tap your finger: short = 1 beat, long = 2 beats. "
            "Practise by clapping along to the syllable rhythm."
        ),
        "example": "a (1 beat) → ā (2 beats), i → ī, u → ū",
    },
    "place": {
        "title": "Articulation Place Correction",
        "tip": (
            "Touch your tongue to the correct spot: "
            "Dental (t, d, n) → behind upper teeth. "
            "Retroflex (ṭ, ḍ, ṇ) → curl tongue back to the hard palate. "
            "Palatal (c, j) → front of hard palate."
        ),
        "example": "त (dental) vs ट (retroflex)",
    },
    "voicing": {
        "title": "Voicing Correction",
        "tip": (
            "Place two fingers on your throat. "
            "Voiced consonants (g, d, b, v) create vibration; "
            "unvoiced (k, t, p, s) do not. "
            "Practise whispered pairs: ka–ga, ta–da."
        ),
        "example": "क (unvoiced) vs ग (voiced)",
    },
    "cross_class": {
        "title": "Vowel / Consonant Confusion",
        "tip": (
            "A vowel is an open, unobstructed sound (a, i, u, e, o). "
            "A consonant requires some obstruction of the air stream. "
            "Slow down and articulate each syllable separately."
        ),
        "example": "अ (vowel) vs क (consonant)",
    },
    "generic": {
        "title": "Pronunciation Correction",
        "tip": (
            "Listen to the Guru's reference pronunciation carefully, "
            "then repeat slowly three times before attempting at full speed."
        ),
        "example": "",
    },
}


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def _load_history() -> Dict[str, Any]:
    """Load session history from disk, returning empty structure on failure."""
    if not os.path.isfile(_HISTORY_FILE):
        return {"sessions": [], "phoneme_error_counts": {}}
    try:
        with open(_HISTORY_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        logger.error("[LessonManager] Could not load history: %s", exc)
        return {"sessions": [], "phoneme_error_counts": {}}


def _save_history(history: Dict[str, Any]) -> None:
    """Persist session history to disk."""
    try:
        with open(_HISTORY_FILE, "w", encoding="utf-8") as fh:
            json.dump(history, fh, ensure_ascii=False, indent=2)
    except Exception as exc:
        logger.error("[LessonManager] Could not save history: %s", exc)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def log_session_result(session_data: Dict[str, Any]) -> None:
    """
    Persist a completed session result.

    ``session_data`` should contain:
      - ``shloka_id``           — str
      - ``phoneme_scores``      — list[{ref_ph, score, linguistic_tag}]
      - ``guru_laghu_metrics``  — dict from compute_guru_laghu_ratio()
      - ``overall_score``       — float
      - ``timestamp``           — ISO-8601 str (optional, auto-filled)
    """
    history = _load_history()

    # Stamp and append
    session_data.setdefault(
        "timestamp",
        datetime.now(tz=timezone.utc).isoformat(),
    )
    history["sessions"].append(session_data)

    # Accumulate per-phoneme error counts
    error_counts: Dict[str, int] = history.setdefault("phoneme_error_counts", {})
    for ps in session_data.get("phoneme_scores", []):
        if ps.get("score", 1.0) < 0.6 and ps.get("ref_ph"):
            ph = str(ps["ref_ph"])
            error_counts[ph] = error_counts.get(ph, 0) + 1

    _save_history(history)
    logger.info(
        "[LessonManager] Session logged for shloka '%s', score=%.1f",
        session_data.get("shloka_id", "?"),
        session_data.get("overall_score", 0.0),
    )


def get_high_error_phonemes(top_n: int = 5) -> List[Dict[str, Any]]:
    """
    Return the top-N phonemes with the highest cumulative error count.

    Each entry::

        {"phoneme": str, "error_count": int}
    """
    history = _load_history()
    error_counts: Dict[str, int] = history.get("phoneme_error_counts", {})
    ranked = sorted(error_counts.items(), key=lambda kv: kv[1], reverse=True)
    return [{"phoneme": ph, "error_count": cnt} for ph, cnt in ranked[:top_n]]


def get_targeted_shlokas(
    error_phonemes: Optional[List[str]] = None,
    max_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Return shloka IDs ranked by frequency of high-error phonemes.

    If ``error_phonemes`` is None, the stored session history is queried
    automatically.

    Each entry::

        {"shloka_id": str, "target_phonemes": [str], "relevance_score": int}
    """
    if error_phonemes is None:
        high_error = get_high_error_phonemes(top_n=8)
        error_phonemes = [entry["phoneme"] for entry in high_error]

    if not error_phonemes:
        # No history yet — return a pedagogically ordered default set
        return [
            {"shloka_id": sid, "target_phonemes": [], "relevance_score": 0}
            for sid in [
                "gayatri", "gita-2-47", "mahamrityunjaya",
                "shri-guru", "ganesha-shloka",
            ][:max_results]
        ]

    # Build shloka relevance scores
    shloka_scores: Dict[str, Dict[str, Any]] = {}
    for phoneme in error_phonemes:
        for shloka_id in PHONEME_SHLOKA_INDEX.get(phoneme, []):
            entry = shloka_scores.setdefault(
                shloka_id,
                {"shloka_id": shloka_id, "target_phonemes": [], "relevance_score": 0},
            )
            entry["target_phonemes"].append(phoneme)
            entry["relevance_score"] += 1

    ranked = sorted(
        shloka_scores.values(),
        key=lambda e: e["relevance_score"],
        reverse=True,
    )
    return ranked[:max_results]


def get_corrective_tip(linguistic_tag: Optional[str]) -> Dict[str, str]:
    """
    Return the title, tip text, and example for a given linguistic error tag.

    Falls back to the generic tip if the tag is unknown.
    """
    return CORRECTIVE_TIPS.get(linguistic_tag or "generic", CORRECTIVE_TIPS["generic"])


def get_session_summary() -> Dict[str, Any]:
    """
    Return a compact summary of all stored sessions for the paper's Results section.

    Includes:
      - Total sessions logged
      - Mean overall score
      - Aggregate guru-laghu accuracy
      - Top-5 error phonemes
    """
    history = _load_history()
    sessions: List[Dict[str, Any]] = history.get("sessions", [])

    if not sessions:
        return {"total_sessions": 0}

    scores = [s.get("overall_score", 0.0) for s in sessions if "overall_score" in s]
    gl_accuracies = [
        s["guru_laghu_metrics"]["ratio_accuracy"]
        for s in sessions
        if isinstance(s.get("guru_laghu_metrics"), dict)
    ]

    return {
        "total_sessions": len(sessions),
        "mean_overall_score": round(sum(scores) / len(scores), 4) if scores else None,
        "mean_guru_laghu_accuracy": (
            round(sum(gl_accuracies) / len(gl_accuracies), 4) if gl_accuracies else None
        ),
        "top_error_phonemes": get_high_error_phonemes(top_n=5),
    }
