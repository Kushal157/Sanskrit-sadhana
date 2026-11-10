from typing import Any, List, Dict, Tuple, Optional, no_type_check
import logging
import os

logger = logging.getLogger(__name__)


def _phoneme_similarity(p1: Any, p2: Any) -> float:
    """Return similarity in [0, 1], where 1 means exact or very close match."""
    if not p1 or not p2:
        return 0.0

    if p1.get("ph") == p2.get("ph"):
        return 1.0

    # Cross-class substitutions (vowel <-> consonant) are usually far apart.
    if p1.get("type") != p2.get("type"):
        return 0.0

    score = 1.0

    if p1.get("place") != p2.get("place"):
        score = score - 0.35
    if p1.get("aspiration") != p2.get("aspiration"):
        score = score - 0.2
    if p1.get("voicing") != p2.get("voicing"):
        score = score - 0.2
    if p1.get("length") != p2.get("length"):
        score = score - 0.15

    return max(0.0, min(1.0, score))


def _safe_div(numerator: float, denominator: float) -> float:
    if denominator <= 0.0:
        return 0.0
    return numerator / denominator


def _clip_0_100(value: float) -> float:
    return max(0.0, min(100.0, value))


def _is_vowel(obj: Any) -> bool:
    return bool(obj) and obj.get("type") == "vowel"


def _error_category_and_tip(ref_obj: Any, hyp_obj: Any) -> Tuple[str, str]:
    if not ref_obj or not hyp_obj:
        return (
            "substitution_generic",
            "Repeat the target sound slowly and match the mouth posture.",
        )

    r_type = ref_obj.get("type")
    h_type = hyp_obj.get("type")

    if r_type == "vowel" and h_type == "vowel":
        if ref_obj.get("length") != hyp_obj.get("length"):
            return (
                "vowel_length_mismatch",
                "Hold long vowels for about twice the short-vowel duration.",
            )
        return (
            "vowel_quality_mismatch",
            "Stabilize tongue and lip position for a cleaner vowel quality.",
        )

    if r_type == "consonant" and h_type == "consonant":
        if ref_obj.get("aspiration") != hyp_obj.get("aspiration"):
            return (
                "aspiration_mismatch",
                "Practice breath release contrast between alpaprana and mahaprana.",
            )
        if ref_obj.get("place") != hyp_obj.get("place"):
            return (
                "place_mismatch",
                "Adjust tongue contact point to the correct articulation place.",
            )
        if ref_obj.get("voicing") != hyp_obj.get("voicing"):
            return (
                "voicing_mismatch",
                "Check vocal fold vibration for voiced vs unvoiced contrast.",
            )
        return (
            "consonant_quality_mismatch",
            "Repeat the consonant in minimal pairs to sharpen contrast.",
        )

    return (
        "cross_class_substitution",
        "Avoid replacing vowels with consonants (or vice versa); articulate clearly.",
    )


