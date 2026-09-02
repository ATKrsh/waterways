# Dual-Tank 6-Level Water Level Indicator — Complete Circuit Design

> **All-discrete design using BC547 NPN transistors, resistors, capacitors, LEDs, 1N4148 diodes, and passive piezo buzzers only. No ICs.**

---

## 1. System Specifications

| Parameter              | Value                                         |
|:-----------------------|:----------------------------------------------|
| Supply Voltage         | 12V DC, 1.5A adapter                          |
| Probe Voltage          | ~2.8V DC (safe, via resistor divider)          |
| Tanks                  | 2 (independent monitoring)                     |
| Levels per Tank        | 6 (Red → Orange → Yellow → Lime → Lt Green → Green) |
| Probes per Tank        | 7 (6 level + 1 common)                         |
| Probe Cable            | Cat5e ethernet, 6m per tank                    |
| Total LEDs             | 17 (12 level + 2 tank + 1 power + 1 buzzer + 1 spare) |
| Buzzers                | 2 passive piezo (different frequencies)         |
| Switches               | 3 (Master, Buzzer Mute, Auto-Off Toggle)        |
| Total BC547            | ~55                                             |
| Total 1N4148 Diodes    | ~20                                             |
| Max Current Draw       | ~400 mA (well within 1.5A)                      |

---

## 2. Power Supply

```
          ┌─────────────────────────────────────────────────────┐
          │  POWER SUPPLY                                       │
          └─────────────────────────────────────────────────────┘

  12V DC ──── S1 (Master Switch) ──┬── +12V RAIL ──────────────────────┐
  Adapter         (SPST Toggle)    │                                    │
                                   │   ┌────────────────┐               │
    GND ───────────────────────────┤   │  DECOUPLING     │               │
                                   │   │                │               │
                                   ├───┤─ [470µF] ─ GND │               │
                                   │   │─ [100nF] ─ GND │               │
                                   │   └────────────────┘               │
                                   │                                    │
                                   │   ┌────────────────────────┐       │
                                   │   │  PROBE VOLTAGE DIVIDER  │       │
                                   │   │                        │       │
                                   ├───┤── [R1 33kΩ] ──┬── +2.8V PROBE SUPPLY
                                   │   │               │        │       │
                                   │   │             [R2 10kΩ]  │       │
                                   │   │               │        │       │
                                   │   │              GND       │       │
                                   │   └────────────────────────┘       │
                                   │                                    │
                                  GND                                  +12V
```

| Component | Value   | Purpose                              |
|:----------|:--------|:-------------------------------------|
| S1        | SPST    | Master power switch                  |
| C1        | 470µF/25V | Main decoupling (electrolytic)     |
| C2        | 100nF   | High-frequency noise filter (ceramic)|
| R1        | 33kΩ    | Probe voltage divider upper          |
| R2        | 10kΩ    | Probe voltage divider lower          |

**Probe voltage**: V_probe = 12 × 10k / (33k + 10k) = **2.79V** — safe for water contact.

---

## 3. Probe Detection & LED Driver — Standard Cell (×10)

This identical circuit is used for **Level 2 through Level 6** of **both tanks** (10 circuits total). Level 1 has a modified version (Section 4).

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  PROBE DETECTION — STANDARD CELL                                     │
  │  (Repeat for L2, L3, L4, L5, L6 of each tank)                       │
  └──────────────────────────────────────────────────────────────────────┘

    +2.8V (Probe Supply)                    +12V
        │                                     │
   Common Probe                           [R_led 1kΩ]
   (in water)                                 │
        │                                  ┌──┴──┐
        ≈  ← Water resistance              │ LED │ (Level color)
        │     (2kΩ–20kΩ typical)           └──┬──┘
        │                                     │
   Level Probe ──[R_probe 10kΩ]──┬────────────┤ ← PROBE_OUT
                                  │            │     (to alarm logic)
                                  │          C(Q1)
                                [R_pd 10kΩ]    │
                                  │         B(Q1) ← BC547
                                  │            │
                                 GND        E(Q1)
                                              │
                                             GND *
                                     (* via Q_master for auto-off)

    Signal Path: Water bridges probes → current into Q1 base → Q1 ON → LED lights
    Logic Output: PROBE_OUT = LOW (≈0.2V) when water present, HIGH (≈12V) when dry
```

| Component | Value  | Purpose                                            |
|:----------|:-------|:---------------------------------------------------|
| R_probe   | 10kΩ   | Limits probe current (~140µA in water). Safety.     |
| R_pd      | 10kΩ   | Pull-down. Ensures Q1 OFF when probe is dry.        |
| R_led     | 1kΩ    | LED current limiter. I ≈ (12−2−0.2)/1k = **9.8mA** |
| Q1        | BC547  | Switch. hFE ≥ 110 @ 10mA ensures saturation.       |
| LED       | 5mm    | Color per level (see table below)                   |

### Base Current Check (worst-case: 20kΩ water resistance)

```
  I_base = V_probe / (R_probe + R_water) = 2.8V / (10kΩ + 20kΩ) = 93µA
  I_LED  = 9.8mA
  Required hFE = I_LED / I_base = 9.8mA / 93µA = 105
  BC547 minimum hFE @ 10mA = 110  ✓  (saturates reliably)
