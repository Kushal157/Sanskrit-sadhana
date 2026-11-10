"""
alignment.py — Phoneme-level alignment via Dynamic Time Warping.

Linguistic Weight Matrix (Guru-Shishya specification):
  - Mahaprana (aspiration) mismatch: base 0.5 → weighted 1.5 (×3)
  - Guru/Laghu vowel duration mismatch: base 0.4 → weighted 1.2 (×3)
  - Place-of-articulation mismatch: base 0.8 (unchanged)
  - Voicing mismatch: base 0.5 (unchanged)
  - Cross-class (vowel↔consonant): 2.0 (unchanged)
"""

from typing import Any, List, Dict, Optional, no_type_check
import numpy as np

# ---------------------------------------------------------------------------
# Linguistic Weight Matrix constants
# ---------------------------------------------------------------------------
_W_MAHAPRANA   = 1.5   # aspiration deviation (3× base 0.5)
_W_GURU_LAGHU  = 1.2   # vowel-duration deviation (3× base 0.4)
_W_PLACE       = 0.8   # place-of-articulation deviation (unchanged)
_W_VOICING     = 0.5   # voicing deviation (unchanged)
_W_CROSS_CLASS = 2.0   # vowel ↔ consonant (unchanged)
_W_MISSING     = 2.0   # one phoneme is None


def phoneme_distance(p1: Any, p2: Any) -> float:
    """
    Linguistically-weighted distance between two phoneme feature dicts.

    Returns a value in [0.0, 2.0]:
      0.0 → identical phoneme
      2.0 → maximally distant (cross-class or missing)
    """
    if not p1 or not p2:
        return _W_MISSING

    ph1: Optional[str] = p1.get("ph")
    ph2: Optional[str] = p2.get("ph")

    if ph1 == ph2:
        return 0.0

    # Cross-class substitution (vowel ↔ consonant) — maximum penalty
    if p1.get("type") != p2.get("type"):
        return _W_CROSS_CLASS

    dist_cost: float = 0.0

    # Place-of-articulation mismatch
    if p1.get("place") != p2.get("place"):
        dist_cost += _W_PLACE

    # --- Linguistically elevated penalties (×3) ---

    # Mahaprana / Alpaprana aspiration contrast
    if p1.get("aspiration") != p2.get("aspiration"):
        dist_cost += _W_MAHAPRANA   # was 0.5, now 1.5

    # Guru (dirgha) / Laghu (hrasva) vowel duration contrast
    if p1.get("length") != p2.get("length"):
        dist_cost += _W_GURU_LAGHU  # was 0.4, now 1.2

    # Voicing contrast (unchanged)
    if p1.get("voicing") != p2.get("voicing"):
        dist_cost += _W_VOICING

    return min(dist_cost, 2.0)


def phoneme_score(p1: Any, p2: Any) -> float:
    """
    Convenience wrapper: returns a similarity score in [0.0, 1.0].
    Used by the WebSocket streamer to colour-code the Devanagari display.
    """
    dist = phoneme_distance(p1, p2)
    return max(0.0, 1.0 - dist / 2.0)