def _compute_component_scores(
    alignment_data: Any,
    ref_length: int,
    base_score: float,
    word_mismatch_count: int,
    near_match_count: int,
    match_count: int,
) -> Dict[str, Any]:
    vowel_ref_count = 0
    vowel_length_errors = 0
    rhythm_disruptions = 0
    unknown_hyp_count = 0

    for step in alignment_data:
        op_type = step.get("op")
        ref_obj = step.get("ref")
        hyp_obj = step.get("hyp")

        if hyp_obj and hyp_obj.get("type") == "unknown":
            unknown_hyp_count += 1

        if _is_vowel(ref_obj):
            vowel_ref_count += 1

        if op_type == "sub" and _is_vowel(ref_obj) and _is_vowel(hyp_obj):
            if ref_obj.get("length") != hyp_obj.get("length"):
                vowel_length_errors += 1

        if op_type == "del" and _is_vowel(ref_obj):
            vowel_length_errors += 1

        if op_type in ("del", "ins"):
            rhythm_disruptions += 1

    vowel_length_accuracy = 1.0 - _safe_div(float(vowel_length_errors), float(vowel_ref_count))
    vowel_length_accuracy = max(0.0, min(1.0, vowel_length_accuracy))

    rhythm_accuracy = 1.0 - _safe_div(float(rhythm_disruptions), float(ref_length))
    rhythm_accuracy = max(0.0, min(1.0, rhythm_accuracy))

    lexical_accuracy = 1.0 - _safe_div(float(word_mismatch_count), max(1.0, float(word_mismatch_count + 6.0)))
    lexical_accuracy = max(0.0, min(1.0, lexical_accuracy))

    articulation_score = _clip_0_100(base_score)
    prosody_score = _clip_0_100((vowel_length_accuracy * 65.0) + (rhythm_accuracy * 35.0))
    lexical_score = _clip_0_100(lexical_accuracy * 100.0)

    # Weighted score designed for research reporting and ablation.
    combined_novel_score = _clip_0_100(
        (0.62 * articulation_score)
        + (0.28 * prosody_score)
        + (0.10 * lexical_score)
    )

    alignment_quality = _safe_div(float(match_count + int(round(0.8 * near_match_count))), float(ref_length))
    unknown_ratio = _safe_div(float(unknown_hyp_count), float(max(1, len(alignment_data))))
    confidence = max(0.05, min(0.99, 0.15 + (0.75 * alignment_quality) - (0.35 * unknown_ratio)))

    if confidence < 0.45:
        uncertainty = "high"
    elif confidence < 0.7:
        uncertainty = "medium"
    else:
        uncertainty = "low"

    return {
        "component_scores": {
            "articulation": int(round(articulation_score)),
            "prosody": int(round(prosody_score)),
            "lexical": int(round(lexical_score)),
            "combined_novel": int(round(combined_novel_score)),
        },
        "prosody_metrics": {
            "vowel_ref_count": vowel_ref_count,
            "vowel_length_errors": vowel_length_errors,
            "rhythm_disruptions": rhythm_disruptions,
            "vowel_length_accuracy": round(vowel_length_accuracy, 4),
            "rhythm_accuracy": round(rhythm_accuracy, 4),
        },
        "confidence": round(confidence, 4),
        "uncertainty": uncertainty,
        "abstain_recommended": confidence < 0.45,
    }