```

### LED Color Assignment

| Level | Color       | LED Part         | Tank Position |
|:------|:------------|:-----------------|:--------------|
| L1    | 🔴 Red       | Red 5mm          | Lowest        |
| L2    | 🟠 Orange    | Orange 5mm       | ↑             |
| L3    | 🟡 Yellow    | Yellow 5mm       | ↑             |
| L4    | 🟢 Lime      | Lime Green 5mm   | ↑             |
| L5    | 💚 Lt Green  | Light Green 5mm  | ↑             |
| L6    | 🟩 Green     | Green 5mm        | Highest       |

---

## 4. Level 1 (Red) — Split Circuit for Blink Feature (×2)

Level 1 (Red) needs special treatment because the LED must **blink** when water is at the red level. The probe detection is split into two transistors: one for logic, one for LED.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  LEVEL 1 (RED) — SPLIT DETECTION + BLINK                            │
  │  (1 circuit per tank)                                                │
  └──────────────────────────────────────────────────────────────────────┘

    Level 1 Probe ──[R_probe 10kΩ]──┬──[R_pd 10kΩ]── GND
                                     │
                          ┌──────────┴──────────┐
                          │                      │
                     LOGIC PATH              LED PATH
                          │                      │
                       B(Q1a)                 B(Q1b)
                          │                      │
    +12V ──[R_pu 4.7kΩ]──┤                  +12V──[R_led 1kΩ]
                          │                      │
                       C(Q1a) → L1_OUT        ┌──┴──┐
                          │     (to alarm      │ LED │ Red
                       E(Q1a)    logic)        └──┬──┘
                          │                      │
                         GND                  C(Q1b)
                                                 │
                                              E(Q1b)
                                                 │
                                              C(Q_blink) ← BLINK GATE
                                                 │
                                              E(Q_blink)
                                                 │
                                                GND *
                                        (* via Q_master for auto-off)

    Q_blink gate base: driven by (NOT_AT_RED) OR (blink_oscillator_output)
    ─────────────────
    When NOT "At Red": Q_blink always ON → Red LED steady (normal display)
    When "At Red":     Q_blink toggles with blink oscillator → Red LED blinks
```

| Component  | Value  | Purpose                                     |
|:-----------|:-------|:--------------------------------------------|
| Q1a        | BC547  | Logic-only detector (collector → alarm)      |
| Q1b        | BC547  | LED driver (separate from logic)             |
| Q_blink    | BC547  | Blink gate (in series with LED ground path)  |
| R_pu       | 4.7kΩ  | Collector pull-up for Q1a (logic output)     |
| R_probe    | 10kΩ   | Same as standard cell                        |
| R_pd       | 10kΩ   | Same as standard cell                        |
| R_led      | 1kΩ    | Same as standard cell                        |

### Q_blink Gate Drive

```
                        NOT_AT_RED ──[D1 1N4148]──┐
                                                    │
    Blink Oscillator ──[D2 1N4148]──┤── [10kΩ] ── GND
         Output                      │
                               B(Q_blink)

    NOT_AT_RED = Q_atred collector (HIGH when At Red is NOT active)
    When At Red NOT active: D1 conducts → Q_blink ON → LED steady
    When At Red active: D1 blocks → Q_blink toggled by blink oscillator → LED blinks
```

---

## 5. Blink Oscillator (~2 Hz, Shared)

A standard **astable multivibrator** running at ~2 Hz, shared between both tanks. Powered only when "At Red" is active for either tank.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  BLINK OSCILLATOR — ~2 Hz  (Shared between tanks)                    │
  └──────────────────────────────────────────────────────────────────────┘

                    +12V                          +12V
                     │                              │
                  [Rc1 4.7kΩ]                   [Rc2 4.7kΩ]
                     │                              │
               ┌── C(Q_b1) ──[C1 10µF]──── B(Q_b2) ──┐
               │     │                        │       │
               │  E(Q_b1)                  E(Q_b2)    │
               │     │                        │       │
               │     └────────┬───────────────┘       │
               │              │                       │
               │        C(Q_blink_en)                 │
               │              │                       │
               │        E(Q_blink_en)                 │
               │              │                       │
               │             GND                      │
               │                                      │
               └──[C2 10µF]──── B(Q_b1) ──────── C(Q_b2) ──┘
                                 │                    │
                              [Rb1 33kΩ]          [Rb2 33kΩ]
                                 │                    │
                               +12V                 +12V

    Q_b2 collector → BLINK_OUT (to Q_blink gate of both tanks)

    Q_blink_en base: AT_RED_T1 ──[D3]──┐
                     AT_RED_T2 ──[D4]──┤── [10kΩ] ── GND
                                        │
                                  B(Q_blink_en)

    f = 1 / (1.4 × 33kΩ × 10µF) = 1 / 0.462 = ~2.2 Hz
```

| Component   | Value   | Purpose                           |
|:------------|:--------|:----------------------------------|
| Q_b1, Q_b2  | BC547   | Astable oscillator pair           |
| Q_blink_en  | BC547   | Enable switch (powers oscillator) |
| Rc1, Rc2    | 4.7kΩ   | Collector loads                   |
| Rb1, Rb2    | 33kΩ    | Timing resistors                  |
| C1, C2      | 10µF    | Timing capacitors                 |
| D3, D4      | 1N4148  | OR gate for enable                |

---

## 6. Alarm Logic — Per Tank (×2)

Detects three mutually exclusive alarm conditions. **Since water fills from bottom up**, only L1, L2, and L6 probes need to be checked:

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  ALARM LOGIC — PER TANK                                              │
  │  Inputs:  L1_OUT (from L1 probe),  L2 PROBE_OUT,  L6 PROBE_OUT      │
  │  Outputs: BELOW_RED, AT_RED, AT_GREEN, NOT_AT_RED, ANY_ALARM         │
  └──────────────────────────────────────────────────────────────────────┘
```

### 6A. BELOW RED Detection (Tank Empty — L1 dry)

```
    L1_OUT ──────────────────────────── BELOW_RED (Active HIGH)
    (Q1a collector)
    HIGH when L1 dry (no water at lowest probe)

    ► No extra transistors needed — signal used directly
    ► BELOW_RED = HIGH → triggers 4 beeps/sec alarm
```

### 6B. AT RED Detection (L1 wet, L2 dry — critically low)

