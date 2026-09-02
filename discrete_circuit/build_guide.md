# Build Guide — Dual-Tank Water Level Indicator

Step-by-step construction, wiring, and testing guide.

---

## Phase 1: Perfboard Layout Planning

### Recommended Sections (10×15 cm board)

```
    ┌────────────────────────────────────────────────────────────┐
    │                    PERFBOARD LAYOUT                         │
    │  (Component side view)                                     │
    │                                                            │
    │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐    │
    │  │   TANK 1     │  │   TANK 2     │  │   SHARED      │    │
    │  │   PROBES     │  │   PROBES     │  │   CIRCUITS    │    │
    │  │  6× BC547    │  │  6× BC547    │  │               │    │
    │  │  + LEDs      │  │  + LEDs      │  │  Blink Osc    │    │
    │  │              │  │              │  │  Change Det   │    │
    │  └──────────────┘  └──────────────┘  │  Mono Timer   │    │
    │                                       │  Auto-Off     │    │
    │  ┌──────────────┐  ┌──────────────┐  │  Breathing    │    │
    │  │  T1 ALARM    │  │  T2 ALARM    │  │  Buzzer LED   │    │
    │  │  LOGIC       │  │  LOGIC       │  └───────────────┘    │
    │  │  4× BC547    │  │  4× BC547    │                       │
    │  └──────────────┘  └──────────────┘  ┌───────────────┐    │
    │                                       │   POWER       │    │
    │  ┌──────────────┐  ┌──────────────┐  │   SUPPLY      │    │
    │  │  T1 SOUND    │  │  T2 SOUND    │  │   + Switches  │    │
    │  │  Tone Gen    │  │  Tone Gen    │  │               │    │
    │  │  Rate Gen    │  │  Rate Gen    │  │  12V in       │    │
    │  │  8× BC547    │  │  8× BC547    │  │  2.8V out     │    │
    │  └──────────────┘  └──────────────┘  └───────────────┘    │
    │                                                            │
    │  ═══ Ethernet Cable 1    ═══ Ethernet Cable 2              │
    │  (Tank 1)                (Tank 2)                          │
    └────────────────────────────────────────────────────────────┘
```

### Key Layout Rules

1. **Keep probe circuits close to ethernet cable entry points**
2. **Separate analog (probes) from oscillators (tone/rate)** to prevent noise coupling
3. **Run +12V and GND as thick bus lines** along the board edges
4. **Group each tank's circuits together** for easy troubleshooting
5. **Mount LEDs on the front panel**, not on the perfboard (use wires to connect)

---

## Phase 2: Build in Order (Test Each Stage)

### Step 1: Power Supply

**Build first. Test first.**

```
    Solder sequence:
    1. Barrel jack socket → S1 (master switch) → +12V bus
    2. 470µF electrolytic (observe polarity!) + 100nF ceramic across +12V/GND
    3. R1 (33kΩ) + R2 (10kΩ) voltage divider → +2.8V probe supply

    TEST:
    ✓ Plug in 12V adapter
    ✓ S1 ON → measure +12V at bus (should read 11.8–12.2V)
    ✓ Measure probe supply (should read 2.7–2.9V)
    ✓ S1 OFF → both rails should drop to 0V
```

---

### Step 2: First Probe Detection Circuit (Test with 1 LED)

Build ONE probe detection circuit (any level, L2-L6 type) to validate the design with your specific water:

```
    Solder:
    1. R_probe (10kΩ) from probe input pad to Q1 base
    2. R_pd (10kΩ) from Q1 base to GND
    3. Q1 (BC547): Emitter → GND, Collector → LED cathode
    4. LED (any color, anode up) + R_led (1kΩ) to +12V

    TEST:
    ✓ Probes dry → LED OFF
    ✓ Dip both probe wires (common + level) in glass of tap water → LED ON
    ✓ Remove from water → LED OFF within 1 second
    ✓ Measure probe current in water: should be < 0.3mA
    ✓ Measure LED brightness: adequate at 10mA? If dim, reduce R_led to 680Ω

    TROUBLESHOOTING:
    ✗ LED always ON → R_pd missing or wrong value, check for short
    ✗ LED never ON → Check BC547 orientation (flat side faces you: E-B-C left to right)
    ✗ LED dim/flickering → Water too pure, try adding pinch of salt, or use Darlington
```

> **BC547 Pin Identification (TO-92, flat side facing you):**
> ```
>     ┌─────┐
>     │     │  ← Flat side
>     │ BC547│
>     └─┬─┬─┬─┘
>       │ │ │
>       E B C    (Emitter, Base, Collector — left to right)
> ```

---

### Step 3: Build All 12 Probe Circuits

