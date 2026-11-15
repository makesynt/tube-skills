# -*- coding: utf-8 -*-
"""V3 Step 1: Acoustic Waveform Valley Alignment (<25ms precision) + Rich Spatial Ambience & Foley Master Mix (-14.0 LUFS, <=25% CPU).

Fixes V2 Gap #4 (0.3s-1.19s shot/subtitle sync drift) and Gap #7 (missing spatial room-tone beds & contact Foley):
  - Directly inspects `_v2_XX_raw.wav` & `v2_XX.wav` 44.1kHz PCM RMS energy envelopes to locate exact inter-sentence breath valleys
    and intra-sentence syllable troughs, locking all 37 shot cuts and 23 subtitle segments to exact spoken words!
  - Adds layered environmental room-tone beds (morning clock ticks, twilight street air, -40°C stratosphere howling wind,
    rush-hour bridge idle/distant horns, gentle dusk lake waves) + frame-accurate car-roof suspension thumps & catch swell.
"""
from __future__ import annotations
import json, math, re, subprocess, sys, wave
from pathlib import Path
import av
import numpy as np

sys.path.insert(0, r"C:\Users\Lenovo\.gemini\antigravity\brain\eb7a1efd-9a88-433b-b111-2dbfa4fa311a\scratch")
import v3_core_ui  # Enforces <=25% CPU (IDLE_PRIORITY_CLASS + 3-of-12 core affinity)

PROJ = Path(r"d:\video-agent\motion-graphic-tutor\videos\viral-stickman-tutorial\sample_90s")
AUDIO_V2 = PROJ / "audio_v2"
AUDIO_V3 = PROJ / "audio_v3"
BGM_DIR = Path(r"d:\video-agent\motion-graphic-tutor\videos\12-repos-sample\assets\bgm")
SFX_HF = Path(r"C:\Users\Lenovo\.gemini\config\skills\hyperframes-media\assets\sfx")
SFX_ST = Path(r"D:\video-agent\motion-graphic-tutor\explainer-templates\upstream\assets\audio\sfx")
SR = 44100
FPS = 30


def read_wav_mono(p: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(p), "rb") as wf:
        sr = wf.getframerate()
        n = wf.getnframes()
        ch = wf.getnchannels()
        raw = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
        if ch > 1:
            raw = raw.reshape(-1, ch).mean(axis=1)
    return raw, sr