```
    L1_OUT                  L2 PROBE_OUT
    (LOW when wet)          (HIGH when dry)
        │                        │
     [47kΩ]                   [47kΩ]
        │                        │
     B(Q_block)               B(Q_atred)──[10kΩ]── GND
        │                        │
     C(Q_block)────────────── B(Q_atred) ← (clamp)
        │                        │
     E(Q_block)               C(Q_atred)──[4.7kΩ]── +12V
        │                        │
       GND                    E(Q_atred)     │
                                 │           ├── NOT_AT_RED (Active HIGH)
                                GND          │   (to blink gate)
                                             │
                                          [47kΩ]
                                             │
                                          B(Q_atred_inv)
                                             │
                    +12V ──[4.7kΩ]── C(Q_atred_inv) ── AT_RED (Active HIGH)
                                             │
                                          E(Q_atred_inv)
                                             │
                                            GND

    Logic:
    ─────
    L1 WET (L1_OUT = LOW):   Q_block OFF → Q_atred base free
    L1 DRY (L1_OUT = HIGH):  Q_block ON  → clamps Q_atred base to ~0.2V → Q_atred OFF

    L2 DRY (PROBE_OUT = HIGH): drives Q_atred ON (if not clamped by Q_block)
    L2 WET (PROBE_OUT = LOW):  Q_atred OFF

    Result: Q_atred ON only when L1 wet AND L2 dry = "At Red"
    Q_atred collector = LOW when At Red (active LOW) → Q_atred_inv inverts to AT_RED (active HIGH)
    Q_atred collector = HIGH when NOT At Red → NOT_AT_RED (used for blink gate)
```

| Component    | Value  | Purpose                          |
|:-------------|:-------|:---------------------------------|
| Q_block      | BC547  | Disables Q_atred when L1 is dry  |
| Q_atred      | BC547  | AND gate output (active LOW)     |
| Q_atred_inv  | BC547  | Inverter → AT_RED active HIGH    |

### 6C. AT GREEN Detection (Tank Full — L6 wet)

```
    L6 PROBE_OUT
    (LOW when wet)
        │
     [47kΩ]
        │
     B(Q_green_inv)──[10kΩ]── GND
        │
  +12V──[4.7kΩ]── C(Q_green_inv) ── AT_GREEN (Active HIGH)
        │
     E(Q_green_inv)
        │
       GND

    L6 wet → PROBE_OUT LOW → Q_green_inv OFF → AT_GREEN = HIGH (pulled up) ✓
    L6 dry → PROBE_OUT HIGH → Q_green_inv ON → AT_GREEN = LOW ✓
```

> **Note**: This is a simple inverter. PROBE_OUT is LOW when wet (transistor ON pulls collector LOW), so the inverter gives HIGH when wet.

Wait — let me re-examine. L6 PROBE_OUT comes from the L6 probe detection transistor's collector:
- L6 wet → L6 probe transistor ON → L6 collector LOW (0.2V)
- L6 dry → L6 probe transistor OFF → L6 collector HIGH (~12V)

So the inverter:
- L6 collector LOW → Q_green_inv OFF → AT_GREEN collector HIGH ✓ (full tank)
- L6 collector HIGH → Q_green_inv ON → AT_GREEN collector LOW ✓ (not full)

Correct! ✓

### 6D. ANY_ALARM (Diode OR Gate)

```
    BELOW_RED ──[D_br 1N4148]──┐
                                 │
    AT_RED    ──[D_ar 1N4148]──┤──[10kΩ]── GND
                                 │
    AT_GREEN  ──[D_ag 1N4148]──┤
                                 │
                          ANY_ALARM (Active HIGH)
                          (to tone/rate enable circuits)
```

### Complete Alarm Logic Per Tank — Transistor Count

| Component       | Qty | Purpose              |
|:----------------|:----|:---------------------|
| Q_block         | 1   | L1 clamp             |
| Q_atred         | 1   | At Red detect        |
| Q_atred_inv     | 1   | At Red inverter      |
| Q_green_inv     | 1   | At Green detect      |
| 1N4148 Diodes   | 3   | ANY_ALARM OR gate    |
| **Per tank**    | **4 transistors, 3 diodes** |  |
| **Both tanks**  | **8 transistors, 6 diodes** |  |

---

## 7. Sound System — Tone Generator (×2, one per tank)

Each tank has its own **astable multivibrator** producing a unique audio frequency. The buzzer is the collector load of Q2, so no separate driver transistor is needed.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  TONE GENERATOR — TANK 1 (~1 kHz)                                   │
  │  Tank 2 uses same topology with different C values for ~2.5 kHz      │
  └──────────────────────────────────────────────────────────────────────┘

              +12V                           +12V
               │                               │
            [Rc 1kΩ]                      ┌────┴────┐
               │                          │ BUZZER  │ (Passive Piezo)
         ┌── C(Qt1) ──[Ct1]──── B(Qt2) ──┤ BZ1     │
         │     │                    │     └────┬────┘
         │  E(Qt1)               [Rb_t 10kΩ]    │
         │     │                    │        C(Qt2)
         │     └───────┬────────── +12V        │
         │             │                    E(Qt2)
         │       C(Q_tone_en)                  │
         │             │                       │
         │       E(Q_tone_en)                  └──── (tied to Q_tone_en)
         │             │                              collector node
         │            GND                              below
         │                                             │
         └──[Ct2]──── B(Qt1)                           │
                        │                              │
                     [Rb_t 10kΩ]                       │
                        │                              │
                      +12V                             │
                                                       │
                                              E(Qt2) ──┘
                                                │
                                          C(Q_tone_en) ← ENABLE
                                                │
                                          E(Q_tone_en)
                                                │
                                               GND

    Q_tone_en: Enables/disables entire tone generator
    Base driven by: RATE_GATE_OUTPUT ──[D]──┐
                    CHANGE_BEEP ────[D]──┤── [10kΩ] ── GND
                                          │
                                    B(Q_tone_en)