Once Step 2 works, replicate for all 12 probes:

```
    Tank 1: L1 (split version), L2, L3, L4, L5, L6
    Tank 2: L1 (split version), L2, L3, L4, L5, L6

    For L1 (split circuit):
    - Q1a: logic output (collector pull-up 4.7kΩ to +12V)
    - Q1b: LED driver (collector → LED → 1kΩ → +12V)
    - Both bases connected to same probe signal
    - Q1b emitter goes through Q_blink (build later) → then Q_master → GND

    For L2–L6 (standard circuit):
    - Single BC547 per probe
    - Collector → LED → 1kΩ → +12V
    - Emitter → Q_master collector (build later, for now wire to GND)

    TEST:
    ✓ Each probe independently lights correct color LED
    ✓ All 6 LEDs for each tank light when probes submerged in order
```

---

### Step 4: Alarm Logic (Per Tank)

Build the alarm detection for Tank 1 first, then duplicate for Tank 2:

```
    Build sequence:
    1. "At Red" detector:
       a. Q_block: base via 47kΩ from L1_OUT, collector to Q_atred base
       b. Q_atred: base via 47kΩ from L2_OUT, 10kΩ pull-down, collector pull-up 4.7kΩ
       c. Q_atred_inv: base via 47kΩ from Q_atred collector, collector pull-up 4.7kΩ

    2. "At Green" detector:
       a. Q_green_inv: base via 47kΩ from L6_OUT, 10kΩ pull-down, collector pull-up 4.7kΩ

    3. ANY_ALARM OR gate:
       a. 3× 1N4148 diodes from BELOW_RED, AT_RED, AT_GREEN → common node
       b. 10kΩ pull-down on common node

    TEST with glass of water:
    ✓ No probes in water → BELOW_RED = HIGH (~12V), others LOW
    ✓ Only L1 in water → AT_RED = HIGH, BELOW_RED = LOW
    ✓ L1+L2 in water → both LOW (no alarm)
    ✓ All L1-L6 in water → AT_GREEN = HIGH
    ✓ ANY_ALARM goes HIGH for conditions 1, 2, and 4 above
```

---

### Step 5: Tone Generator (Test Buzzer Sound)

```
    Build Tank 1 tone generator:
    1. Astable: Qt1, Qt2 with Rc=1kΩ, Rb=10kΩ, Ct=47nF
    2. Buzzer as Qt2 collector load
    3. Q_tone_en: emitter path switch, tie base HIGH for now (always on)

    TEST:
    ✓ Should hear continuous ~1.5 kHz tone from buzzer
    ✓ Adjust Ct if tone is too high/low (larger C = lower pitch)
    ✓ Ground Q_tone_en base → tone should stop

    Build Tank 2 tone generator with Ct=22nF:
    ✓ Should hear distinctly higher pitch (~3 kHz)
    ✓ Both buzzers sound clearly different ← IMPORTANT
```

---

### Step 6: Rate Generator (Beep Pattern)

```
    Build Tank 1 rate generator:
    1. Astable: Qr1, Qr2 with Rc=4.7kΩ, Cr=10µF
    2. Base timing: R1(18kΩ) + R2(5.6kΩ) + R3(10kΩ) in series
    3. Q_sw1, Q_sw2 across R3 and R2 respectively
    4. Q_rate_en: emitter path switch

    TEST (manually drive switch bases):
    ✓ No switches active: ~2 Hz beeping
    ✓ Q_sw1 ON: ~3 Hz beeping (faster)
    ✓ Q_sw1 + Q_sw2 ON: ~4 Hz beeping (fastest)
    ✓ Ground Q_rate_en base → beeping stops

    Connect rate output to Q_tone_en base:
    ✓ Buzzer should beep at the selected rate with tone frequency
```

---

### Step 7: Connect Alarm Logic to Sound System

```
    Wire connections:
    1. BELOW_RED → Q_sw2 base (via diode + resistor)
    2. BELOW_RED OR AT_RED → Q_sw1 base (via diodes)
    3. ANY_ALARM → Q_rate_en base (via diode)
    4. RATE_OUT → Q_tone_en base (via diode)

    INTEGRATION TEST:
    ✓ Tank empty (no probes in water):
      → BELOW_RED active → 4 Hz beeping at ~1.5kHz ← FAST BEEPS
    ✓ Only L1 in water:
      → AT_RED active → 3 Hz beeping → Red LED blinking
    ✓ L1+L2 in water:
      → No alarm → silence
    ✓ All L1-L6 in water:
      → AT_GREEN active → 2 Hz beeping ← SLOW BEEPS
```

---

### Step 8: Blink Oscillator