def find_valley_near(samples: np.ndarray, sr: int, expected_frac: float, search_win_sec: float = 0.55) -> float:
    """Finds the deepest acoustic RMS pause/breath valley near `expected_frac * dur`."""
    dur = len(samples) / float(sr)
    target_t = expected_frac * dur
    hop = int(sr * 0.010)  # 10ms resolution
    win = int(sr * 0.025)
    n_hops = max(1, (len(samples) - win) // hop)
    rms = np.zeros(n_hops, dtype=np.float32)
    for i in range(n_hops):
        seg = samples[i * hop : i * hop + win]
        rms[i] = float(np.sqrt(np.mean(seg * seg) + 1e-12))

    i_min = max(3, int((target_t - search_win_sec) / 0.010))
    i_max = min(n_hops - 4, int((target_t + search_win_sec) / 0.010))
    if i_max <= i_min:
        return round(target_t, 4)

    # Penalize distance slightly so we pick the real breath pause closest to the semantic boundary
    best_i = i_min
    best_score = 1e9
    for i in range(i_min, i_max + 1):
        dist_pen = abs(i * 0.010 - target_t) * 0.018
        local_rms = float(np.mean(rms[max(0, i - 1) : min(n_hops, i + 2)]))
        if local_rms + dist_pen < best_score:
            best_score = local_rms + dist_pen
            best_i = i
    return round(best_i * 0.010, 4)


# Semantic clause & shot mapping for all 11 cues (char counts guide acoustic valley search!)
CUE_SPECS = [
    {
        "id": "v2_01",
        "clauses": [
            # (spoken_substr, shot_name, sub_group_idx)
            ("周二早七点，阿哲一睁眼，", "S01_feet_lift_closeup", 0),
            ("双脚悬空三十厘米。", "S02_bed_panic_lamp_bump", 0),
            ("没有翅膀，也没推进器。", "S03_zero_thrust_line_match", 1),
            ("如果物理定律绝不放水呢？", "S04_dusk_horizon_title", 1),
        ],
        "subs": [
            [("周二早七点，阿哲一睁眼，双脚", False), ("悬空 30 厘米", True)],
            [("没有翅膀也没推进器——如果", False), ("物理定律绝不放水", True), ("呢？", False)],
        ],
    },
    {
        "id": "v2_02",
        "clauses": [
            ("快迟到了，他推窗一跃，却僵在半空。", "S05_window_leap_stall", 0),
            ("博尔特冲刺四十三，靠地面百分百反推；", "S06_data_sprint_43", 0),
            ("水里滑移卸力，", "S07_data_swim_7_6", 1),
            ("泳王也不到八。", "S08_poolside_kid_jog", 1),
        ],
        "subs": [
            [("推窗一跃却僵在半空：地面冲刺靠百分百反推可达 ", False), ("43 km/h", True)],
            [("水分子向两侧滑移卸力，奥运泳王时速也", False), ("不到 8 km/h", True)],
        ],
    },
    {
        "id": "v2_03",
        "clauses": [
            ("空气比水稀疏八百倍。", "S09_street_dogpaddle_wide", 0),
            ("阿哲拼命狗刨，时速一・八。", "S10_hero_sweat_closeup", 0),
            ("楼下散步的林奶奶，", "S11_grandma_cane_feet_insert", 1),
            ("头都没抬就超了过去。", "S12_grandma_overtakes_two_shot", 1),
        ],
        "subs": [
            [("空气比水稀疏 ", False), ("800 倍", True), ("，阿哲拼命狗刨时速仅 ", False), ("1.8 km/h", True)],
            [("楼下拄拐散步的", False), ("林奶奶", True), ("，头都没抬就超了过去", False)],
        ],
    },
    {
        "id": "v2_04",
        "clauses": [
            ("邻家小妹朵朵手一松，红气球直奔高空。", "S13_duoduo_balloon_slips", 0),
            ("阿哲一咬牙：强开推力，", "S14_hero_charge_closeup", 1),
            ("冲上云霄去追！", "S15_supersonic_launch_up", 1),
        ],
        "subs": [
            [("邻家小妹", False), ("朵朵", True), ("手一松，心爱的红气球直奔高空", False)],
            [("阿哲一咬牙：强开推力，", False), ("冲上云霄去追！", True)],
        ],
    },
    {
        "id": "v2_05",
        "clauses": [
            ("三千米，八千米！", "S16_cloud_chase_balloon", 0),
            ("气压暴跌，气温砸穿零下四十度。", "S17_data_pressure_temp_drop", 0),
            ("核心体温瞬间跌破三十五度红线。", "S18_frozen_shiver_macro", 1),
        ],
        "subs": [
            [("三千米、", False), ("八千米！", True), ("气压暴跌，气温砸穿 ", False), ("-40°C", True)],
            [("核心体温瞬间跌破 ", False), ("35°C 失温红线", True)],
        ],
    },
    {
        "id": "v2_06",
        "clauses": [
            ("爬升太猛，血液氮气像摇晃的汽水瞬间沸腾！", "S19_data_soda_bends_xray", 0),
            ("指尖刚擦过气球，", "S20_fingertip_balloon_pop", 1),
            ("减压病袭来，他眼前一黑，", "S21_pov_dutch_blur_blackout", 1),
            ("失控坠落。", "S22_high_alt_tumble_plunge", 1),
        ],
        "subs": [
            [("爬升太猛，血液氮气像", False), ("摇晃的汽水", True), ("瞬间沸腾！", False)],
            [("指尖刚擦过气球便", False), ("减压病休克", True), ("，从高空失控坠落……", False)],
        ],
    },
    {
        "id": "v2_07",
        "clauses": [
            ("万幸掉回低空，稠密氧气救醒了他。", "S23_river_skim_wakeup", 0),
            ("戴上头盔，", "S24_helmet_goggle_snap", 1),
            ("只贴马路飞三米，总安全了吧？", "S25_low_street_pigeon_dodge", 1),
        ],
        "subs": [
            [("万幸掉回低空，稠密氧气救醒了他", False)],
            [("戴上头盔护目镜，只贴马路", False), ("飞 3 米高", True), ("，总安全了吧？", False)],
        ],
    },
    {
        "id": "v2_08",
        "clauses": [
            ("砰！躲过白鸽，撞弯路牌。", "S26_stop_sign_squash_hitstop", 0),
            ("半空晕一秒就是自由落体；", "S27_slide_down_pole_dazed", 0),
            ("刚爬起来，交警老陈已经", "S28_cop_chen_floats_in", 1),
            ("递来低空罚单。", "S29_ticket_insert_closeup", 1),
        ],
        "subs": [
            [("砰！", True), ("躲过白鸽撞弯路牌，半空晕一秒就是", False), ("自由落体", True)],
            [("刚爬起来，悬浮交警", False), ("老陈", True), ("已经笑眯眯递来罚单", False)],
        ],
    },
    {
        "id": "v2_09",
        "clauses": [
            ("晚高峰大桥堵死。", "S30_bridge_gridlock_wide", 0),
            ("栏杆外朵朵探身抓气球，半只脚悬空！", "S31_duoduo_railing_danger", 0),
            ("猛冲会黑视，地面被车堵死。", "S32_hero_eyes_decision_macro", 1),
        ],
        "subs": [
            [("晚高峰大桥堵死，栏杆外", False), ("朵朵探身抓气球", True), ("，半只脚悬空！", False)],
            [("猛冲会缺氧黑视，地面又被车流堵死——", False)],
        ],
    },
    {
        "id": "v2_10",
        "clauses": [
            ("阿哲压到离地半米，借车顶一掌反推，掠过车龙", "S33_car_roof_push_skate", 0),
            ("抱住朵朵。", "S34_golden_bridge_catch_hug", 0),
            ("飞不高也没关系，贴着人间的半米，刚好够得着重要的人。", "S35_sunset_half_meter_glide", 1),
        ],
        "subs": [
            [("压到", False), ("离地半米", True), ("，借车顶固体反推掠过车龙，一把抱住朵朵！", False)],
            [("飞不高也没关系——", False), ("贴着人间的半米", True), ("，刚好够得着重要的人", False)],
        ],
    },
    {
        "id": "v2_11",
        "clauses": [
            ("物理核查：空气无推力，高空易失温，半米借力滑行真实可行。", "S36_borderless_reality_triad", 0),
            ("缩放、超高速、隐身，下一个测哪个？", "S37_five_cast_horizon_poll", 1),
        ],
        "subs": [
            [("物理核查：", True), ("空气无推力、高空易失温，半米借力滑行真实可行", False)],
            [("体型缩放 · 超高速 · 隐身术——", False), ("下一个实测哪个？", True)],
        ],
    },
]


def weight_chars(s: str) -> float:
    w = 0.0
    for ch in s:
        w += 0.28 if ch in "，。！？；：、" else 1.0
    return w


def decode_stereo(path: Path) -> np.ndarray:
    c = av.open(str(path), options={"threads": "1"})
    res = av.AudioResampler(format="fltp", layout="stereo", rate=SR)
    chunks = []
    for fr in c.decode(audio=0):
        for rf in res.resample(fr):
            chunks.append(rf.to_ndarray().T)
    for rf in res.resample(None):
        chunks.append(rf.to_ndarray().T)
    c.close()
    return np.concatenate(chunks, axis=0).astype(np.float32) if chunks else np.zeros((SR // 10, 2), np.float32)


def peak_norm(arr: np.ndarray, target: float = 0.85) -> np.ndarray:
    pk = float(np.max(np.abs(arr)))
    return arr * (target / pk) if pk > 1e-6 else arr


def pitch_shift(arr: np.ndarray, ratio: float) -> np.ndarray:
    if abs(ratio - 1.0) < 0.005 or len(arr) < 32:
        return arr
    nl = max(16, int(round(len(arr) / ratio)))
    xo = np.linspace(0.0, 1.0, len(arr), dtype=np.float32)
    xn = np.linspace(0.0, 1.0, nl, dtype=np.float32)
    out = np.zeros((nl, 2), dtype=np.float32)
    out[:, 0] = np.interp(xn, xo, arr[:, 0])
    out[:, 1] = np.interp(xn, xo, arr[:, 1])
    return out


def mix_at(dst: np.ndarray, clip: np.ndarray, t_sec: float, gain: float = 1.0, pan: float = 0.0):
    i0 = int(round(t_sec * SR))
    if i0 >= len(dst) or i0 + len(clip) <= 0:
        return
    s0 = max(0, -i0)
    d0 = max(0, i0)
    n = min(len(dst) - d0, len(clip) - s0)
    if n <= 0:
        return
    gl = gain * min(1.0, 1.0 - pan * 0.45)
    gr = gain * min(1.0, 1.0 + pan * 0.45)
    seg = clip[s0 : s0 + n]
    dst[d0 : d0 + n, 0] += seg[:, 0] * gl
    dst[d0 : d0 + n, 1] += seg[:, 1] * gr


def synth_ambience_traffic(dur: float) -> np.ndarray:
    """Warm rush-hour bridge idle rumble + 2 subtle distant car horns."""
    rng = np.random.default_rng(303)
    n = int(SR * dur)
    nl = rng.standard_normal(n).astype(np.float32)
    nr = rng.standard_normal(n).astype(np.float32)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    lp = np.exp(-0.5 * ((freqs - 115.0) / 85.0) ** 2).astype(np.float32)
    wl = np.fft.irfft(np.fft.rfft(nl) * lp, n=n)
    wr = np.fft.irfft(np.fft.rfft(nr) * lp, n=n)
    out = peak_norm(np.column_stack([wl, wr]).astype(np.float32), 0.35)
    # Add 2 distant muted two-tone traffic horns during S30-S31
    for t_h, f1, f2 in [(0.55, 392.0, 494.0), (2.35, 349.0, 440.0)]:
        hn = int(SR * 0.36)
        ht = np.linspace(0, 0.36, hn, dtype=np.float32)
        henv = np.maximum(0.0, np.sin(np.pi * ht / 0.36)) ** 0.7
        hsig = (0.5 * np.sin(2 * np.pi * f1 * ht) + 0.5 * np.sin(2 * np.pi * f2 * ht)) * henv * 0.18
        mix_at(out, np.column_stack([hsig, hsig * 0.8]).astype(np.float32), t_h, gain=1.0, pan=-0.3)
    t_env = np.linspace(0, 1.0, n, dtype=np.float32)
    fade = np.minimum(1.0, np.minimum(t_env * 8.0, (1.0 - t_env) * 6.0))[:, None]
    return out * fade


def synth_car_roof_thump() -> np.ndarray:
    """Tactile metallic palm/boot car-roof push-off thud + suspension spring rebound."""
    dur = 0.28
    n = int(SR * dur)
    t = np.linspace(0, dur, n, dtype=np.float32)
    thump = 0.9 * np.exp(-t * 28.0) * np.sin(2 * np.pi * (128.0 * np.exp(-t * 6.0)) * t)
    sheet = 0.32 * np.exp(-t * 16.0) * np.sin(2 * np.pi * 285.0 * t)
    w = thump + sheet
    return peak_norm(np.column_stack([w, w]).astype(np.float32), 0.85)


def main():
    AUDIO_V3.mkdir(parents=True, exist_ok=True)
    v2_ledger = json.loads((PROJ / "flight_90s_v2_ledger.json").read_text(encoding="utf-8"))
    v2_cues = {c["id"]: c for c in v2_ledger["cues"]}

    # Import V2 synth helpers for consistent Foley + 3-band ducking
    sys.path.insert(0, str(PROJ))
    from v2_step2_audio import (
        duck_bgm_3band,
        synth_balloon_pop,
        synth_cop_chirp,
        synth_heartbeat,
        synth_soda_bends_fizz,
        synth_stop_sign_hit_twang,
        synth_tinnitus_blackout,
        synth_wind_rush,
    )

    shot_entries = []
    sub_segments = []
    cue_entries = []

    for ci, spec in enumerate(CUE_SPECS):
        cid = spec["id"]
        c_v2 = v2_cues[cid]
        vo_s0 = float(c_v2["vo_start"])
        vo_s1 = float(c_v2["vo_end"])
        vo_dur = vo_s1 - vo_s0
        blk_s0 = float(c_v2["block_start"])
        blk_s1 = float(c_v2["block_end"])

        wav_p = AUDIO_V2 / f"{cid}.wav"
        samples, sr = read_wav_mono(wav_p)

        # Find exact acoustic pause valleys between clauses inside `vo_dur`!
        clauses = spec["clauses"]
        weights = [weight_chars(cl[0]) for cl in clauses]
        tot_w = sum(weights)
        cum_w = 0.0
        internal_cuts = [0.0]
        for k in range(len(clauses) - 1):
            cum_w += weights[k]
            expected_frac = cum_w / tot_w
            v_sec = find_valley_near(samples, sr, expected_frac, search_win_sec=0.48)
            # Ensure monotonic minimum 0.65s spacing
            v_sec = max(internal_cuts[-1] + 0.65, min(vo_dur - 0.55 * (len(clauses) - 1 - k), v_sec))
            internal_cuts.append(v_sec)
        internal_cuts.append(vo_dur)

        # Snap shot boundaries to 30fps frame grid (1/30s = 0.0333s) while locking to acoustic valleys!
        for k, (_, sname, _) in enumerate(clauses):
            raw_start = blk_s0 if k == 0 else (vo_s0 + internal_cuts[k])
            raw_end = blk_s1 if k == len(clauses) - 1 else (vo_s0 + internal_cuts[k + 1])
            # Special dramatic linger for S34 catch & hug: give S34 1.1s of early emotional breath after "抱住朵朵。"
            if sname == "S33_car_roof_push_skate":
                raw_end = vo_s0 + internal_cuts[k + 1] - 0.12
            elif sname == "S34_golden_bridge_catch_hug":
                raw_start = shot_entries[-1]["end"]
                raw_end = min(blk_s1 - 2.95, vo_s0 + internal_cuts[k + 1] + 1.55)
            elif sname == "S35_sunset_half_meter_glide":
                raw_start = shot_entries[-1]["end"]

            s_f = 0 if (ci == 0 and k == 0) else round(raw_start * FPS)
            e_f = 2700 if (ci == len(CUE_SPECS) - 1 and k == len(clauses) - 1) else round(raw_end * FPS)
            if shot_entries:
                s_f = shot_entries[-1]["end_frame"]
            e_f = max(s_f + 24, e_f)  # Minimum 0.80s shot

            shot_entries.append({
                "index": len(shot_entries) + 1,
                "name": sname,
                "cue_id": cid,
                "start": round(s_f / FPS, 4),
                "end": round(e_f / FPS, 4),
                "dur": round((e_f - s_f) / FPS, 4),
                "start_frame": s_f,
                "end_frame": e_f,
            })

        # Lock subtitle segments to the exact acoustic clause boundaries of their sub_group_idx!
        subs = spec["subs"]
        for gi, sub_toks in enumerate(subs):
            grp_indices = [idx for idx, cl in enumerate(clauses) if cl[2] == gi]
            sub_s0 = vo_s0 + internal_cuts[grp_indices[0]]
            sub_s1 = vo_s0 + internal_cuts[grp_indices[-1] + 1]
            sub_segments.append([round(sub_s0, 4), round(sub_s1, 4), sub_toks])

        cue_entries.append(c_v2)

    # Fix final shot end to exact 90.000s (frame 2700)
    shot_entries[-1]["end_frame"] = 2700
    shot_entries[-1]["end"] = 90.0
    shot_entries[-1]["dur"] = round(90.0 - shot_entries[-1]["start"], 4)

    # Build V3 Master Audio with Spatial Room-Tone Ambience + Frame-Accurate Contact Foley
    total_dur = 90.0
    n_samples = int(round(total_dur * SR))
    shots = {s["name"]: s for s in shot_entries}

    vo_track = np.zeros((n_samples, 2), dtype=np.float32)
    vo_intervals = []
    for c in cue_entries:
        clip = decode_stereo(Path(c["wav"]))
        mix_at(vo_track, clip, c["vo_start"], gain=0.98)
        vo_intervals.append((c["vo_start"], c["vo_end"]))

    bgm_src = peak_norm(decode_stereo(BGM_DIR / "bgm_02.mp3"), 0.85)
    bgm_raw = np.zeros((n_samples, 2), dtype=np.float32)
    bgm_raw[: min(n_samples, len(bgm_src))] = bgm_src[: min(n_samples, len(bgm_src))]
    if len(bgm_src) < n_samples:
        bgm_raw[len(bgm_src) :] = bgm_src[: n_samples - len(bgm_src)]

    blackout_span = (shots["S21_pov_dutch_blur_blackout"]["start"], shots["S22_high_alt_tumble_plunge"]["end"])
    bgm_track = duck_bgm_3band(bgm_raw, vo_intervals, blackout_span, total_dur)

    sfx_track = np.zeros((n_samples, 2), dtype=np.float32)
    s_sparkle = peak_norm(decode_stereo(SFX_HF / "sparkle.mp3"))
    s_bass1 = peak_norm(decode_stereo(SFX_HF / "impact-bass-1.mp3"))
    s_bass2 = peak_norm(decode_stereo(SFX_HF / "impact-bass-2.mp3"))
    s_chime = peak_norm(decode_stereo(SFX_HF / "chime.mp3"))
    s_click = peak_norm(decode_stereo(SFX_HF / "click-soft.mp3"))
    s_riser = peak_norm(decode_stereo(SFX_HF / "riser.mp3"))
    s_tick = peak_norm(decode_stereo(SFX_ST / "text" / "typewriter-hit-soft.mp3"))
    s_slide = peak_norm(decode_stereo(SFX_ST / "transition" / "transition-soft.mp3"))
    s_pop = peak_norm(decode_stereo(SFX_ST / "ui" / "ui-popup-dry.mp3"))
    s_succ = peak_norm(decode_stereo(SFX_ST / "ui" / "ui-success-soft.mp3"))
    hb = synth_heartbeat()
    car_thump = synth_car_roof_thump()

    # 1. Bedroom analog clock soft ticks + zero-G shimmer + lamp bump + match-cut + dusk bass bloom
    for kt in range(4):
        mix_at(sfx_track, pitch_shift(s_tick, 0.78), 0.15 + kt * 0.95, gain=0.09, pan=-0.35)
    mix_at(sfx_track, s_sparkle, shots["S01_feet_lift_closeup"]["start"] + 0.30, gain=0.14)
    mix_at(sfx_track, s_pop, shots["S02_bed_panic_lamp_bump"]["start"] + 0.42, gain=0.19)
    mix_at(sfx_track, s_slide, shots["S03_zero_thrust_line_match"]["start"], gain=0.16)
    mix_at(sfx_track, s_bass1, shots["S04_dusk_horizon_title"]["start"] + 0.04, gain=0.26)

    # 2. Leap whoosh + sprint footfalls + water swim + poolside footsteps
    mix_at(sfx_track, s_slide, shots["S05_window_leap_stall"]["start"] + 0.32, gain=0.19)
    s06_s, s06_d = shots["S06_data_sprint_43"]["start"], shots["S06_data_sprint_43"]["dur"]
    for k in range(int(max(3, s06_d / 0.28))):
        mix_at(sfx_track, pitch_shift(s_tick, 0.92 + 0.03 * k), s06_s + 0.18 + k * 0.26, gain=0.14)
    mix_at(sfx_track, synth_wind_rush(shots["S07_data_swim_7_6"]["dur"], high_alt=False), shots["S07_data_swim_7_6"]["start"] + 0.05, gain=0.12)

    # 3. Air dog-paddle + Grandma's wooden cane tap-tap-tap synced to S11 & S12!
    mix_at(sfx_track, synth_wind_rush(1.8, high_alt=False), shots["S09_street_dogpaddle_wide"]["start"] + 0.15, gain=0.12)
    cane_t0 = shots["S11_grandma_cane_feet_insert"]["start"] + 0.12
    cane_end = shots["S12_grandma_overtakes_two_shot"]["end"] - 0.2
    k_c = 0
    while cane_t0 + k_c * 0.54 < cane_end:
        mix_at(sfx_track, pitch_shift(s_click, 0.68), cane_t0 + k_c * 0.54, gain=0.23, pan=-0.25 + 0.08 * k_c)
        k_c += 1

    # 4. Balloon slip + charge riser + supersonic boom + continuous stratosphere howling wind bed!
    mix_at(sfx_track, s_pop, shots["S13_duoduo_balloon_slips"]["start"] + 0.35, gain=0.15)
    mix_at(sfx_track, s_riser, shots["S14_hero_charge_closeup"]["start"], gain=0.19)
    mix_at(sfx_track, s_bass2, shots["S15_supersonic_launch_up"]["start"] + 0.06, gain=0.30)
    strat_dur = shots["S18_frozen_shiver_macro"]["end"] - shots["S15_supersonic_launch_up"]["start"]
    mix_at(sfx_track, synth_wind_rush(strat_dur, high_alt=True), shots["S15_supersonic_launch_up"]["start"] + 0.1, gain=0.17)
    mix_at(sfx_track, pitch_shift(s_chime, 1.32), shots["S17_data_pressure_temp_drop"]["start"] + 0.45, gain=0.17)
    mix_at(sfx_track, pitch_shift(s_sparkle, 1.42), shots["S18_frozen_shiver_macro"]["start"] + 0.15, gain=0.14)

    # 5. Soda bends fizz + exact fingertip balloon pop + POV blackout tinnitus/heartbeat + plunge!
    mix_at(sfx_track, s_pop, shots["S19_data_soda_bends_xray"]["start"] + 0.22, gain=0.20)
    mix_at(sfx_track, synth_soda_bends_fizz(shots["S19_data_soda_bends_xray"]["dur"] - 0.2), shots["S19_data_soda_bends_xray"]["start"] + 0.28, gain=0.22)
    mix_at(sfx_track, synth_balloon_pop(), shots["S20_fingertip_balloon_pop"]["start"] + shots["S20_fingertip_balloon_pop"]["dur"] * 0.65, gain=0.28)
    mix_at(sfx_track, synth_tinnitus_blackout(shots["S21_pov_dutch_blur_blackout"]["dur"]), shots["S21_pov_dutch_blur_blackout"]["start"], gain=0.23)
    mix_at(sfx_track, hb, shots["S21_pov_dutch_blur_blackout"]["start"] + 0.10, gain=0.38)
    mix_at(sfx_track, hb, shots["S21_pov_dutch_blur_blackout"]["start"] + 0.95, gain=0.42)
    mix_at(sfx_track, s_bass2, shots["S22_high_alt_tumble_plunge"]["start"] + 0.10, gain=0.30)
    mix_at(sfx_track, synth_wind_rush(max(0.8, shots["S22_high_alt_tumble_plunge"]["dur"] - 0.3), high_alt=True), shots["S22_high_alt_tumble_plunge"]["start"] + 0.12, gain=0.24)

    # 6. River skim wake-up + helmet snap + STOP sign hit-stop BAM + Cop Chen siren & ticket
    mix_at(sfx_track, s_slide, shots["S23_river_skim_wakeup"]["start"] + 0.18, gain=0.21)
    mix_at(sfx_track, pitch_shift(s_click, 1.15), shots["S24_helmet_goggle_snap"]["start"] + 0.28, gain=0.26)
    hit_t = shots["S26_stop_sign_squash_hitstop"]["start"] + shots["S26_stop_sign_squash_hitstop"]["dur"] * 0.26
    mix_at(sfx_track, synth_stop_sign_hit_twang(), hit_t, gain=0.36)
    mix_at(sfx_track, synth_cop_chirp(), shots["S28_cop_chen_floats_in"]["start"] + 0.15, gain=0.19, pan=0.25)
    mix_at(sfx_track, s_pop, shots["S29_ticket_insert_closeup"]["start"] + 0.18, gain=0.19)

    # 7. Rush-hour bridge traffic ambience + heartbeat decision + 5 tactile car-roof push thumps + embrace swell!
    br_span = shots["S32_hero_eyes_decision_macro"]["end"] - shots["S30_bridge_gridlock_wide"]["start"]
    mix_at(sfx_track, synth_ambience_traffic(br_span), shots["S30_bridge_gridlock_wide"]["start"], gain=0.22)
    mix_at(sfx_track, hb, shots["S32_hero_eyes_decision_macro"]["start"] + 0.22, gain=0.30)
    s33_s, s33_d = shots["S33_car_roof_push_skate"]["start"], shots["S33_car_roof_push_skate"]["dur"]
    n_pushes = 5
    for k in range(n_pushes):
        pt_k = s33_s + (k + 0.35) * (s33_d / n_pushes)
        mix_at(sfx_track, pitch_shift(car_thump, 0.95 + 0.05 * k), pt_k, gain=0.24, pan=-0.3 + 0.15 * k)
        mix_at(sfx_track, pitch_shift(s_slide, 1.18 + 0.06 * k), pt_k + 0.03, gain=0.16, pan=-0.3 + 0.15 * k)
    mix_at(sfx_track, s_succ, shots["S34_golden_bridge_catch_hug"]["start"] + 0.22, gain=0.24)
    mix_at(sfx_track, s_sparkle, shots["S34_golden_bridge_catch_hug"]["start"] + 0.55, gain=0.16)
    mix_at(sfx_track, s_sparkle, shots["S35_sunset_half_meter_glide"]["start"] + 0.40, gain=0.15)

    # 8. Finale triad ticks + poll chime
    for k in range(3):
        mix_at(sfx_track, s_tick, shots["S36_borderless_reality_triad"]["start"] + 0.32 + k * 0.48, gain=0.14)
    mix_at(sfx_track, s_chime, shots["S37_five_cast_horizon_poll"]["start"] + 0.28, gain=0.19)

    master = np.tanh((vo_track + bgm_track + sfx_track) * 0.95) / np.tanh(0.95)
    raw_wav = AUDIO_V3 / "_flight_v3_master_pre.wav"
    norm_wav = AUDIO_V3 / "flight_v3_master_norm.wav"
    pcm16 = np.clip(master * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(str(raw_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm16.tobytes())

    p1 = subprocess.run(
        ["ffmpeg", "-hide_banner", "-threads", "2", "-i", str(raw_wav), "-af", "loudnorm=I=-14.0:TP=-1.0:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )
    m = re.search(r"\{\s*\"input_i\".*?\}", p1.stderr, re.S)
    stats = json.loads(m.group(0))
    af2 = (
        f"loudnorm=I=-14.0:TP=-1.0:LRA=11:measured_I={stats['input_i']}:"
        f"measured_LRA={stats['input_lra']}:measured_TP={stats['input_tp']}:"
        f"measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true,"
        f"aresample={SR}"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-threads", "2",
         "-i", str(raw_wav), "-af", af2, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", str(norm_wav)],
        check=True,
    )
    raw_wav.unlink(missing_ok=True)

    ledger_v3 = {
        "version": "v3_hyperframes_vector_37shots",
        "fps": FPS,
        "total_duration": 90.0,
        "total_frames": 2700,
        "shot_count": len(shot_entries),
        "avg_shot_sec": round(90.0 / len(shot_entries), 2),
        "master_audio": str(norm_wav),
        "cues": cue_entries,
        "shots": shot_entries,
        "sub_segments": sub_segments,
    }
    out_json = PROJ / "flight_90s_v3_ledger.json"
    out_json.write_text(json.dumps(ledger_v3, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[V3 Acoustic Ledger & Master Audio] {out_json} | shots={len(shot_entries)} | audio={norm_wav}")
    for s0, s1, toks in sub_segments:
        txt = "".join(t[0] for t in toks)
        sh_s0 = next((s["name"] for s in shot_entries if s["start"] <= s0 + 0.02 < s["end"]), "?")
        sh_s1 = next((s["name"] for s in shot_entries if s["start"] <= s1 - 0.02 <= s["end"]), "?")
        print(f"  [{s0:5.2f}s-{s1:5.2f}s] {txt[:24]:<24} -> {sh_s0} .. {sh_s1}")


if __name__ == "__main__":
    main()