```

**Simplified schematic view:**

```
                +12V            +12V
                 │                │
              [Rc 1kΩ]        [BUZZER]
                 │                │
    ┌─── C(Qt1)──┤    ┌── C(Qt2)──┤
    │            │    │           │
    │  [Ct1]─────┘    │  [Ct2]────┘
    │    │             │    │
    │  B(Qt2)──[Rb]──+12V  │
    │                 B(Qt1)──[Rb]──+12V
    │                       │
    └───────────────────────┘
              │     │
           E(Qt1) E(Qt2)  ← tied together
              │     │
              └──┬──┘
                 │
           C(Q_tone_en) ← ENABLE
                 │
           E(Q_tone_en)
                 │
                GND
```

### Tone Frequency Values

| Parameter     | Tank 1         | Tank 2         |
|:-------------|:---------------|:---------------|
| Frequency    | ~1 kHz         | ~2.5 kHz       |
| Rb (base R)  | 10kΩ           | 10kΩ            |
| Ct (timing C)| 47nF           | 22nF            |
| Rc (Q1 load) | 1kΩ            | 1kΩ             |
| Buzzer       | Passive piezo  | Passive piezo   |

**Frequency formula**: f = 1 / (1.4 × Rb × Ct)

| Tank | Calculation                           | Result    |
|:-----|:--------------------------------------|:----------|
| T1   | 1 / (1.4 × 10kΩ × 47nF) = 1 / 658µs  | **~1.5 kHz** |
| T2   | 1 / (1.4 × 10kΩ × 22nF) = 1 / 308µs  | **~3.2 kHz** |

> Adjust Ct values to taste. Larger Ct = lower pitch. The two tanks will sound distinctly different.

| Component     | Qty per tank | Purpose                |
|:-------------|:-------------|:-----------------------|
| Qt1, Qt2      | 2            | Astable oscillator     |
| Q_tone_en     | 1            | Enable/disable tone    |
| Rc            | 1 (1kΩ)     | Q1 collector load      |
| Rb            | 2 (10kΩ)    | Base timing resistors  |
| Ct            | 2            | Timing capacitors      |
| Buzzer        | 1            | Passive piezo          |
| Diodes        | 2 (1N4148)  | OR gate on enable base |
| **Per tank**  | **3 transistors** | |
| **Both tanks** | **6 transistors, 4 diodes** | |

---

## 8. Sound System — Beep Rate Generator (×2, one per tank)

Each tank has its own **rate oscillator** that gates the tone generator at 2, 3, or 4 Hz depending on the alarm condition. **Switchable timing resistors** select the frequency.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  BEEP RATE GENERATOR — PER TANK                                      │
  │  Output gates the Tone Generator enable (Q_tone_en)                  │
  └──────────────────────────────────────────────────────────────────────┘

              +12V                          +12V
               │                              │
            [Rc 4.7kΩ]                    [Rc 4.7kΩ]
               │                              │
    ┌── C(Qr1)─┤──[Cr1 10µF]── B(Qr2) ──── C(Qr2) ── RATE_OUT
    │          │                    │         │        (to Q_tone_en)
    │       E(Qr1)              [Rb_sw]    E(Qr2)
    │          │                    │         │
    │          └───────┬───────── +12V        │
    │                  │                      │
    │            C(Q_rate_en)                 │
    │                  │                      │
    │            E(Q_rate_en)                 │
    │                  │                      │
    │                 GND                     └── (tied to Q_rate_en)
    │                                              collector/emitter
    │                                              path
    └──[Cr2 10µF]── B(Qr1)
                       │
                    [Rb_sw]  ← SWITCHABLE (see below)
                       │
                     +12V

    Q_rate_en base:  ANY_ALARM ──[D]──┐
                     CHANGE_BEEP ──[D]──┤── [10kΩ] ── GND
                                        │
                                  B(Q_rate_en)
```

### Switchable Base Resistor (Rb_sw)

The base timing resistor is split into 3 series sections. Transistor switches short out sections to increase frequency:

```
    +12V ──[R1 18kΩ]──┬──[R2 5.6kΩ]──┬──[R3 10kΩ]──── to Qr1/Qr2 base
                       │               │
                   C(Q_sw2)        C(Q_sw1)
                       │               │
                   E(Q_sw2)        E(Q_sw1)
                       │               │
                      GND             GND

    Q_sw1 base: AT_RED ────[D]──┐
                BELOW_RED ──[D]──┤── [10kΩ] ── GND
                                  │
                            B(Q_sw1)   (ON when At Red OR Below Red)

    Q_sw2 base: BELOW_RED ── [10kΩ] ── B(Q_sw2)
                                         (ON only when Below Red)
```

### Rate Frequency Table

| Alarm Condition  | Switches    | Total Rb                    | Frequency          |
|:-----------------|:------------|:----------------------------|:-------------------|
| **At Green** (full)    | None        | R1+R2+R3 = 33.6kΩ          | **~2.1 Hz** (2 beeps/sec)  |
| **At Red** (critical)  | Q_sw1 ON    | R1+R2 = 23.6kΩ             | **~3.0 Hz** (3 beeps/sec)  |
| **Below Red** (empty)  | Q_sw1+Q_sw2 | R1 = 18kΩ                  | **~4.0 Hz** (4 beeps/sec)  |

**Verification**: f = 1 / (1.4 × Rb × 10µF)

| Setting | Calc                              | Result   |
|:--------|:----------------------------------|:---------|
| 33.6kΩ  | 1 / (1.4 × 33.6k × 10µ) = 1/0.47  | 2.1 Hz ✓ |
| 23.6kΩ  | 1 / (1.4 × 23.6k × 10µ) = 1/0.33  | 3.0 Hz ✓ |
| 18kΩ    | 1 / (1.4 × 18k × 10µ) = 1/0.252   | 4.0 Hz ✓ |