@no_type_check
def align_phonemes(
    ref_seq: List[Any],
    hyp_seq: List[Any],
) -> List[Dict[str, Any]]:
    """
    Align ref and hyp phoneme sequences using linguistically-weighted DTW.

    Each step in the returned path includes an ``alignment_score`` field
    in [0, 1] that the frontend uses for real-time Devanagari highlighting:
      ≥ 0.8  → Green  (accurate)
      0.6–0.8 → Yellow/Orange (near miss)
      < 0.6  → Red   (triggers Guru Interrupt)
    """
    n_ref: int = len(ref_seq)
    m_hyp: int = len(hyp_seq)

    # Fill DTW cost matrix
    dtw_matrix = np.full((n_ref + 1, m_hyp + 1), 999.0, dtype=float)
    dtw_matrix[0, 0] = 0.0

    for i in range(1, n_ref + 1):
        for j in range(1, m_hyp + 1):
            base_cost: float = phoneme_distance(ref_seq[i - 1], hyp_seq[j - 1])
            dtw_matrix[i, j] = base_cost + min(
                dtw_matrix[i - 1, j],       # deletion
                dtw_matrix[i, j - 1],       # insertion
                dtw_matrix[i - 1, j - 1],   # match / substitution
            )

    # Backtrack
    idx_i: int = n_ref
    idx_j: int = m_hyp
    alignment_path: List[Dict[str, Any]] = []

    while idx_i > 0 or idx_j > 0:
        if idx_i > 0 and idx_j > 0:
            costs: List[float] = [
                dtw_matrix[idx_i - 1, idx_j - 1],
                dtw_matrix[idx_i - 1, idx_j],
                dtw_matrix[idx_i, idx_j - 1],
            ]
            best_move: int = int(np.argmin(costs))

            if best_move == 0:  # Match / Substitution
                step_dist: float = phoneme_distance(
                    ref_seq[idx_i - 1], hyp_seq[idx_j - 1]
                )
                operation: str = "match" if step_dist == 0.0 else "sub"
                step_score: float = phoneme_score(
                    ref_seq[idx_i - 1], hyp_seq[idx_j - 1]
                )
                # Identify which linguistic dimension caused the error
                linguistic_tag: Optional[str] = _get_linguistic_tag(
                    ref_seq[idx_i - 1], hyp_seq[idx_j - 1], step_dist
                )
                alignment_path.append(
                    {
                        "op": operation,
                        "ref": ref_seq[idx_i - 1],
                        "hyp": hyp_seq[idx_j - 1],
                        "ref_idx": idx_i - 1,
                        "alignment_score": round(step_score, 4),
                        "linguistic_tag": linguistic_tag,
                    }
                )
                idx_i, idx_j = idx_i - 1, idx_j - 1

            elif best_move == 1:  # Deletion
                alignment_path.append(
                    {
                        "op": "del",
                        "ref": ref_seq[idx_i - 1],
                        "hyp": None,
                        "ref_idx": idx_i - 1,
                        "alignment_score": 0.0,
                        "linguistic_tag": "deletion",
                    }
                )
                idx_i -= 1

            else:  # Insertion
                alignment_path.append(
                    {
                        "op": "ins",
                        "ref": None,
                        "hyp": hyp_seq[idx_j - 1],
                        "ref_idx": None,
                        "alignment_score": 0.0,
                        "linguistic_tag": "insertion",
                    }
                )
                idx_j -= 1

        elif idx_i > 0:
            alignment_path.append(
                {
                    "op": "del",
                    "ref": ref_seq[idx_i - 1],
                    "hyp": None,
                    "ref_idx": idx_i - 1,
                    "alignment_score": 0.0,
                    "linguistic_tag": "deletion",
                }
            )
            idx_i -= 1
        else:
            alignment_path.append(
                {
                    "op": "ins",
                    "ref": None,
                    "hyp": hyp_seq[idx_j - 1],
                    "ref_idx": None,
                    "alignment_score": 0.0,
                    "linguistic_tag": "insertion",
                }
            )
            idx_j -= 1

    alignment_path.reverse()
    return alignment_path


def _get_linguistic_tag(
    ref: Any, hyp: Any, dist: float
) -> Optional[str]:
    """
    Label the dominant phonetic error dimension for Guru Interrupt tips.
    Priority: mahaprana > guru_laghu > place > voicing > generic
    """
    if dist == 0.0 or not ref or not hyp:
        return None

    if ref.get("type") != hyp.get("type"):
        return "cross_class"

    if ref.get("aspiration") != hyp.get("aspiration"):
        return "mahaprana"   # highest-weighted error

    if ref.get("length") != hyp.get("length"):
        return "guru_laghu"  # second-highest weighted

    if ref.get("place") != hyp.get("place"):
        return "place"

    if ref.get("voicing") != hyp.get("voicing"):
        return "voicing"

    return "generic"