@no_type_check
def compute_detailed_results(
    alignment_data: Any,
    ref_length: int,
    word_mismatch_count: int = 0,
) -> Dict[str, Any]:
    """Compute overall score and categorize errors."""
    if ref_length == 0:
        return {"score": 0, "errors": []}
        
    total_penalty: float = 0.0
    error_list: List[Dict[str, Any]] = []
    category_counts: Dict[str, int] = {}
    match_count: int = 0
    near_match_count: int = 0
    substitution_count: int = 0
    deletion_count: int = 0
    insertion_count: int = 0
    
    for align_step in alignment_data:
        op_type: Any = align_step.get('op')
        
        if op_type == 'match':
            match_count = match_count + 1
            continue
            
        ref_obj: Any = align_step.get('ref')
        hyp_obj: Any = align_step.get('hyp')
        
        err_entry: Dict[str, Any] = {
            "type": op_type,
            "ref_ph": ref_obj.get('ph') if ref_obj else None,
            "hyp_ph": hyp_obj.get('ph') if hyp_obj else None,
            "ref_idx": align_step.get('ref_idx')
        }
        
        if op_type == 'sub':
            substitution_count = substitution_count + 1
            diag_msg: str = "Pronunciation mismatch"
            category = "substitution_generic"
            tip = "Repeat the target sound slowly and compare with model recitation."
            # Specific diagnoses
            if ref_obj and hyp_obj:
                similarity = _phoneme_similarity(ref_obj, hyp_obj)
                r_type: Any = ref_obj.get('type')
                h_type: Any = hyp_obj.get('type')

                if similarity >= 0.8:
                    near_match_count = near_match_count + 1
                    diag_msg = "Minor pronunciation variation (near match)"
                    category = "near_match"
                    tip = "Small variation only; keep a steady articulation and rhythm."
                    total_penalty = total_penalty + 0.08
                elif similarity >= 0.55:
                    near_match_count = near_match_count + 1
                    diag_msg = "Close phoneme substitution"
                    category = "close_substitution"
                    tip = "Practice this sound pair in short repetition drills."
                    total_penalty = total_penalty + 0.2
                elif r_type == 'vowel' and h_type == 'vowel':
                    if ref_obj.get('length') != hyp_obj.get('length'):
                        diag_msg = f"Vowel length mismatch (expected {ref_obj.get('length')}, heard {hyp_obj.get('length')})"
                        category = "vowel_length_mismatch"
                        tip = "Hold long vowels roughly twice the duration of short vowels."
                        total_penalty = total_penalty + 0.28
                    else:
                        category = "vowel_quality_mismatch"
                        tip = "Refine vowel mouth shape for stable resonance."
                        total_penalty = total_penalty + 0.4
                elif r_type == 'consonant' and h_type == 'consonant':
                    if ref_obj.get('aspiration') != hyp_obj.get('aspiration'):
                        diag_msg = f"Aspiration error (expected {ref_obj.get('aspiration')})"
                        category = "aspiration_mismatch"
                        tip = "Contrast breathy vs non-breathy release with minimal pairs."
                        total_penalty = total_penalty + 0.32
                    elif ref_obj.get('place') != hyp_obj.get('place'):
                        diag_msg = f"Articulation place error (expected {ref_obj.get('place')})"
                        category = "place_mismatch"
                        tip = "Shift tongue placement to the expected articulation point."
                        total_penalty = total_penalty + 0.4
                    else:
                        category = "consonant_substitution"
                        tip = "Repeat the consonant cluster slowly before full-speed chanting."
                        total_penalty = total_penalty + 0.5
                else:
                    category, tip = _error_category_and_tip(ref_obj, hyp_obj)
                    total_penalty = total_penalty + 0.65
            else:
                total_penalty = total_penalty + 0.65
                category, tip = _error_category_and_tip(ref_obj, hyp_obj)
                
            err_entry["description"] = diag_msg
            err_entry["category"] = category
            err_entry["tip"] = tip
            category_counts[category] = int(category_counts.get(category, 0) + 1)
            
        elif op_type == 'del':
            deletion_count = deletion_count + 1
            total_penalty = total_penalty + 0.62
            missing_ph: Any = ref_obj.get('ph') if ref_obj else "?"
            err_entry["description"] = f"Missing sound '{missing_ph}'"
            err_entry["category"] = "deletion"
            err_entry["tip"] = "Do not skip this sound; chant slowly with clear segmentation."
            category_counts["deletion"] = int(category_counts.get("deletion", 0) + 1)
            
        elif op_type == 'ins':
            insertion_count = insertion_count + 1
            total_penalty = total_penalty + 0.12
            extra_ph: Any = hyp_obj.get('ph') if hyp_obj else "?"
            err_entry["description"] = f"Extra sound detected: '{extra_ph}'"
            err_entry["category"] = "insertion"
            err_entry["tip"] = "Avoid adding transitional sounds between syllables."
            category_counts["insertion"] = int(category_counts.get("insertion", 0) + 1)
            
        error_list.append(err_entry)
        
    final_raw_score: float = 100.0 - (total_penalty / float(ref_length) * 100.0)

    # Keep scoring encouraging: partial correctness should still receive visible credit.
    relevance_ratio = (match_count + (0.8 * near_match_count)) / float(ref_length)
    leniency_bonus = min(25.0, (relevance_ratio * 18.0) + (near_match_count * 0.9))
    adjusted_score = final_raw_score + leniency_bonus

    min_relevance_score = 0.0
    if relevance_ratio > 0.0:
        min_relevance_score = 35.0 + (relevance_ratio * 52.0)

    final_score: float = max(0.0, adjusted_score, min_relevance_score)

    # Encourage users strongly when most sounds are correct.
    if relevance_ratio >= 0.75:
        final_score = max(final_score, 90.0)
    if relevance_ratio >= 0.88:
        final_score = max(final_score, 95.0)

    # Penalize word-level mismatches, but soften the deduction when overall
    # recitation consistency is high.
    if word_mismatch_count > 0:
        consistency_ratio = (match_count + (0.7 * near_match_count)) / float(ref_length)
        consistency_factor = max(0.45, 1.05 - (0.6 * consistency_ratio))
        lexical_penalty = min(16.0, float(word_mismatch_count) * 6.0 * consistency_factor)
        final_score = final_score - lexical_penalty

    # Prevent inflated perfect scores for almost-correct attempts while keeping
    # a natural score spread across 90-100 for good recitation.
    # Keep 100 only for truly perfect alignment.
    is_perfect = (
        match_count == ref_length
        and near_match_count == 0
        and len(error_list) == 0
        and word_mismatch_count == 0
    )
    if not is_perfect:
        issue_count = len(error_list)
        issue_ratio = issue_count / float(ref_length)
        near_ratio = near_match_count / float(ref_length)

        # Smoothly lower the maximum achievable score based on detected issues.
        # This avoids a rigid 97/98/99-only band and allows broad 90-99 outcomes.
        deduction = (issue_ratio * 18.0) + (near_ratio * 8.0)
        score_ceiling = max(90.0, 99.6 - deduction)
        final_score = min(final_score, score_ceiling)

    final_score = min(100.0, final_score)

    components = _compute_component_scores(
        alignment_data=alignment_data,
        ref_length=ref_length,
        base_score=final_score,
        word_mismatch_count=word_mismatch_count,
        near_match_count=near_match_count,
        match_count=match_count,
    )
    combined_score = components["component_scores"]["combined_novel"]

    ref_mismatch_count = substitution_count + deletion_count
    
    return {
        "score": int(round(combined_score)),
        "base_pronunciation_score": int(round(final_score)),
        "matches": match_count,
        "near_matches": near_match_count,
        "total_ref": ref_length,
        "errors": error_list,
        "error_summary": category_counts,
        "ref_mismatches": ref_mismatch_count,
        "method": "prosody_explainable_v1",
        "component_scores": components["component_scores"],
        "prosody_metrics": components["prosody_metrics"],
        "confidence": components["confidence"],
        "uncertainty": components["uncertainty"],
        "abstain_recommended": components["abstain_recommended"],
        "op_counts": {
            "sub": substitution_count,
            "del": deletion_count,
            "ins": insertion_count,
        },
    }