| Component     | Qty per tank | Purpose                |
|:-------------|:-------------|:-----------------------|
| Qr1, Qr2     | 2            | Rate astable           |
| Q_rate_en     | 1            | Rate enable            |
| Q_sw1, Q_sw2  | 2            | Frequency switching    |
| Rc            | 2 (4.7kΩ)   | Collector loads        |
| R1            | 1 (18kΩ)    | Base timing (always)   |
| R2            | 1 (5.6kΩ)   | Base timing (switchable)|
| R3            | 1 (10kΩ)    | Base timing (switchable)|
| Cr1, Cr2      | 2 (10µF)    | Timing capacitors      |
| Diodes        | 4 (1N4148)  | OR gates               |
| **Per tank**  | **5 transistors, 4 diodes** | |
| **Both tanks** | **10 transistors, 8 diodes** | |

---

## 9. Sound System — Signal Flow Summary

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  COMPLETE SOUND PATH — PER TANK                                     │
  └─────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
    │ ALARM LOGIC │      │ RATE GEN     │      │ TONE GEN    │
    │             │      │              │      │             │
    │ BELOW_RED ──┼─ sw ─┤ 2/3/4 Hz     │      │ ~1kHz (T1)  │
    │ AT_RED    ──┼─ sw ─┤ astable      │      │ or          │
    │ AT_GREEN  ──┼──────┤              │      │ ~2.5kHz(T2) │
    │             │      │ RATE_OUT ────┼──────┤─ Q_tone_en  │
    │ ANY_ALARM ──┼──────┤─ Q_rate_en   │      │             │   ┌────────┐
    │             │      │              │      │ Qt2 C ──────┼───┤ BUZZER │
    └─────────────┘      └──────────────┘      │             │   └────────┘
                                                └─────────────┘
                                                       │
                              CHANGE_BEEP ─────────────┘
                              (forces tone ON for 1 sec,
                               bypasses rate gating)

    Flow: Alarm active → Rate gen enabled & frequency set → Rate gates tone gen
          → Tone gen drives buzzer at audio frequency, gated at beep rate
```

### Buzzer Mute Switch (S2)

```
    Both Q_tone_en emitters ──── S2 (SPST Toggle) ──── GND

    S2 CLOSED (Normal):  Emitters grounded → sound can play
    S2 OPEN   (Muted):   Emitters floating → no current → silence

    ► S2 is a simple toggle switch in the common ground path
    ► Mutes BOTH tank buzzers simultaneously
    ► Temporary: user manually toggles back to unmute
```

---

## 10. Breathing Power LED

A slow oscillator that fades an LED in and out (~5 second cycle) to indicate power is ON.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  BREATHING POWER LED                                                 │
  └──────────────────────────────────────────────────────────────────────┘

    +12V ──[R_charge 220kΩ]──┬── [C_breath 47µF] ── GND
                               │
                            B(Q_ef) ← BC547 (Emitter Follower)
                               │
                            C(Q_ef) ── +12V
                               │
                            E(Q_ef)
                               │
                            [R_e 470Ω]
                               │
                            ┌──┴──┐
                            │ LED │ (Blue or White, 5mm)
                            └──┬──┘
                               │
                              GND

    ── DISCHARGE PATH ──
    C_breath (+) ──[R_discharge 330kΩ]── C(Q_dis)
                                            │
    Q_dis base ← driven by Schmitt feedback  E(Q_dis) ── GND

    ── FEEDBACK ──
    When C_breath charges above ~6V: Q_dis turns ON → discharges cap
    When C_breath drops below ~1V:   Q_dis turns OFF → cap charges again

    Cycle: ~5 seconds (charge through 220kΩ + discharge through 330kΩ)
```

**Simplified approach** (2 transistors):

```
    +12V ──[220kΩ]──┬──[47µF]── GND
                      │
                    B(Q_ef)          ← Emitter follower
                      │
                    C(Q_ef)── +12V
                      │
                    E(Q_ef)──[470Ω]──[LED]── GND
                      │
                    E(Q_ef)──[100kΩ]── B(Q_fb) ← Feedback discharge
                                         │
                      C_breath (+) ─── C(Q_fb)
                                         │
                                       E(Q_fb)── GND
```

When the cap voltage rises, Q_ef's emitter follows it, increasing LED brightness.
When it reaches a threshold, Q_fb turns ON and discharges the cap through Q_fb, dimming the LED.
The cap then charges again. This creates a natural breathing effect.

| Component  | Value    | Purpose                    |
|:-----------|:---------|:---------------------------|
| Q_ef       | BC547    | Emitter follower (LED driver) |
| Q_fb       | BC547    | Feedback discharge         |
| R_charge   | 220kΩ    | Slow charge path           |
| R_fb       | 100kΩ    | Feedback threshold         |
| R_e        | 470Ω     | LED current limit          |
| C_breath   | 47µF     | Timing capacitor           |
| LED        | Blue 5mm | Power indicator            |
| **Total**  | **2 transistors** | |

---

## 11. Auto-Off Timer (5-Minute Timeout)

Turns off all level LEDs and tank indicator LEDs after 5 minutes of no probe state changes. Re-triggered by any probe change.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  5-MINUTE AUTO-OFF TIMER                                             │
  └──────────────────────────────────────────────────────────────────────┘

    RETRIGGER
    (from change detector) ──[D_trig 1N4148]──┐
                                                │
    POWER-ON PULSE                              │
    +12V──[10µF]──[10kΩ]──────────────────────┤ ← C_timer (+)
                                                │
                                          [C_timer 470µF]
                                                │
                                               GND

    C_timer (+) ──[R_bleed 330kΩ]── GND    ← Discharge path

    C_timer (+) ──[100kΩ]── B(Q_timer) ──[10kΩ]── GND
                                │
                  +12V──[4.7kΩ]── C(Q_timer) ── AUTO_OFF_EN
                                │                (Active HIGH = LEDs ON)
                             E(Q_timer)
                                │
                               GND

    ┌────────────────────────────────────────────────┐
    │  S3 (Auto-Off Toggle Switch):                  │
    │                                                │
    │  S3 OPEN  → Timer active (auto-off enabled)    │
    │  S3 CLOSED → Bypasses timer:                   │
    │              +12V ──[1kΩ]── AUTO_OFF_EN        │
    │              (LEDs always ON)                   │
    └────────────────────────────────────────────────┘

    Timing: T ≈ R_bleed × C_timer × ln(V_initial / V_threshold)
            ≈ 330kΩ × 470µF × ln(11V / 0.7V)
            ≈ 155.1 × 2.75
            ≈ 426 seconds ≈ ~7 minutes

    (Adjust R_bleed to 270kΩ for ~5.5 min, or 220kΩ for ~4.5 min)