```
    Build shared blink oscillator:
    1. Q_b1, Q_b2: astable with Rb=33kΩ, C=10µF (~2Hz)
    2. Q_blink_en: emitter switch, driven by AT_RED_T1 OR AT_RED_T2
    3. Wire BLINK_OUT to Q_blink bases of both tanks (via diodes)
    4. Wire NOT_AT_RED to Q_blink bases (via diodes)

    TEST:
    ✓ Only L1 in water (At Red state): Red LED blinks ~2 times/second
    ✓ L1+L2 in water (normal): Red LED steady ON
    ✓ No probes in water (Below Red): Red LED OFF (not blinking)
```

---

### Step 9: Remaining Shared Circuits

```
    A. CHANGE DETECTOR:
       1. Solder 12× 100nF caps from each PROBE_OUT to summing node
       2. 100kΩ pull-down on summing node
       3. Q_chg: base on summing node, collector pull-up 4.7kΩ

    B. 1-SECOND MONOSTABLE:
       1. D_chg + C_mono (100µF) + R_mono (15kΩ)
       2. Q_mono: collector pull-up 4.7kΩ
       3. Wire CHANGE_BEEP to both Q_tone_en bases (via diodes)

    C. BREATHING POWER LED:
       1. R_charge (220kΩ) + C_breath (47µF)
       2. Q_ef emitter follower + R_e (470Ω) + Blue LED
       3. Q_fb feedback discharge path

    D. AUTO-OFF TIMER:
       1. C_timer (470µF) + R_bleed (330kΩ)
       2. Q_timer with collector pull-up
       3. Power-on trigger: 10µF + 10kΩ to C_timer
       4. Retrigger: D_trig from CHANGE_PULSE
       5. Q_master_T1, Q_master_T2 in LED ground paths
       6. S3 bypass switch

    E. BUZZER LED + TANK INDICATOR LEDs:
       1. Q_buzled driven by ANY_ALARM OR (diodes)
       2. Q_tank1_led, Q_tank2_led driven by CHANGE_BEEP

    TEST:
    ✓ Change any probe state → 1-second beep on both buzzers
    ✓ Tank LEDs light for 1 second on change
    ✓ Breathing LED slowly fades in and out
    ✓ Wait 5+ minutes with no changes → all level LEDs turn off
    ✓ Change a probe → LEDs come back on
    ✓ S3 closed → LEDs always stay on (auto-off bypassed)
```

---

### Step 10: Buzzer Mute Switch

```
    Wire S2 (SPST toggle) between Q_tone_en emitters and GND:
    
    Q_tone_en_T1 emitter ──┐
    Q_tone_en_T2 emitter ──┤── S2 ── GND
    
    TEST:
    ✓ S2 closed: buzzers work normally
    ✓ S2 open: buzzers silent, LEDs still indicate levels
    ✓ Buzzer LED still shows alarm status even when muted
```

---

## Phase 3: Probe Construction

### Materials per Tank

- 1× PVC conduit pipe (20mm, cut to tank height)
- 1× Full-length stainless steel rod (common probe, full tank height)
- 6× Short stainless steel bolts/rods (3cm each, level probes)
- Epoxy or silicone sealant
- 6m Cat5e ethernet cable

### Assembly

```
    1. Mark 6 evenly-spaced positions on the PVC pipe:
    
       ┌───┐
       │   │ ← Top cap (sealed)
       │   ├─ L6 probe hole  ─── Green (highest)
       │   │
       │   ├─ L5 probe hole
       │   │
       │   ├─ L4 probe hole
       │   │
       │   ├─ L3 probe hole
       │   │
       │   ├─ L2 probe hole
       │   │
       │   ├─ L1 probe hole  ─── Red (lowest)
       │   │
       │   │ ← Common rod runs inside full length
       └───┘

    2. Drill holes for each level probe (3mm)
    3. Insert SS bolts, tips protruding ~1.5cm outside the pipe
    4. Seal with epoxy (waterproof from inside)
    5. Solder ethernet cable wires to probe bolts (inside pipe)
    6. Run common rod through center of pipe
    7. Solder White/Orange wire to common rod
    8. Seal top with silicone
    9. Use cable gland where ethernet cable exits pipe top
```

### Probe Spacing Guide

| Tank Height | Spacing Between Probes | L1 Position (from bottom) |
|:------------|:-----------------------|:--------------------------|
| 60 cm       | 8 cm                   | 5 cm                      |
| 100 cm      | 15 cm                  | 5 cm                      |
| 150 cm      | 23 cm                  | 10 cm                     |
| 200 cm      | 30 cm                  | 15 cm                     |

---