# ---------------------------------------------------------------------------
# NEW: Per-phoneme score list — streamed to frontend via WebSocket
# ---------------------------------------------------------------------------

def per_phoneme_scores(alignment_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Return a flat list of per-phoneme alignment scores, indexed by ref_idx.

    Each entry::

        {
            "ref_idx": int | None,
            "ref_ph": str | None,
            "hyp_ph": str | None,
            "score": float,          # 0.0–1.0
            "op": str,               # match | sub | del | ins
            "linguistic_tag": str,   # mahaprana | guru_laghu | place | ...
        }

    The frontend uses ``score`` to colour-code individual Devanagari characters
    and to trigger the Guru Interrupt (score < 0.6).
    """
    result: List[Dict[str, Any]] = []
    for step in alignment_data:
        ref_obj = step.get("ref")
        hyp_obj = step.get("hyp")
        result.append(
            {
                "ref_idx": step.get("ref_idx"),
                "ref_ph": ref_obj.get("ph") if ref_obj else None,
                "hyp_ph": hyp_obj.get("ph") if hyp_obj else None,
                "score": float(step.get("alignment_score", 1.0 if step.get("op") == "match" else 0.0)),
                "op": str(step.get("op", "")),
                "linguistic_tag": step.get("linguistic_tag"),
            }
        )
    return result


# ---------------------------------------------------------------------------
# NEW: Guru-Laghu Duration Ratio — novelty metric for journal Results section
# ---------------------------------------------------------------------------

def compute_guru_laghu_ratio(alignment_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Measure accuracy of Guru (dirgha / long) vs Laghu (hrasva / short) vowels.

    This is the novel metric described in the paper's Results section.
    It is logged separately from the overall score to demonstrate that
    the weighted DTW significantly reduces vowel-length errors.

    Returns::

        {
            "guru_total": int,           # long vowels in reference
            "laghu_total": int,          # short vowels in reference
            "guru_correct": int,
            "laghu_correct": int,
            "guru_accuracy": float,      # 0.0–1.0
            "laghu_accuracy": float,
            "ratio_accuracy": float,     # weighted combined accuracy
            "guru_laghu_errors": int,    # swaps between long↔short
        }
    """
    guru_total = laghu_total = 0
    guru_correct = laghu_correct = 0
    guru_laghu_errors = 0

    for step in alignment_data:
        ref_obj = step.get("ref")
        hyp_obj = step.get("hyp")
        op = step.get("op")

        if not ref_obj or ref_obj.get("type") != "vowel":
            continue

        ref_length = ref_obj.get("length", "")
        is_guru = ref_length == "dirgha"    # long vowel
        is_laghu = ref_length == "hrasva"   # short vowel

        if is_guru:
            guru_total += 1
        elif is_laghu:
            laghu_total += 1
        else:
            continue  # pluta / unknown — skip

        if op == "match":
            if is_guru:
                guru_correct += 1
            else:
                laghu_correct += 1
        elif op == "sub" and hyp_obj and hyp_obj.get("type") == "vowel":
            hyp_length = hyp_obj.get("length", "")
            if ref_length == hyp_length:
                # Same duration class — vowel quality error, not duration error
                if is_guru:
                    guru_correct += 1
                else:
                    laghu_correct += 1
            else:
                # Guru ↔ Laghu swap — the primary metric
                guru_laghu_errors += 1

    def _safe_ratio(num: int, den: int) -> float:
        return round(num / den, 4) if den > 0 else 0.0

    guru_acc = _safe_ratio(guru_correct, guru_total)
    laghu_acc = _safe_ratio(laghu_correct, laghu_total)

    # Weighted average: long vowels carry higher linguistic significance
    total_vowels = guru_total + laghu_total
    if total_vowels > 0:
        ratio_accuracy = round(
            (0.6 * guru_acc * guru_total + 0.4 * laghu_acc * laghu_total) / total_vowels, 4
        )
    else:
        ratio_accuracy = 0.0

    metrics = {
        "guru_total": guru_total,
        "laghu_total": laghu_total,
        "guru_correct": guru_correct,
        "laghu_correct": laghu_correct,
        "guru_accuracy": guru_acc,
        "laghu_accuracy": laghu_acc,
        "ratio_accuracy": ratio_accuracy,
        "guru_laghu_errors": guru_laghu_errors,
    }

    logger.info("[GuruLaghu] %s", metrics)
    return metrics


# ---------------------------------------------------------------------------
# NEW: Weighted Linguistic Penalties for Sanskrit Phonetics
# ---------------------------------------------------------------------------

def _apply_weighted_sanskrit_penalty(ref_obj: Any, hyp_obj: Any, base_penalty: float) -> float:
    """
    Apply 3x penalty multiplier for critical Sanskrit phonetic features:
    - Mahaprana (Aspiration)
    - Retroflexion (Retroflex consonants)
    - Guru-Laghu (Vowel Duration)
    
    Returns adjusted penalty value.
    """
    if not ref_obj or not hyp_obj:
        return base_penalty
    
    penalty = base_penalty
    
    # 3x penalty for aspiration (Mahaprana) errors
    if ref_obj.get("type") == "consonant" and hyp_obj.get("type") == "consonant":
        if ref_obj.get("aspiration") != hyp_obj.get("aspiration"):
            penalty = penalty * 3.0
            logger.debug("[Penalty] Mahaprana error: 3x multiplier applied")
        
        # 3x penalty for retroflexion errors
        place = ref_obj.get("place", "")
        if place in ["retroflex", "cerebral"]:
            if ref_obj.get("place") != hyp_obj.get("place"):
                penalty = penalty * 3.0
                logger.debug("[Penalty] Retroflexion error: 3x multiplier applied")
    
    # 3x penalty for Guru-Laghu (vowel duration) errors
    elif ref_obj.get("type") == "vowel" and hyp_obj.get("type") == "vowel":
        if ref_obj.get("length") != hyp_obj.get("length"):
            penalty = penalty * 3.0
            logger.debug("[Penalty] Guru-Laghu error: 3x multiplier applied")
    
    return penalty


# ---------------------------------------------------------------------------
# NEW: Convert Alignment Errors to Guru Instructions
# ---------------------------------------------------------------------------

def convert_alignment_to_guru_instruction(
    alignment_data: List[Dict[str, Any]],
    ref_phonemes: List[Dict[str, Any]],
    hyp_phonemes: List[Dict[str, Any]],
) -> str:
    """
    Convert alignment errors into a natural "Guru Instruction" for the Shishya.
    
    Analyzes the most critical errors and provides targeted feedback.
    
    Returns a string like:
    "Not quite, Shishya. You missed the aspiration in [Word]. Listen to the expert."
    """
    if not alignment_data:
        return "Well recited, Shishya! Your pronunciation was excellent."
    
    # Collect critical errors
    aspiration_errors = []
    retroflex_errors = []
    guru_laghu_errors = []
    other_errors = []
    
    for step in alignment_data:
        op = step.get("op")
        if op == "match":
            continue
        
        ref_obj = step.get("ref")
        hyp_obj = step.get("hyp")
        ref_idx = step.get("ref_idx")
        
        if ref_idx is None or ref_idx < 0 or ref_idx >= len(ref_phonemes):
            continue
        
        ref_word = ref_phonemes[ref_idx].get("word", "shloka")
        
        # Categorize error
        if ref_obj and hyp_obj:
            if ref_obj.get("type") == "consonant" and hyp_obj.get("type") == "consonant":
                if ref_obj.get("aspiration") != hyp_obj.get("aspiration"):
                    aspiration_errors.append((ref_word, ref_obj, hyp_obj))
                
                if ref_obj.get("place") in ["retroflex", "cerebral"]:
                    if ref_obj.get("place") != hyp_obj.get("place"):
                        retroflex_errors.append((ref_word, ref_obj, hyp_obj))
            
            elif ref_obj.get("type") == "vowel" and hyp_obj.get("type") == "vowel":
                if ref_obj.get("length") != hyp_obj.get("length"):
                    guru_laghu_errors.append((ref_word, ref_obj, hyp_obj))
            
            else:
                other_errors.append((ref_word, ref_obj, hyp_obj))
        
        else:
            other_errors.append((ref_word, ref_obj, hyp_obj))
    
    # Build guru instruction based on error hierarchy
    if aspiration_errors:
        word = aspiration_errors[0][0]
        return f"Not quite, Shishya. You missed the aspiration in '{word}'. Listen to the expert pronunciation."
    
    if retroflex_errors:
        word = retroflex_errors[0][0]
        return f"Close, but not perfect. The retroflex sound in '{word}' requires a different tongue position. Practice slowly."
    
    if guru_laghu_errors:
        word = guru_laghu_errors[0][0]
        ref_length = guru_laghu_errors[0][1].get("length", "unknown")
        if ref_length == "dirgha":
            return f"Remember, Shishya, the vowel in '{word}' should be held longer—about twice as long as a short vowel."
        else:
            return f"The vowel in '{word}' should be shorter. Do not hold it as long."
    
    if other_errors:
        word = other_errors[0][0]
        return f"There are some pronunciation errors in '{word}'. Listen carefully and repeat after the expert."
    
    # Check if mostly correct
    match_count = sum(1 for step in alignment_data if step.get("op") == "match")
    total = len(alignment_data)
    
    if match_count / max(1, total) > 0.95:
        return "Excellent recitation, Shishya! Your pronunciation is nearly perfect. Continue with such devotion."
    
    if match_count / max(1, total) > 0.85:
        return "Good effort, Shishya! Most of your pronunciation is correct. Focus on the difficult sounds."
    
    return "Keep practicing, Shishya. Listen to the reference pronunciation and try again slowly."


# ---------------------------------------------------------------------------
# NEW: Reference Audio Segment Extractor — 200–500ms fragment for Guru Interrupt
# ---------------------------------------------------------------------------

def extract_reference_segment(
    alignment_data: List[Dict[str, Any]],
    ref_audio_path: str,
    phoneme_ref_idx: int,
    window_ms: int = 300,
    sample_rate: int = 16000,
) -> Optional[bytes]:
    """
    Extract a 200–500ms audio fragment centred on ``phoneme_ref_idx`` from the
    expert reference WAV file.  The DTW alignment path provides the timing map.

    The extracted clip is returned as raw PCM bytes (16-bit LE, mono, 16kHz)
    so the backend can stream it directly to the frontend without re-encoding.

    Parameters
    ----------
    alignment_data:
        The full alignment path returned by ``align_phonemes``.
    ref_audio_path:
        Absolute path to the reference WAV (must be 16kHz mono PCM).
    phoneme_ref_idx:
        The ``ref_idx`` of the mispronounced phoneme (from per_phoneme_scores).
    window_ms:
        Width of the audio window to extract, in milliseconds (clamped to 200–500).
    sample_rate:
        Expected sample rate of the reference audio.

    Returns
    -------
    bytes or None
        Raw PCM bytes, or None if the file is unavailable / index out of range.
    """
    window_ms = max(200, min(500, window_ms))

    if not ref_audio_path or not os.path.isfile(ref_audio_path):
        logger.warning("[RefSegment] Reference audio not found: %s", ref_audio_path)
        return None

    try:
        import soundfile as sf  # type: ignore
        import numpy as np

        audio, sr = sf.read(ref_audio_path, dtype="int16")
        if sr != sample_rate:
            logger.warning(
                "[RefSegment] Sample rate mismatch: expected %d, got %d",
                sample_rate, sr,
            )

        # Build a mapping: ref_idx → approximate sample position
        # Each phoneme is assumed to occupy an equal slice of the audio
        # (a proper implementation would use a forced aligner such as
        # Montreal Forced Aligner; this heuristic works for demo purposes).
        ref_indices = [
            step["ref_idx"]
            for step in alignment_data
            if step.get("ref_idx") is not None
        ]

        if not ref_indices:
            return None

        max_ref_idx = max(ref_indices) + 1
        total_samples = len(audio)
        samples_per_phoneme = max(1, total_samples // max_ref_idx)

        centre_sample = phoneme_ref_idx * samples_per_phoneme + samples_per_phoneme // 2
        half_window = int(sample_rate * window_ms / 2000)

        start = max(0, centre_sample - half_window)
        end = min(total_samples, centre_sample + half_window)

        segment = audio[start:end]

        if hasattr(segment, "tobytes"):
            return segment.tobytes()
        return bytes(segment)

    except Exception as exc:
        logger.error("[RefSegment] Extraction failed: %s", exc)
        return None