```

### LED Master Switch (Auto-Off Gate, ×2)

Each tank's LEDs go through a master enable transistor:

```
    All Level LEDs (L1-L6) + Tank Indicator LED
        │ (emitters from probe transistors)
        │
    C(Q_master_Tn) ← AUTO_OFF_EN drives base through [10kΩ]
        │
    E(Q_master_Tn)
        │
       GND

    AUTO_OFF_EN HIGH → Q_master ON → LEDs can light
    AUTO_OFF_EN LOW  → Q_master OFF → All LEDs dark
```

> **Current handling**: Max 7 LEDs × 10mA = 70mA per Q_master. BC547 handles this within its 100mA Ic rating. ✓

| Component    | Qty   | Purpose                        |
|:-------------|:------|:-------------------------------|
| Q_timer      | 1     | Timer switch                   |
| Q_master_T1  | 1     | Tank 1 LED enable              |
| Q_master_T2  | 1     | Tank 2 LED enable              |
| C_timer      | 470µF | Timer capacitor                |
| R_bleed      | 330kΩ | Timer discharge                |
| D_trig       | 1N4148| Retrigger diode                |
| S3           | SPST  | Auto-off toggle                |
| **Total**    | **3 transistors, 1 diode** | |

---

## 12. Probe Change Detector & 1-Second Alert Beep

Detects when **any** of the 12 probes changes state (wet→dry or dry→wet). Triggers:
1. LED wake-up (retriggers auto-off timer)
2. 1-second long beep on both buzzers

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  PROBE CHANGE DETECTOR (AC-Coupled Summing)                          │
  └──────────────────────────────────────────────────────────────────────┘

    T1-L1 PROBE_OUT ──[100nF]──┐
    T1-L2 PROBE_OUT ──[100nF]──┤
    T1-L3 PROBE_OUT ──[100nF]──┤
    T1-L4 PROBE_OUT ──[100nF]──┤
    T1-L5 PROBE_OUT ──[100nF]──┤
    T1-L6 PROBE_OUT ──[100nF]──┤
    T2-L1 PROBE_OUT ──[100nF]──┤   ← 12 AC-coupling capacitors
    T2-L2 PROBE_OUT ──[100nF]──┤
    T2-L3 PROBE_OUT ──[100nF]──┤
    T2-L4 PROBE_OUT ──[100nF]──┤
    T2-L5 PROBE_OUT ──[100nF]──┤
    T2-L6 PROBE_OUT ──[100nF]──┤
                                 │
                                 ├──[100kΩ]── GND  (DC bias / pull-down)
                                 │
                              B(Q_chg)
                                 │
                 +12V──[4.7kΩ]── C(Q_chg) ── CHANGE_PULSE
                                 │
                              E(Q_chg)
                                 │
                                GND

    Any probe changes state → voltage pulse through coupling cap → Q_chg triggers
    CHANGE_PULSE goes to: (1) auto-off retrigger, (2) 1-sec monostable
```

### 1-Second Monostable (Alert Beep)

```
    CHANGE_PULSE ──[D_chg 1N4148]──┐
                                     │
                              [C_mono 100µF]
                                     │
                                    GND

    C_mono (+) ──[R_mono 15kΩ]── GND     ← Discharge path

    C_mono (+) ── B(Q_mono) ──[10kΩ]── GND
                     │
    +12V──[4.7kΩ]── C(Q_mono) ── CHANGE_BEEP (Active HIGH, ~1 sec)
                     │
                  E(Q_mono)
                     │
                    GND

    T = 0.7 × R_mono × C_mono = 0.7 × 15kΩ × 100µF = 1.05 seconds ✓
    CHANGE_BEEP signal feeds: both Q_tone_en (forces continuous beep for 1 second)
```

| Component  | Qty | Purpose                           |
|:-----------|:----|:----------------------------------|
| Q_chg      | 1   | Change detection transistor       |
| Q_mono     | 1   | 1-sec monostable output           |
| C_coupling | 12  | 100nF AC-coupling capacitors      |
| C_mono     | 1   | 100µF monostable timing           |
| R_mono     | 1   | 15kΩ monostable timing            |
| D_chg      | 1   | 1N4148 trigger diode              |
| **Total**  | **2 transistors, 1 diode** | |

---

## 13. Buzzer Status LED

Lights when any alarm condition is active (either tank):

```
    ANY_ALARM_T1 ──[D_b1 1N4148]──┐
                                    │
    ANY_ALARM_T2 ──[D_b2 1N4148]──┤──[10kΩ]── GND
                                    │
                              B(Q_buzled)
                                    │
                  +12V──[1kΩ]── C(Q_buzled)
                                    │
                              ┌──┴──┐
                              │ LED │ (Red 5mm — Alarm indicator)
                              └──┬──┘
                                    │
                              E(Q_buzled)
                                    │
                                   GND

    1 transistor + 2 diodes
```

---

## 14. Tank Indicator LEDs (×2)

Light up when a level change is detected on the respective tank. Driven by the CHANGE_BEEP signal (lights for 1 second):

```
    CHANGE_BEEP ──[10kΩ]── B(Q_tank1_led)
                               │
             +12V──[1kΩ]── C(Q_tank1_led)
                               │
                         ┌──┴──┐
                         │ LED │ (Blue 5mm — Tank 1)
                         └──┬──┘
                               │
                         E(Q_tank1_led) ── C(Q_master_T1) ── GND
                                            (auto-off controlled)


    Same circuit for Tank 2 with White LED
    2 transistors total
```

