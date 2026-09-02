# Bill of Materials — Dual-Tank Water Level Indicator

> Complete shopping list with quantities, specifications, and estimated costs.

---

## Semiconductors

| # | Component            | Specification              | Qty  | Notes                                |
|:--|:---------------------|:---------------------------|:-----|:-------------------------------------|
| 1 | BC547 NPN Transistor | TO-92, Ic=100mA, hFE≥110  | **60** | Buy 60 (53 needed + 7 spares)       |
| 2 | 1N4148 Signal Diode  | DO-35, 100V, 200mA        | **25** | Buy 25 (23 needed + 2 spares)       |

---

## LEDs (5mm Through-Hole)

| # | Color       | Vf (typ) | Qty | Usage                     |
|:--|:------------|:---------|:----|:--------------------------|
| 3 | Red         | 2.0V     | 3   | L1 ×2 + Buzzer status ×1  |
| 4 | Orange      | 2.0V     | 2   | L2 ×2                      |
| 5 | Yellow      | 2.1V     | 2   | L3 ×2                      |
| 6 | Lime Green  | 2.2V     | 2   | L4 ×2                      |
| 7 | Light Green | 2.2V     | 2   | L5 ×2                      |
| 8 | Green       | 2.2V     | 2   | L6 ×2                      |
| 9 | Blue        | 3.2V     | 2   | Tank 1 indicator + Power   |
| 10| White       | 3.2V     | 1   | Tank 2 indicator           |
|   | **Total LEDs** |       | **16** |                        |

---

## Resistors (1/4W, 5% Carbon Film / Metal Film)

| #  | Value   | Qty  | Usage                                         |
|:---|:--------|:-----|:----------------------------------------------|
| 11 | 1kΩ     | 16   | LED current limiting, collector loads          |
| 12 | 4.7kΩ   | 12   | Collector pull-ups, loads                      |
| 13 | 5.6kΩ   | 2    | Rate gen timing R2 (switchable)                |
| 14 | 10kΩ    | 30   | Probe R, pull-downs, base R, divider           |
| 15 | 15kΩ    | 1    | 1-sec monostable timing                        |
| 16 | 18kΩ    | 2    | Rate gen timing R1 (always in circuit)         |
| 17 | 33kΩ    | 3    | Probe voltage divider upper, blink Rb          |
| 18 | 47kΩ    | 8    | Logic base resistors (alarm circuits)          |
| 19 | 100kΩ   | 3    | Change detector pull-down, breathing feedback  |
| 20 | 220kΩ   | 1    | Breathing LED charge resistor                  |
| 21 | 330kΩ   | 1    | Auto-off timer bleed resistor                  |
| 22 | 470Ω    | 1    | Breathing LED emitter resistor                 |
|    | **Total Resistors** | **~80** |                                    |

> **Tip**: Buy a 1/4W resistor assortment kit (600-piece kits available cheaply on Amazon/AliExpress). It will contain all needed values with plenty of spares.

---

## Capacitors

| #  | Value   | Type         | Voltage | Qty | Usage                           |
|:---|:--------|:-------------|:--------|:----|:--------------------------------|
| 23 | 22nF    | Ceramic      | 50V     | 2   | Tank 2 tone timing              |
| 24 | 47nF    | Ceramic      | 50V     | 2   | Tank 1 tone timing              |
| 25 | 100nF   | Ceramic      | 50V     | 14  | AC coupling (12), decoupling (2)|
| 26 | 10µF    | Electrolytic | 25V     | 6   | Blink timing (2), Rate timing (4)|
| 27 | 47µF    | Electrolytic | 25V     | 1   | Breathing LED timing             |
| 28 | 100µF   | Electrolytic | 25V     | 1   | 1-sec monostable timing          |
| 29 | 470µF   | Electrolytic | 25V     | 2   | Auto-off timer, Power decoupling |
|    | **Total Capacitors** |  |         | **~28** |                            |

---

## Buzzers & Switches