## Phase 4: Final Assembly & Enclosure

### Panel Layout

```
    ┌───────────────────────────────────────────────┐
    │                 FRONT PANEL                    │
    │                                               │
    │   TANK 1          TANK 2          STATUS      │
    │   ┌────┐          ┌────┐                      │
    │   │ 🟢 │ L6       │ 🟢 │ L6       ● Power    │
    │   │ 💚 │ L5       │ 💚 │ L5       (breathing) │
    │   │ 🟢 │ L4       │ 🟢 │ L4                   │
    │   │ 🟡 │ L3       │ 🟡 │ L3       ● Buzzer   │
    │   │ 🟠 │ L2       │ 🟠 │ L2       (alarm)    │
    │   │ 🔴 │ L1       │ 🔴 │ L1                   │
    │   └────┘          └────┘                      │
    │   ● T1             ● T2                       │
    │   (blue)           (white)                    │
    │                                               │
    │   [S1 POWER]  [S2 MUTE]  [S3 AUTO-OFF]       │
    │                                               │
    └───────────────────────────────────────────────┘
```

### Wiring Steps

1. **Mount LED bezels** in drilled panel holes (5mm drill)
2. **Mount switches** in panel (6mm drill for toggles)
3. **Wire LEDs** to perfboard using color-coded hookup wire
4. **Route ethernet cables** through cable glands in enclosure bottom
5. **Secure perfboard** with nylon standoffs
6. **Connect barrel jack** to rear panel
7. **Label** the front panel with level numbers and tank names

---

## Phase 5: System Testing Checklist

### A. Power Tests

| Test | Expected | ✓/✗ |
|:-----|:---------|:----|
| 12V at bus with S1 ON | 11.8–12.2V | |
| 2.8V at probe supply | 2.7–2.9V | |
| 0V at both with S1 OFF | 0V | |
| Breathing LED slowly pulsing | ~5 sec cycle | |

### B. Probe Tests (per tank, use glass of water)

| Test | Expected | ✓/✗ |
|:-----|:---------|:----|
| No probes in water | All LEDs off | |
| L1 only in water | Red LED blinks, 3 beeps/sec | |
| L1+L2 in water | Red + Orange steady, no beep | |
| L1+L2+L3 | Red + Orange + Yellow steady | |
| All L1-L6 in water | All 6 LEDs steady, 2 beeps/sec | |
| Remove all probes | All LEDs off, 4 beeps/sec | |

### C. Sound Tests

| Test | Expected | ✓/✗ |
|:-----|:---------|:----|
| Tank 1 alarm tone | ~1.5 kHz pitch | |
| Tank 2 alarm tone | ~3 kHz pitch (different!) | |
| Below Red: fast beeping | 4 beeps/second | |
| At Red: medium beeping | 3 beeps/second | |
| At Green: slow beeping | 2 beeps/second | |
| Level change beep | 1-sec continuous tone | |
| S2 mute ON | Silence (LEDs still work) | |
| S2 mute OFF | Sound returns | |

### D. Feature Tests

| Test | Expected | ✓/✗ |
|:-----|:---------|:----|
| Wait 5+ min, no changes | All level LEDs turn off | |
| Change any probe in auto-off | LEDs come back + 1-sec beep | |
| S3 auto-off bypass | LEDs stay on permanently | |
| Tank indicator LEDs flash on change | 1-sec blue/white flash | |
| Both tanks alarming simultaneously | Different tones, correct rates | |

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|:--------|:-------------|:----|
| LED always ON | Missing pull-down R_pd, or shorted base | Check R_pd (10kΩ to GND) |
| LED never ON | BC547 reversed, dead transistor, no probe voltage | Check orientation (E-B-C), measure 2.8V |
| Weak/flickering LED | High water resistance (pure water) | Add Darlington pair, or add pinch of salt |
| No buzzer sound | S2 open (muted), Q_tone_en not enabled | Check S2, check ANY_ALARM signal |
| Wrong beep rate | Rate switching resistors wrong, Q_sw stuck | Verify R1/R2/R3 values, check Q_sw |
| Auto-off too fast/slow | C_timer or R_bleed tolerance | Adjust R_bleed (↑ for longer, ↓ for shorter) |
| Breathing LED not working | C_breath polarity, Q_ef reversed | Check electrolytic polarity, transistor pins |
| 1-sec beep missing | Change detector caps too small, Q_chg dead | Check 100nF caps, check Q_chg |
| False triggering | Noise coupling, missing decoupling caps | Add 100nF ceramic near oscillator power pins |
| All LEDs dim | Q_master not saturated, high Vce drop | Check AUTO_OFF_EN signal, Q_master base drive |