> **Note**: Both tank LEDs light simultaneously on any probe change (from either tank). For per-tank discrimination, separate change detectors per tank would be needed (adds complexity).

---

## 15. Ethernet Cable Wiring

### Cable Type: Cat5e or Cat6, 6 meters per tank

Each cable has **8 conductors** (4 twisted pairs). We use **7 of 8** wires:

| Pin | Wire Color    | Assignment                               |
|:----|:-------------|:-----------------------------------------|
| 1   | White/Orange | **Common Probe** (+2.8V supply)           |
| 2   | Orange       | **Level 1** — Red (lowest)                |
| 3   | White/Green  | **Level 2** — Orange                      |
| 4   | Blue         | **Level 3** — Yellow                      |
| 5   | White/Blue   | **Level 4** — Lime Green                  |
| 6   | Green        | **Level 5** — Light Green                 |
| 7   | White/Brown  | **Level 6** — Green (highest)             |
| 8   | Brown        | **Spare** (shield / reserve)              |

### Probe Physical Layout in Tank

```
    ┌─────────────────────────────────┐
    │          TANK (top view)         │
    │                                 │
    │    ┌─── Common Probe (ground)   │   ← Stainless steel rod
    │    │                            │     running full height
    │    │    ┌── L6 (Green)  ▬▬▬▬   │   ← Highest
    │    │    │                       │
    │    │    ├── L5 (Lt Green) ▬▬▬  │
    │    │    │                       │
    │    │    ├── L4 (Lime)    ▬▬▬   │
    │    │    │                       │
    │    │    ├── L3 (Yellow)  ▬▬▬   │
    │    │    │                       │
    │    │    ├── L2 (Orange)  ▬▬▬   │
    │    │    │                       │
    │    │    └── L1 (Red)     ▬▬▬   │   ← Lowest
    │    │                            │
    │    └── Common rod extends       │
    │        below L1 to tank bottom  │
    └─────────────────────────────────┘
    
    ▬▬▬ = Stainless steel probe tip (~2cm, spaced ~1cm from common rod)
    
    Spacing between levels depends on tank height:
    For a 1m tank: ~15cm between each level probe
```

---

## 16. Complete Interconnection Summary

### Net List — Signal Names & Connections

| Signal Name         | Source                       | Destinations                                    |
|:--------------------|:-----------------------------|:------------------------------------------------|
| +12V                | Adapter via S1               | All circuits                                     |
| +2.8V_PROBE         | R1/R2 divider                | Common probes (both tanks)                       |
| GND                 | Adapter                      | All circuits                                     |
| T1_L1_OUT           | Q1a_T1 collector             | BELOW_RED_T1, AT_RED logic (Q_block_T1)          |
| T1_L2_OUT           | Q_T1L2 collector             | AT_RED logic (Q_atred_T1)                        |
| T1_L6_OUT           | Q_T1L6 collector             | AT_GREEN logic (Q_green_inv_T1)                  |
| T2_L1_OUT           | Q1a_T2 collector             | BELOW_RED_T2, AT_RED logic (Q_block_T2)          |
| T2_L2_OUT           | Q_T2L2 collector             | AT_RED logic (Q_atred_T2)                        |
| T2_L6_OUT           | Q_T2L6 collector             | AT_GREEN logic (Q_green_inv_T2)                  |
| BELOW_RED_T1        | = T1_L1_OUT                  | Rate switch Q_sw1_T1, Q_sw2_T1                   |
| AT_RED_T1           | Q_atred_inv_T1 collector     | Rate switch Q_sw1_T1, Blink enable               |
| NOT_AT_RED_T1       | Q_atred_T1 collector         | Q_blink_T1 gate                                  |
| AT_GREEN_T1         | Q_green_inv_T1 collector     | ANY_ALARM_T1 OR gate                             |
| ANY_ALARM_T1        | Diode OR of alarms           | Q_rate_en_T1, Buzzer LED                         |
| BELOW_RED_T2        | = T2_L1_OUT                  | Rate switch Q_sw1_T2, Q_sw2_T2                   |
| AT_RED_T2           | Q_atred_inv_T2 collector     | Rate switch Q_sw1_T2, Blink enable               |
| NOT_AT_RED_T2       | Q_atred_T2 collector         | Q_blink_T2 gate                                  |
| AT_GREEN_T2         | Q_green_inv_T2 collector     | ANY_ALARM_T2 OR gate                             |
| ANY_ALARM_T2        | Diode OR of alarms           | Q_rate_en_T2, Buzzer LED                         |
| RATE_OUT_T1         | Qr2_T1 collector             | Q_tone_en_T1 base (via diode OR)                 |
| RATE_OUT_T2         | Qr2_T2 collector             | Q_tone_en_T2 base (via diode OR)                 |
| BLINK_OUT           | Q_b2 collector (shared)      | Q_blink_T1 base, Q_blink_T2 base                 |
| CHANGE_PULSE        | Q_chg collector              | Auto-off retrigger, 1-sec monostable              |
| CHANGE_BEEP         | Q_mono collector             | Q_tone_en_T1 & T2 (force beep), Tank LEDs        |
| AUTO_OFF_EN         | Q_timer collector            | Q_master_T1, Q_master_T2 bases                    |

---

## 17. Complete Component Summary

### Transistors (BC547)

| Sub-Circuit                | Per Tank | Shared | Total |
|:--------------------------|:---------|:-------|:------|
| Probe Detection (L2–L6)   | 5 × 2 = 10 | —    | 10    |
| L1 Split (Q1a + Q1b)      | 2 × 2 = 4  | —    | 4     |
| Blink Gate (Q_blink)       | 1 × 2 = 2  | —    | 2     |
| Blink Oscillator           | —          | 2     | 2     |
| Blink Enable               | —          | 1     | 1     |
| Alarm Logic                | 4 × 2 = 8  | —    | 8     |
| Tone Generator             | 3 × 2 = 6  | —    | 6     |
| Rate Generator             | 5 × 2 = 10 | —    | 10    |
| Breathing LED              | —          | 2     | 2     |
| Auto-Off Timer + Masters   | 1 × 2 = 2  | 1    | 3     |
| Change Detector + Mono     | —          | 2     | 2     |
| Tank Indicator LEDs        | 1 × 2 = 2  | —    | 2     |
| Buzzer Status LED          | —          | 1     | 1     |
| **GRAND TOTAL**            |            |       | **53** |