| #  | Component               | Specification                     | Qty |
|:---|:------------------------|:----------------------------------|:----|
| 30 | Passive Piezo Buzzer    | 12V compatible, ~2kHz resonance   | 1   |
| 31 | Passive Piezo Buzzer    | 12V compatible, ~4kHz resonance   | 1   |
| 32 | SPST Toggle Switch      | Panel mount, 250V/3A rated        | 3   |

> **Buzzer selection**: Choose two buzzers with **different resonant frequencies** to ensure audibly distinct tones between Tank 1 and Tank 2. The resonant frequency is usually printed on the buzzer or its datasheet.

---

## Interconnect & Cable

| #  | Component                | Specification                      | Qty  |
|:---|:-------------------------|:-----------------------------------|:-----|
| 33 | Cat5e Ethernet Cable     | 6 meters, stranded preferred       | 2    |
| 34 | 2-pin Barrel Jack Socket | 5.5×2.1mm, panel mount             | 1    |
| 35 | Hookup Wire              | 22AWG, solid core, assorted colors | 5m   |

---

## Probes (Tank-side Hardware)

| #  | Component                    | Specification                   | Qty  |
|:---|:-----------------------------|:--------------------------------|:-----|
| 36 | Stainless Steel Rod/Bolt     | 316 food-grade, 3mm dia, 3cm    | 14   |
| 37 | Stainless Steel Rod (Common) | 316, 3mm dia, full tank height  | 2    |
| 38 | Nylon Cable Gland            | PG7 or PG9, waterproof          | 2    |
| 39 | PVC Pipe (probe holder)      | 20mm conduit, cut to tank height| 2    |
| 40 | Epoxy / Silicone Sealant     | Waterproof, for probe mounting  | 1    |

---

## PCB & Enclosure

| #  | Component                | Specification                       | Qty |
|:---|:-------------------------|:------------------------------------|:----|
| 41 | Perfboard / Veroboard    | 10cm × 15cm, double-sided           | 1   |
| 42 | ABS Enclosure            | IP65, ~15×12×7 cm                    | 1   |
| 43 | LED Panel Mount Holders  | 5mm LED bezels (chrome or black)     | 16  |
| 44 | Standoffs (M3)           | Nylon, 10mm, for mounting perfboard  | 4   |
| 45 | Solder                   | 60/40 or lead-free, 0.8mm           | 1   |

---

## Estimated Cost Breakdown (INR / Approximate)

| Category               | Est. Cost (₹) |
|:-----------------------|:---------------|
| BC547 × 60             | ₹60–120        |
| 1N4148 × 25            | ₹25–50         |
| LEDs × 16              | ₹30–50         |
| Resistor kit (80+ pcs) | ₹50–100        |
| Capacitor assortment   | ₹50–100        |
| Passive Buzzers × 2    | ₹30–60         |
| Toggle Switches × 3    | ₹30–60         |
| Ethernet Cable 6m × 2  | ₹80–150        |
| 12V 1.5A Adapter       | ₹100–200       |
| Barrel Jack Socket      | ₹10–20         |
| SS Rods/Bolts          | ₹100–200       |
| Perfboard              | ₹30–60         |
| Enclosure              | ₹100–200       |
| LED Bezels × 16        | ₹50–80         |
| Solder + Wire          | ₹50–100        |
| **TOTAL ESTIMATE**     | **₹800–1,600** |

> All components are commonly available at local electronics shops or online (Amazon.in, Robu.in, Electronicscomp.com).

---

## Recommended Spare Parts

| Component        | Spares | Reason                              |
|:-----------------|:-------|:------------------------------------|
| BC547            | 7      | High usage, easy to damage with heat|
| 1N4148           | 2      | May need extras for prototyping     |
| 10kΩ Resistors   | 10     | Most-used value                     |
| LEDs (assorted)  | 5      | In case of burnout during testing   |
| 100nF Capacitors | 3      | Commonly needed for decoupling      |