### Diodes (1N4148)

| Usage                      | Qty  |
|:--------------------------|:-----|
| Alarm OR gates (×2 tanks)  | 6    |
| Blink enable OR             | 2    |
| Rate switching OR (×2)     | 4    |
| Tone enable OR (×2)        | 4    |
| Change retrigger            | 1    |
| Buzzer LED OR               | 2    |
| Blink gate OR (×2)          | 4    |
| **TOTAL**                  | **~23** |

### Passive Components

| Component       | Values                                              | Qty    |
|:----------------|:----------------------------------------------------|:-------|
| Resistors 1kΩ   | LED current limit, collector loads                   | 16     |
| Resistors 4.7kΩ | Pull-ups, collector loads                            | 12     |
| Resistors 10kΩ  | Probe, pull-down, base, divider, general             | 30     |
| Resistors 15kΩ  | Monostable timing                                    | 1      |
| Resistors 18kΩ  | Rate timing R1                                       | 2      |
| Resistors 5.6kΩ | Rate timing R2                                       | 2      |
| Resistors 33kΩ  | Probe divider, blink timing                          | 3      |
| Resistors 47kΩ  | Logic base resistors                                 | 8      |
| Resistors 100kΩ | Change detector, breathing                           | 3      |
| Resistors 220kΩ | Breathing charge                                     | 1      |
| Resistors 330kΩ | Auto-off timer bleed                                 | 1      |
| **Total Resistors** |                                                  | **~79** |
| Capacitors 22nF | Tank 2 tone timing                                   | 2      |
| Capacitors 47nF | Tank 1 tone timing                                   | 2      |
| Capacitors 100nF| Decoupling, AC coupling                              | 14     |
| Capacitors 10µF | Blink timing, Rate timing                            | 6      |
| Capacitors 47µF | Breathing timing                                     | 1      |
| Capacitors 100µF| Monostable timing                                    | 1      |
| Capacitors 470µF| Auto-off timer, Power decoupling                     | 2      |
| **Total Capacitors** |                                                | **~28** |

### LEDs

| LED              | Color       | Qty | Purpose                   |
|:-----------------|:------------|:----|:--------------------------|
| Level 1 (×2)     | Red         | 2   | Lowest level (blinks)     |
| Level 2 (×2)     | Orange      | 2   | Level 2                   |
| Level 3 (×2)     | Yellow      | 2   | Level 3                   |
| Level 4 (×2)     | Lime Green  | 2   | Level 4                   |
| Level 5 (×2)     | Light Green | 2   | Level 5                   |
| Level 6 (×2)     | Green       | 2   | Highest level             |
| Tank 1 Indicator  | Blue        | 1   | Tank 1 activity           |
| Tank 2 Indicator  | White       | 1   | Tank 2 activity           |
| Power Breathing   | Blue        | 1   | Power ON status           |
| Buzzer Status     | Red         | 1   | Alarm active indicator    |
| **Total**        |             | **16** |                       |

### Other Components

| Component             | Qty | Specification              |
|:----------------------|:----|:---------------------------|
| Passive Piezo Buzzer  | 2   | Different resonant freq    |
| SPST Toggle Switch    | 3   | S1, S2, S3                 |
| 12V 1.5A DC Adapter   | 1   | Barrel jack                |
| Cat5e Ethernet Cable   | 2   | 6m each                    |
| Stainless Steel Rods   | 14  | 7 per tank (probes)        |
| Perfboard             | 1   | 10×15 cm recommended       |

---

## 18. Power Budget

| Section                        | Current (mA) |
|:-------------------------------|:-------------|
| 16 LEDs × 10mA                 | 160          |
| 2 Buzzers × 20mA               | 40           |
| ~53 transistor circuits × 2mA  | 106          |
| Probe circuits (12 × 0.14mA)   | 2            |
| Breathing LED                   | 10           |
| Voltage divider                 | 0.3          |
| **Total (worst case)**         | **~318 mA**  |
| **Adapter capacity**           | **1500 mA** ✓ |

Plenty of headroom. Even with all LEDs and buzzers active simultaneously, the adapter operates at ~21% capacity.

---

## 19. Design Notes & Tips

1. **Probe Material**: Use **316 stainless steel** for longest life. Food-grade bolts work well as probe tips.

2. **Water Purity**: This circuit is designed for **tap water** (2–20kΩ probe-to-probe resistance). For distilled/RO water, replace each single probe transistor with a **Darlington pair** (2× BC547) for higher sensitivity.

3. **Cable Shield**: Connect the spare Brown wire (pin 8) of the ethernet cable to GND at the circuit end and leave it unconnected at the probe end. This provides a crude shield.

4. **Timer Accuracy**: The 5-minute auto-off timer uses electrolytic capacitors (±20% tolerance) and high-value resistors (±5%). Expect **±30% variation** in the actual timeout. This is inherent to discrete RC timing.

5. **LED Brightness**: At 10mA, LEDs are clearly visible indoors. For outdoor/bright environments, reduce R_led to 560Ω (~17mA) but ensure Q_master can handle the increased total current (may need 2 parallel BC547).

6. **Buzzer Selection**: Choose two passive piezo buzzers with **different resonant frequencies** (e.g., 2kHz and 4kHz). The resonant frequency amplifies the output, making the buzzers louder at their natural frequency.

7. **Decoupling**: Add 100nF ceramic capacitors near the power pins of each major sub-circuit (tone generators, rate generators) to prevent oscillation and noise coupling.
