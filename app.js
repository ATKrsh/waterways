/* Waterways Control & Simulation Engine */

document.addEventListener('DOMContentLoaded', () => {
    // --- System State ---
    const state = {
        mode: 'auto', // 'auto' or 'manual'
        isEStop: false,
        outsideSupply: 'intermittent', // 'available', 'intermittent', 'empty'
        outsideWaterActive: false,
        muniCycleTimer: 0, // seconds for municipal cycle
        
        // Tanks (Liters)
        sump: { capacity: 5000, level: 3200, label: 'Underground Reservoir' },
        bath1: { capacity: 1000, level: 650, label: 'Bathroom 1' },
        bath2: { capacity: 1000, level: 600, label: 'Bathroom 2' },
        kitchen: { capacity: 800, level: 350, label: 'Kitchen' },
        
        // Actuators
        motorA: 'OFF', // 'OFF', 'DRAWING_MUNI', 'PUMPING_TERRACE'
        motorB: 'OFF', // 'OFF', 'PUMPING_KITCHEN'
        
        valves: {
            a1: 'OUTSIDE', // 'OUTSIDE', 'SUMP'
            a2: 'SUMP'     // 'SUMP', 'TERRACE'
        },
        
        // Settings (Percentages)
        settings: {
            dryrunThreshold: 10,
            bathLow: 25,
            bathHigh: 95,
            kitchenLow: 30,
            kitchenHigh: 95,
            smartMunicipal: true
        },
        
        // Rates (Liters per minute)
        rates: {
            motorAFlow: 60,  // Big motor: 60 L/m (1 L/s)
            motorBFlow: 25,  // Small motor: 25 L/m (0.42 L/s)
            bathroomDraw: 1.5,
            kitchenDraw: 0.8
        }
    };

    // --- DOM Elements ---
    const el = {
        currentTime: document.getElementById('current-time-display'),
        connectionStatusDot: document.getElementById('connection-status-dot'),
        connectionStatusText: document.getElementById('connection-status-text'),
        
        // Telemetry Badges
        flowRateBadge: document.getElementById('flow-rate-badge'),
        totalCapacityBadge: document.getElementById('total-capacity-badge'),
        
        // Sump Telemetry
        sumpLiters: document.getElementById('telemetry-sump-liters'),
        sumpPct: document.getElementById('telemetry-sump-pct'),
        sumpFillRect: document.getElementById('level-mask-sump'),
        sumpWave: document.getElementById('wave-sump'),
        
        // Bathroom 1 Telemetry
        bath1Liters: document.getElementById('telemetry-bath1-liters'),
        bath1Pct: document.getElementById('telemetry-bath1-pct'),
        bath1FillRect: document.getElementById('level-mask-bath1'),
        bath1Wave: document.getElementById('wave-bath1'),
        
        // Bathroom 2 Telemetry
        bath2Liters: document.getElementById('telemetry-bath2-liters'),
        bath2Pct: document.getElementById('telemetry-bath2-pct'),
        bath2FillRect: document.getElementById('level-mask-bath2'),
        bath2Wave: document.getElementById('wave-bath2'),
        
        // Kitchen Telemetry
        kitchenLiters: document.getElementById('telemetry-kitchen-liters'),
        kitchenPct: document.getElementById('telemetry-kitchen-pct'),
        kitchenFillRect: document.getElementById('level-mask-kitchen'),
        kitchenWave: document.getElementById('wave-kitchen'),
        
        // Valves & Actuators
        valveA1Text: document.getElementById('status-valve-a1'),
        valveA2Text: document.getElementById('status-valve-a2'),
        motorAText: document.getElementById('status-motor-a'),
        motorBText: document.getElementById('status-motor-b'),
        fanMotorA: document.getElementById('fan-motor-a'),
        fanMotorB: document.getElementById('fan-motor-b'),
        
        // Active flows
        flowOutsideA1: document.getElementById('flow-outside-to-a1'),
        flowSumpA1: document.getElementById('flow-sump-to-a1'),
        flowA1MotorA: document.getElementById('flow-a1-to-motor-a'),
        flowMotorAA2: document.getElementById('flow-motor-a-to-a2'),
        flowA2Sump: document.getElementById('flow-a2-to-sump'),
        flowA2Bathrooms: document.getElementById('flow-a2-to-bathrooms'),
        flowBathBranch1: document.getElementById('flow-bath-branch1'),
        flowBathBranch2: document.getElementById('flow-bath-branch2'),
        flowSumpMotorB: document.getElementById('flow-sump-to-motor-b'),
        flowMotorBKitchen: document.getElementById('flow-motor-b-to-kitchen'),
        
        // Simulation UI
        valBathroomDraw: document.getElementById('val-bathroom-draw'),
        sliderBathroomDraw: document.getElementById('slider-bathroom-draw'),
        valKitchenDraw: document.getElementById('val-kitchen-draw'),
        sliderKitchenDraw: document.getElementById('slider-kitchen-draw'),
        selectMuniSupply: document.getElementById('select-muni-supply'),
        btnTriggerRain: document.getElementById('btn-trigger-rain'),
        btnResetSim: document.getElementById('btn-reset-sim'),
        outsideWaterStatus: document.getElementById('outside-water-status'),
        
        // Control Modes
        toggleSystemMode: document.getElementById('toggle-system-mode'),
        labelModeAuto: document.getElementById('label-mode-auto'),
        labelModeManual: document.getElementById('label-mode-manual'),
        btnEStop: document.getElementById('btn-emergency-stop'),
        
        // Manual Panel Buttons
        badgeMotorA: document.getElementById('badge-motor-a'),
        badgeMotorB: document.getElementById('badge-motor-b'),
        btnA1Outside: document.getElementById('btn-a1-outside'),
        btnA1Sump: document.getElementById('btn-a1-sump'),
        btnA2Sump: document.getElementById('btn-a2-sump'),
        btnA2Terrace: document.getElementById('btn-a2-terrace'),
        btnMotorAOn: document.getElementById('btn-motor-a-on'),
        btnMotorAOff: document.getElementById('btn-motor-a-off'),
        btnMotorBOn: document.getElementById('btn-motor-b-on'),
        btnMotorBOff: document.getElementById('btn-motor-b-off'),
        motorALockoutAlert: document.getElementById('motor-a-lockout-alert'),
        motorBLockoutAlert: document.getElementById('motor-b-lockout-alert'),
        
        // Automation Rule Inputs
        inputDryrunThreshold: document.getElementById('input-dryrun-threshold'),
        inputBathLow: document.getElementById('input-bath-low'),
        inputBathHigh: document.getElementById('input-bath-high'),
        inputKitchenLow: document.getElementById('input-kitchen-low'),
        inputKitchenHigh: document.getElementById('input-kitchen-high'),
        toggleSmartMunicipal: document.getElementById('toggle-smart-municipal'),
        
        // Log & Console
        consoleLogOutput: document.getElementById('console-log-output'),
        btnClearConsole: document.getElementById('btn-clear-console'),
        
        // Tabs
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        arduinoCodeBlock: document.getElementById('arduino-code-block'),
        btnCopyCode: document.getElementById('btn-copy-code')
    };

    // --- Helper Functions ---
    function logEvent(message, type = 'system-info') {
        const timeStr = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `[${timeStr}] ${message}`;
        el.consoleLogOutput.appendChild(entry);
        el.consoleLogOutput.scrollTop = el.consoleLogOutput.scrollHeight;
        
        // Keep logs capped at 100 entries
        while (el.consoleLogOutput.childNodes.length > 100) {
            el.consoleLogOutput.removeChild(el.consoleLogOutput.firstChild);
        }
    }

    function formatLiters(liters) {
        return Math.round(liters).toLocaleString() + 'L';
    }

    function getPercent(tank) {
        return Math.min(100, Math.max(0, (tank.level / tank.capacity) * 100));
    }

    // --- Tab Switching ---
    el.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            el.tabBtns.forEach(b => b.classList.remove('active'));
            el.tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // --- Arduino Code Generator ---
    function updateArduinoCode() {
        const dryrunLiters = Math.round((state.settings.dryrunThreshold / 100) * state.sump.capacity);
        
        const code = `/*
 * Waterways IoT Unified Water Controller
 * Generated for physical deployment.
 * 
 * Devices:
 * - ESP32 DevKitC V4
 * - JSN-SR04T Waterproof Ultrasonic Sensors (Sump, Bath1, Kitchen)
 * - 4-Channel Relay board (Motor A, Motor B, Valve A1, Valve A2)
 */

#include <WiFi.h>
#include <WebServer.h>

// --- Actuator Pin Allocations ---
#define PIN_MOTOR_A     25  // Relay 1 (Big Motor)
#define PIN_MOTOR_B     26  // Relay 2 (Small Motor)
#define PIN_VALVE_A1    27  // Relay 3 (Valve A1 Intake: LOW=Outside, HIGH=Sump)
#define PIN_VALVE_A2    14  // Relay 4 (Valve A2 Output: LOW=Sump, HIGH=Terrace)
#define PIN_MUNI_FLOW   34  // Flow Sensor for Municipal Inflow Detection

// --- Ultrasonic Sensor Pins (JSN-SR04T) ---
#define SUMP_TRIG       4
#define SUMP_ECHO       4   // Using single wire mode for Sump sensor
#define BATH_TRIG       16
#define BATH_ECHO       17
#define KITCHEN_TRIG    18
#define KITCHEN_ECHO    19

// --- System Configuration Settings ---
const float SUMP_HEIGHT_CM = 200.0;    // Depth of reservoir
const float BATH_HEIGHT_CM = 120.0;    // Depth of bathroom tank
const float KITCHEN_HEIGHT_CM = 100.0; // Depth of kitchen tank

// Dynamic safety thresholds (updated live via web UI)
const float DRY_RUN_PERCENT   = ${state.settings.dryrunThreshold}.0; // Sump Cutoff
const float BATH_LOW_PERCENT    = ${state.settings.bathLow}.0;
const float BATH_HIGH_PERCENT   = ${state.settings.bathHigh}.0;
const float KITCHEN_LOW_PERCENT = ${state.settings.kitchenLow}.0;
const float KITCHEN_HIGH_PERCENT= ${state.settings.kitchenHigh}.0;

// System state
bool systemAutoMode = ${state.mode === 'auto' ? 'true' : 'false'};
bool motorA_State = false;
bool motorB_State = false;
String valveA1_Pos = "${state.valves.a1}"; // "OUTSIDE" or "SUMP"
String valveA2_Pos = "${state.valves.a2}"; // "SUMP" or "TERRACE"
bool dryRunAlert = false;
volatile unsigned long flowPulseCount = 0;

WebServer server(80);

void IRAM_ATTR flowPulseCounter() {
    flowPulseCount++;
}

float measureDistance(int trigPin, int echoPin) {
    // Single-pin mode support for JSN-SR04T
    if (trigPin == echoPin) {
        pinMode(trigPin, OUTPUT);
        digitalWrite(trigPin, LOW);
        delayMicroseconds(2);
        digitalWrite(trigPin, HIGH);
        delayMicroseconds(10);
        digitalWrite(trigPin, LOW);
        pinMode(echoPin, INPUT);
        long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
        if (duration == 0) return 999.0; // Echo failed
        return (duration * 0.0343) / 2.0;
    }
    
    // Standard dual-pin trigger/echo
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long duration = pulseIn(echoPin, HIGH, 30000);
    if (duration == 0) return 999.0;
    return (duration * 0.0343) / 2.0;
}

// Map sensor distances to tank volume percentage
float getTankPercentage(float dist, float maxHeight) {
    if (dist >= maxHeight) return 0.0;
    float waterDepth = maxHeight - dist;
    if (waterDepth < 0) return 0.0;
    return (waterDepth / maxHeight) * 100.0;
}

void handleAPIStatus() {
    // Reads sensors and returns JSON status
    float sumpDist = measureDistance(SUMP_TRIG, SUMP_ECHO);
    float bathDist = measureDistance(BATH_TRIG, BATH_ECHO);
    float kitchDist = measureDistance(KITCHEN_TRIG, KITCHEN_ECHO);
    
    float sumpPct = getTankPercentage(sumpDist, SUMP_HEIGHT_CM);
    float bathPct = getTankPercentage(bathDist, BATH_HEIGHT_CM);
    float kitchPct = getTankPercentage(kitchDist, KITCHEN_HEIGHT_CM);
    
    bool muniFlow = (flowPulseCount > 0);
    flowPulseCount = 0; // Reset pulse count
    
    String json = "{";
    json += "\\"sumpPct\\":" + String(sumpPct) + ",";
    json += "\\"bathPct\\":" + String(bathPct) + ",";
    json += "\\"kitchenPct\\":" + String(kitchPct) + ",";
    json += "\\"motorA\\":\\"" + String(motorA_State ? "ON" : "OFF") + "\\",";
    json += "\\"motorB\\":\\"" + String(motorB_State ? "ON" : "OFF") + "\\",";
    json += "\\"valveA1\\":\\"" + valveA1_Pos + "\\",";
    json += "\\"valveA2\\":\\"" + valveA2_Pos + "\\",";
    json += "\\"muniAvailable\\":" + String(muniFlow ? "true" : "false") + ",";
    json += "\\"autoMode\\":" + String(systemAutoMode ? "true" : "false") + ",";
    json += "\\"dryRun\\":" + String(dryRunAlert ? "true" : "false");
    json += "}";
    
    server.send(200, "application/json", json);
}

void handleControl() {
    if (systemAutoMode) {
        server.send(400, "text/plain", "Error: Mode set to Auto. Switch to Manual to override actuators.");
        return;
    }
    
    if (server.hasArg("motorA")) {
        String val = server.arg("motorA");
        motorA_State = (val == "on");
        digitalWrite(PIN_MOTOR_A, motorA_State ? HIGH : LOW);
    }
    if (server.hasArg("motorB")) {
        String val = server.arg("motorB");
        if (val == "on" && dryRunAlert) {
            server.send(400, "text/plain", "Error: Sump empty. Dry-run safety lockout.");
            return;
        }
        motorB_State = (val == "on");
        digitalWrite(PIN_MOTOR_B, motorB_State ? HIGH : LOW);
    }
    if (server.hasArg("valve1")) {
        valveA1_Pos = server.arg("valve1"); // "outside" or "sump"
        digitalWrite(PIN_VALVE_A1, (valveA1_Pos == "sump") ? HIGH : LOW);
    }
    if (server.hasArg("valve2")) {
        valveA2_Pos = server.arg("valve2"); // "sump" or "terrace"
        digitalWrite(PIN_VALVE_A2, (valveA2_Pos == "terrace") ? HIGH : LOW);
    }
    
    server.send(200, "text/plain", "OK");
}

void setup() {
    Serial.begin(115200);
    
    // Actuator pins initialization
    pinMode(PIN_MOTOR_A, OUTPUT);
    pinMode(PIN_MOTOR_B, OUTPUT);
    pinMode(PIN_VALVE_A1, OUTPUT);
    pinMode(PIN_VALVE_A2, OUTPUT);
    digitalWrite(PIN_MOTOR_A, LOW);
    digitalWrite(PIN_MOTOR_B, LOW);
    digitalWrite(PIN_VALVE_A1, LOW); // Defaults to Outside Muni draw
    digitalWrite(PIN_VALVE_A2, LOW); // Defaults to Sump output
    
    pinMode(PIN_MUNI_FLOW, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_MUNI_FLOW), flowPulseCounter, FALLING);
    
    pinMode(BATH_TRIG, OUTPUT);
    pinMode(BATH_ECHO, INPUT);
    pinMode(KITCHEN_TRIG, OUTPUT);
    pinMode(KITCHEN_ECHO, INPUT);
    
    WiFi.softAP("Waterways_Panel_AP", "Waterways123");
    Serial.println("SoftAP Access Point started.");
    
    server.on("/api/status", HTTP_GET, handleAPIStatus);
    server.on("/api/control", HTTP_POST, handleControl);
    server.begin();
}

void loop() {
    server.handleClient();
    
    // --- Automation State Machine & Safety Logic ---
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 1000) {
        lastCheck = millis();
        
        float sumpDist = measureDistance(SUMP_TRIG, SUMP_ECHO);
        float sumpPct = getTankPercentage(sumpDist, SUMP_HEIGHT_CM);
        float bathDist = measureDistance(BATH_TRIG, BATH_ECHO);
        float bathPct = getTankPercentage(bathDist, BATH_HEIGHT_CM);
        float kitchDist = measureDistance(KITCHEN_TRIG, KITCHEN_ECHO);
        float kitchPct = getTankPercentage(kitchDist, KITCHEN_HEIGHT_CM);
        
        // 1. Dry Run Protection (Hardware Failsafe)
        if (sumpPct < DRY_RUN_PERCENT) {
            dryRunAlert = true;
            if (motorB_State) {
                motorB_State = false;
                digitalWrite(PIN_MOTOR_B, LOW);
                Serial.println("[ALERT] Sump dry! Stopped Motor B.");
            }
            // Sump to Terrace fill is active
            if (motorA_State && valveA1_Pos == "SUMP") {
                motorA_State = false;
                digitalWrite(PIN_MOTOR_A, LOW);
                Serial.println("[ALERT] Sump dry! Stopped Motor A.");
            }
        } else {
            dryRunAlert = false;
        }
        
        // 2. Automations
        if (systemAutoMode) {
            // Kitchen Tank filling
            if (kitchPct < KITCHEN_LOW_PERCENT && !dryRunAlert) {
                if (!motorB_State) {
                    motorB_State = true;
                    digitalWrite(PIN_MOTOR_B, HIGH);
                    Serial.println("[AUTO] Kitchen level low. Starting Motor B.");
                }
            }
            if (kitchPct >= KITCHEN_HIGH_PERCENT || dryRunAlert) {
                if (motorB_State) {
                    motorB_State = false;
                    digitalWrite(PIN_MOTOR_B, LOW);
                    Serial.println("[AUTO] Kitchen full/dry. Stopped Motor B.");
                }
            }
            
            // Bathroom Terrace filling
            if (bathPct < BATH_LOW_PERCENT && !dryRunAlert) {
                // Prioritize Bathroom Fill. Stop drawing muni if doing so.
                if (motorA_State && valveA1_Pos == "OUTSIDE") {
                    motorA_State = false;
                    digitalWrite(PIN_MOTOR_A, LOW);
                    delay(500); // Wait for valve depressurize
                }
                
                if (!motorA_State) {
                    valveA1_Pos = "SUMP";
                    valveA2_Pos = "TERRACE";
                    digitalWrite(PIN_VALVE_A1, HIGH); // Sump
                    digitalWrite(PIN_VALVE_A2, HIGH); // Terrace
                    delay(1000); // Allow valve transition before motor starts
                    
                    motorA_State = true;
                    digitalWrite(PIN_MOTOR_A, HIGH);
                    Serial.println("[AUTO] Bathroom low. Set valves and started Motor A.");
                }
            }
            
            if (bathPct >= BATH_HIGH_PERCENT) {
                if (motorA_State && valveA1_Pos == "SUMP") {
                    motorA_State = false;
                    digitalWrite(PIN_MOTOR_A, LOW);
                    Serial.println("[AUTO] Bathroom full. Stopped Motor A.");
                }
            }
            
            // Auto Municipal replenishment into Reservoir
            bool muniFlow = (flowPulseCount > 0);
            if (muniFlow && sumpPct < 85.0 && !motorA_State) {
                valveA1_Pos = "OUTSIDE";
                valveA2_Pos = "SUMP";
                digitalWrite(PIN_VALVE_A1, LOW); // Outside
                digitalWrite(PIN_VALVE_A2, LOW); // Sump
                delay(1000);
                
                motorA_State = true;
                digitalWrite(PIN_MOTOR_A, HIGH);
                Serial.println("[AUTO] Municipal supply detected. Replenishing Sump.");
            }
            
            if (sumpPct >= 95.0 && motorA_State && valveA1_Pos == "OUTSIDE") {
                motorA_State = false;
                digitalWrite(PIN_MOTOR_A, LOW);
                Serial.println("[AUTO] Sump replenished. Stopped Motor A.");
            }
        }
    }
}`;
        el.arduinoCodeBlock.textContent = code;
    }

    // --- Copy Code to Clipboard ---
    el.btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(el.arduinoCodeBlock.textContent)
            .then(() => {
                const originalText = el.btnCopyCode.textContent;
                el.btnCopyCode.textContent = 'Copied!';
                el.btnCopyCode.style.background = 'var(--accent-green)';
                setTimeout(() => {
                    el.btnCopyCode.textContent = originalText;
                    el.btnCopyCode.style.background = 'rgba(255, 255, 255, 0.06)';
                }, 1500);
                logEvent('Arduino sketch copied to clipboard.', 'system-info');
            })
            .catch(err => {
                console.error('Copy failed', err);
            });
    });

    // --- Tab Configuration Live Sync ---
    function syncSettingsFromInputs() {
        state.settings.dryrunThreshold = parseInt(el.inputDryrunThreshold.value);
        state.settings.bathLow = parseInt(el.inputBathLow.value);
        state.settings.bathHigh = parseInt(el.inputBathHigh.value);
        state.settings.kitchenLow = parseInt(el.inputKitchenLow.value);
        state.settings.kitchenHigh = parseInt(el.inputKitchenHigh.value);
        state.settings.smartMunicipal = el.toggleSmartMunicipal.checked;
        
        updateArduinoCode();
    }

    [el.inputDryrunThreshold, el.inputBathLow, el.inputBathHigh, el.inputKitchenLow, el.inputKitchenHigh].forEach(input => {
        input.addEventListener('change', () => {
            // Basic range validations
            if (input.id.includes('Low') && parseInt(input.value) >= 70) input.value = 30;
            if (input.id.includes('High') && parseInt(input.value) <= 60) input.value = 95;
            syncSettingsFromInputs();
            logEvent(`Settings updated: ${input.labels[0].innerText} set to ${input.value}%`, 'system-info');
        });
    });

    el.toggleSmartMunicipal.addEventListener('change', () => {
        syncSettingsFromInputs();
        logEvent(`Smart Municipal replenishing ${state.settings.smartMunicipal ? 'ENABLED' : 'DISABLED'}`, 'system-info');
    });

    // --- Interface Interaction Handlers ---

    // Toggle mode
    el.toggleSystemMode.addEventListener('change', (e) => {
        if (e.target.checked) {
            state.mode = 'manual';
            el.labelModeManual.classList.add('active');
            el.labelModeAuto.classList.remove('active');
            logEvent('System Mode switched to MANUAL. Rules disabled. Actuators unlocked.', 'system-warning');
        } else {
            state.mode = 'auto';
            el.labelModeAuto.classList.add('active');
            el.labelModeManual.classList.remove('active');
            logEvent('System Mode switched to AUTOMATIC. Rules active.', 'system-info');
        }
        updateManualPanelState();
        updateArduinoCode();
    });

    // Emergency Stop
    el.btnEStop.addEventListener('click', () => {
        state.isEStop = true;
        state.motorA = 'OFF';
        state.motorB = 'OFF';
        logEvent('🚨 EMERGENCY STOP PRESSED! ALL MOTORS POWERED DOWN!', 'system-danger');
        
        // Highlight UI emergency state
        el.btnEStop.classList.remove('btn-danger');
        el.btnEStop.style.background = '#450a0a';
        el.btnEStop.style.borderColor = 'var(--accent-danger)';
        el.btnEStop.textContent = 'EMERGENCY STOPPED (CLICK TO RELEASE)';
    });

    // E-Stop release handler
    el.btnEStop.addEventListener('mouseup', () => {
        if (state.isEStop) {
            // Add a small delay for releasing to feel tactile
            setTimeout(() => {
                state.isEStop = false;
                el.btnEStop.style.background = '';
                el.btnEStop.style.borderColor = '';
                el.btnEStop.classList.add('btn-danger');
                el.btnEStop.textContent = 'EMERGENCY STOP (ALL MOTORS OFF)';
                logEvent('Emergency Lockout released. Ready.', 'system-info');
            }, 500);
        }
    });

    // Valve Toggles
    el.btnA1Outside.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        state.valves.a1 = 'OUTSIDE';
        logEvent('Manual Override: Valve A1 (Intake) set to OUTSIDE', 'system-action');
        updateValveUI();
    });
    
    el.btnA1Sump.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        state.valves.a1 = 'SUMP';
        logEvent('Manual Override: Valve A1 (Intake) set to SUMP', 'system-action');
        updateValveUI();
    });

    el.btnA2Sump.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        state.valves.a2 = 'SUMP';
        logEvent('Manual Override: Valve A2 (Output) set to SUMP', 'system-action');
        updateValveUI();
    });
    
    el.btnA2Terrace.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        state.valves.a2 = 'TERRACE';
        logEvent('Manual Override: Valve A2 (Output) set to TERRACE', 'system-action');
        updateValveUI();
    });

    // Motor A Manual Actions
    el.btnMotorAOn.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        if (state.isEStop) {
            logEvent('Action blocked: E-Stop is active!', 'system-danger');
            return;
        }

        // Check source water availability
        if (state.valves.a1 === 'OUTSIDE') {
            if (!state.outsideWaterActive) {
                logEvent('Warning: Starting Motor A but municipal source is currently DRY.', 'system-warning');
            }
            state.motorA = 'DRAWING_MUNI';
            logEvent('Manual Override: Started Motor A (Outside to Sump)', 'system-action');
        } else {
            // Sump is intake
            const dryThresholdLiters = (state.settings.dryrunThreshold / 100) * state.sump.capacity;
            if (state.sump.level <= dryThresholdLiters) {
                logEvent('Action Blocked: Sump below safety margin. Motor A dry-run prevented!', 'system-danger');
                return;
            }
            state.motorA = 'PUMPING_TERRACE';
            logEvent('Manual Override: Started Motor A (Sump to Terrace)', 'system-action');
        }
    });

    el.btnMotorAOff.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        state.motorA = 'OFF';
        logEvent('Manual Override: Stopped Motor A', 'system-action');
    });

    // Motor B Manual Actions
    el.btnMotorBOn.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        if (state.isEStop) {
            logEvent('Action blocked: E-Stop is active!', 'system-danger');
            return;
        }

        const dryThresholdLiters = (state.settings.dryrunThreshold / 100) * state.sump.capacity;
        if (state.sump.level <= dryThresholdLiters) {
            logEvent('Action Blocked: Sump below safety margin. Motor B dry-run prevented!', 'system-danger');
            return;
        }
        state.motorB = 'PUMPING_KITCHEN';
        logEvent('Manual Override: Started Motor B (Sump to Kitchen)', 'system-action');
    });

    el.btnMotorBOff.addEventListener('click', () => {
        if (state.mode !== 'manual') return;
        state.motorB = 'OFF';
        logEvent('Manual Override: Stopped Motor B', 'system-action');
    });

    // Slider inputs
    el.sliderBathroomDraw.addEventListener('input', (e) => {
        state.rates.bathroomDraw = parseFloat(e.target.value);
        el.valBathroomDraw.innerText = state.rates.bathroomDraw.toFixed(1);
    });

    el.sliderKitchenDraw.addEventListener('input', (e) => {
        state.rates.kitchenDraw = parseFloat(e.target.value);
        el.valKitchenDraw.innerText = state.rates.kitchenDraw.toFixed(1);
    });

    // Reset Sim
    el.btnResetSim.addEventListener('click', () => {
        state.sump.level = 3200;
        state.bath1.level = 650;
        state.bath2.level = 600;
        state.kitchen.level = 350;
        state.motorA = 'OFF';
        state.motorB = 'OFF';
        logEvent('Simulation reset. Water levels initialized to defaults.', 'system-info');
    });

    // Rain trigger
    el.btnTriggerRain.addEventListener('click', () => {
        state.sump.level = Math.min(state.sump.capacity, state.sump.level + 500);
        logEvent('🌧️ Rain simulator: Added 500L rainwater directly to reservoir sump.', 'system-action');
    });

    // Clear logs
    el.btnClearConsole.addEventListener('click', () => {
        el.consoleLogOutput.innerHTML = '';
        logEvent('Logs cleared.', 'system-info');
    });

    // --- UI Update Loop Functions ---
    function updateValveUI() {
        // Handle Button Toggles Active Class
        if (state.valves.a1 === 'OUTSIDE') {
            el.btnA1Outside.classList.add('active');
            el.btnA1Sump.classList.remove('active');
            el.valveA1Text.textContent = 'OUTSIDE';
            document.getElementById('node-valve-a1').className.baseVal = 'valve-group valve-muni';
        } else {
            el.btnA1Sump.classList.add('active');
            el.btnA1Outside.classList.remove('active');
            el.valveA1Text.textContent = 'SUMP';
            document.getElementById('node-valve-a1').className.baseVal = 'valve-group valve-sump';
        }

        if (state.valves.a2 === 'SUMP') {
            el.btnA2Sump.classList.add('active');
            el.btnA2Terrace.classList.remove('active');
            el.valveA2Text.textContent = 'SUMP';
            document.getElementById('node-valve-a2').className.baseVal = 'valve-group valve-sump';
        } else {
            el.btnA2Terrace.classList.add('active');
            el.btnA2Sump.classList.remove('active');
            el.valveA2Text.textContent = 'TERRACE';
            document.getElementById('node-valve-a2').className.baseVal = 'valve-group valve-terrace';
        }
    }

    function updateManualPanelState() {
        const isAuto = (state.mode === 'auto');
        
        // Disable or enable interactive control items based on mode
        [el.btnA1Outside, el.btnA1Sump, el.btnA2Sump, el.btnA2Terrace,
         el.btnMotorAOn, el.btnMotorAOff, el.btnMotorBOn, el.btnMotorBOff].forEach(btn => {
            if (isAuto) {
                btn.setAttribute('disabled', 'true');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.removeAttribute('disabled');
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }

    // --- Main Physics Simulation Loop ---
    let frameCount = 0;
    
    function tick() {
        frameCount++;
        
        // 1. Time Display Update (10 ticks/sec, update clock every sec)
        if (frameCount % 10 === 0) {
            el.currentTime.innerText = new Date().toLocaleTimeString();
        }

        // 2. Municipal supply simulator schedule
        state.outsideSupply = el.selectMuniSupply.value;
        if (state.outsideSupply === 'available') {
            state.outsideWaterActive = true;
        } else if (state.outsideSupply === 'empty') {
            state.outsideWaterActive = false;
        } else { // intermittent cycle: 20 seconds ON, 20 seconds OFF
            state.muniCycleTimer += 0.1;
            if (state.muniCycleTimer >= 40) {
                state.muniCycleTimer = 0;
            }
            state.outsideWaterActive = (state.muniCycleTimer < 20);
        }

        // Update municipal text node
        if (state.outsideWaterActive) {
            el.outsideWaterStatus.textContent = 'ON';
            el.outsideWaterStatus.style.fill = 'var(--accent-green)';
        } else {
            el.outsideWaterStatus.textContent = 'OFF';
            el.outsideWaterStatus.style.fill = 'var(--accent-danger)';
        }

        // 3. Automation States Decisions (Runs only in Auto Mode)
        const sumpPctVal = getPercent(state.sump);
        const bath1PctVal = getPercent(state.bath1);
        const bath2PctVal = getPercent(state.bath2);
        const kitchenPctVal = getPercent(state.kitchen);
        
        const dryrunLiters = (state.settings.dryrunThreshold / 100) * state.sump.capacity;

        if (state.isEStop) {
            state.motorA = 'OFF';
            state.motorB = 'OFF';
        }

        if (state.mode === 'auto' && !state.isEStop) {
            // Sump Dry Run Safety Cutoff triggers
            const isSumpDry = (state.sump.level <= dryrunLiters);
            
            // Bathroom auto-fill check (takes priority)
            const isBathLow = (bath1PctVal < state.settings.bathLow || bath2PctVal < state.settings.bathLow);
            const isBathHigh = (bath1PctVal >= state.settings.bathHigh && bath2PctVal >= state.settings.bathHigh);
            
            // Kitchen auto-fill check
            const isKitchenLow = (kitchenPctVal < state.settings.kitchenLow);
            const isKitchenHigh = (kitchenPctVal >= state.settings.kitchenHigh);

            // Motor B (Kitchen) Automation Control
            if (isKitchenLow && !isSumpDry) {
                if (state.motorB === 'OFF') {
                    state.motorB = 'PUMPING_KITCHEN';
                    logEvent('[Auto-Controller] Kitchen tank below trigger threshold. Starting Motor B.', 'system-info');
                }
            }
            if ((isKitchenHigh || isSumpDry) && state.motorB === 'PUMPING_KITCHEN') {
                state.motorB = 'OFF';
                if (isSumpDry) {
                    logEvent('[Auto-Controller] Reservoir dry-run safety cutoff triggered. Stopped Motor B.', 'system-danger');
                } else {
                    logEvent('[Auto-Controller] Kitchen overhead tank full. Stopped Motor B.', 'system-info');
                }
            }

            // Motor A (Big pump) Dual Mode Automation Controller
            if (isBathLow && !isSumpDry) {
                // Sump to Terrace fill requested
                if (state.motorA !== 'PUMPING_TERRACE') {
                    // Turn off municipal pull first
                    if (state.motorA === 'DRAWING_MUNI') {
                        state.motorA = 'OFF';
                        logEvent('[Auto-Controller] Interrupting municipal sump recharge to prioritize Bathroom fill.', 'system-info');
                    }
                    
                    // Route valves to Sump -> Terrace
                    state.valves.a1 = 'SUMP';
                    state.valves.a2 = 'TERRACE';
                    state.motorA = 'PUMPING_TERRACE';
                    logEvent('[Auto-Controller] Bathrooms require water. Valves set Sump ➡️ Terrace. Motor A ON.', 'system-info');
                }
            } else if (isBathHigh && state.motorA === 'PUMPING_TERRACE') {
                state.motorA = 'OFF';
                logEvent('[Auto-Controller] Bathroom terrace tanks full. Motor A OFF.', 'system-info');
            }

            // Sump Dry Run Cutoff for Motor A
            if (isSumpDry && state.motorA === 'PUMPING_TERRACE') {
                state.motorA = 'OFF';
                logEvent('[Auto-Controller] Reservoir dry-run safety cutoff triggered. Stopped Motor A.', 'system-danger');
            }

            // Sump Municipal Recharge check (Only if Bathroom is not active and smart municipal is on)
            if (state.settings.smartMunicipal && state.motorA === 'OFF') {
                if (state.outsideWaterActive && sumpPctVal < 80.0) {
                    // Align valves: Outside -> Sump
                    state.valves.a1 = 'OUTSIDE';
                    state.valves.a2 = 'SUMP';
                    state.motorA = 'DRAWING_MUNI';
                    logEvent('[Auto-Controller] Sump level low & Municipal flow detected. Valve set Outside ➡️ Sump. Motor A ON.', 'system-info');
                }
            }
            
            if (state.motorA === 'DRAWING_MUNI') {
                // Stop replenishing sump when full (95%) or if municipal water stops flowing
                if (sumpPctVal >= 95.0 || !state.outsideWaterActive) {
                    state.motorA = 'OFF';
                    if (sumpPctVal >= 95.0) {
                        logEvent('[Auto-Controller] Sump replenishment complete. Motor A OFF.', 'system-info');
                    } else {
                        logEvent('[Auto-Controller] Municipal connection dried up. Motor A OFF.', 'system-warning');
                    }
                }
            }
        } else if (state.mode === 'manual' && !state.isEStop) {
            // Manual Mode Failsafes (Always Active to protect hardware!)
            const isSumpDry = (state.sump.level <= dryrunLiters);
            
            if (isSumpDry) {
                // Force cutoff if manually pumping from empty sump
                if (state.motorB === 'PUMPING_KITCHEN') {
                    state.motorB = 'OFF';
                    logEvent('[Failsafe] Stopped Motor B (Dry Run Sump Protection)', 'system-danger');
                }
                if (state.motorA === 'PUMPING_TERRACE') {
                    state.motorA = 'OFF';
                    logEvent('[Failsafe] Stopped Motor A (Dry Run Sump Protection)', 'system-danger');
                }
            }

            // Force cutoff if overhead tanks overflow
            if (bath1PctVal >= 98.0 && bath2PctVal >= 98.0 && state.motorA === 'PUMPING_TERRACE') {
                state.motorA = 'OFF';
                logEvent('[Failsafe] Stopped Motor A (Terrace Overflow Protection)', 'system-danger');
            }
            if (kitchenPctVal >= 98.0 && state.motorB === 'PUMPING_KITCHEN') {
                state.motorB = 'OFF';
                logEvent('[Failsafe] Stopped Motor B (Kitchen Overflow Protection)', 'system-danger');
            }
        }

        // 4. Physical Level Simulations (water flow and drain calculation per tick)
        // Rate conversion: 1 tick = 0.1s. Flow rate L/tick = (L/m) / 600
        const bathDrawTick = (state.rates.bathroomDraw / 600);
        const kitchenDrawTick = (state.rates.kitchenDraw / 600);
        const motorAFlowTick = (state.rates.motorAFlow / 600);
        const motorBFlowTick = (state.rates.motorBFlow / 600);
        
        // Drain Overhead Tanks
        state.bath1.level = Math.max(0, state.bath1.level - bathDrawTick);
        state.bath2.level = Math.max(0, state.bath2.level - bathDrawTick);
        state.kitchen.level = Math.max(0, state.kitchen.level - kitchenDrawTick);

        // Fill Tanks based on pump states
        let activeFlowRate = 0.0;
        
        // Sump filling from outside
        if (state.motorA === 'DRAWING_MUNI' && state.outsideWaterActive) {
            state.sump.level = Math.min(state.sump.capacity, state.sump.level + motorAFlowTick);
            activeFlowRate += state.rates.motorAFlow;
        }

        // Sump pumping to Terrace (bathrooms)
        if (state.motorA === 'PUMPING_TERRACE' && state.sump.level > 0) {
            // Draw from Sump
            const actualDraw = Math.min(state.sump.level, motorAFlowTick);
            state.sump.level -= actualDraw;
            activeFlowRate += state.rates.motorAFlow;
            
            // Distribute to Bath 1 and Bath 2 (fill the emptier one first, or split if equal)
            if (state.bath1.level < state.bath2.level) {
                state.bath1.level = Math.min(state.bath1.capacity, state.bath1.level + actualDraw);
            } else if (state.bath2.level < state.bath1.level) {
                state.bath2.level = Math.min(state.bath2.capacity, state.bath2.level + actualDraw);
            } else {
                // Equal split
                state.bath1.level = Math.min(state.bath1.capacity, state.bath1.level + (actualDraw / 2));
                state.bath2.level = Math.min(state.bath2.capacity, state.bath2.level + (actualDraw / 2));
            }
        }

        // Sump pumping to Kitchen
        if (state.motorB === 'PUMPING_KITCHEN' && state.sump.level > 0) {
            const actualDraw = Math.min(state.sump.level, motorBFlowTick);
            state.sump.level -= actualDraw;
            activeFlowRate += state.rates.motorBFlow;
            state.kitchen.level = Math.min(state.kitchen.capacity, state.kitchen.level + actualDraw);
        }

        // 5. Update Telemetry UI Text
        const sumpPctFloat = getPercent(state.sump);
        const bath1PctFloat = getPercent(state.bath1);
        const bath2PctFloat = getPercent(state.bath2);
        const kitchenPctFloat = getPercent(state.kitchen);
        
        el.sumpLiters.textContent = `${formatLiters(state.sump.level)} / ${state.sump.capacity}L`;
        el.sumpPct.textContent = `${Math.round(sumpPctFloat)}%`;
        
        el.bath1Liters.textContent = formatLiters(state.bath1.level);
        el.bath1Pct.textContent = `${Math.round(bath1PctFloat)}%`;

        el.bath2Liters.textContent = formatLiters(state.bath2.level);
        el.bath2Pct.textContent = `${Math.round(bath2PctFloat)}%`;

        el.kitchenLiters.textContent = formatLiters(state.kitchen.level);
        el.kitchenPct.textContent = `${Math.round(kitchenPctFloat)}%`;

        el.flowRateBadge.textContent = `Flow: ${activeFlowRate.toFixed(1)} L/m`;
        const totalWater = state.sump.level + state.bath1.level + state.bath2.level + state.kitchen.level;
        const totalCap = state.sump.capacity + state.bath1.capacity + state.bath2.capacity + state.kitchen.capacity;
        el.totalCapacityBadge.textContent = `Total Water: ${formatLiters(totalWater)} / ${formatLiters(totalCap)}`;

        // 6. Update Tank SVG Mask heights & Wave translations
        // Sump Mask y offset range: y=422 (100% full) to y=528 (empty). Height max: 106.
        const sumpHeight = (sumpPctFloat / 100) * 106;
        const sumpY = 528 - sumpHeight;
        el.sumpFillRect.setAttribute('height', sumpHeight);
        el.sumpFillRect.setAttribute('y', sumpY);
        el.sumpWave.setAttribute('transform', `translate(0, ${sumpY - 422})`);

        // Bath 1 height: max 86, range y=132 (full) to y=218 (empty)
        const bath1Height = (bath1PctFloat / 100) * 86;
        const bath1Y = 218 - bath1Height;
        el.bath1FillRect.setAttribute('height', bath1Height);
        el.bath1FillRect.setAttribute('y', bath1Y);
        el.bath1Wave.setAttribute('transform', `translate(0, ${bath1Y - 132})`);

        // Bath 2 height: max 86, range y=132 to y=218
        const bath2Height = (bath2PctFloat / 100) * 86;
        const bath2Y = 218 - bath2Height;
        el.bath2FillRect.setAttribute('height', bath2Height);
        el.bath2FillRect.setAttribute('y', bath2Y);
        el.bath2Wave.setAttribute('transform', `translate(0, ${bath2Y - 132})`);

        // Kitchen height: max 76, range y=282 (full) to y=358 (empty)
        const kitchenHeight = (kitchenPctFloat / 100) * 76;
        const kitchenY = 358 - kitchenHeight;
        el.kitchenFillRect.setAttribute('height', kitchenHeight);
        el.kitchenFillRect.setAttribute('y', kitchenY);
        el.kitchenWave.setAttribute('transform', `translate(0, ${kitchenY - 282})`);

        // 7. Update Actuator State Outputs & UI Indicators
        // Motor A status
        el.motorAText.textContent = state.motorA;
        if (state.motorA === 'OFF') {
            el.badgeMotorA.textContent = 'OFF';
            el.badgeMotorA.className = 'indicator-badge state-off';
            document.getElementById('node-motor-a').className.baseVal = 'motor-group';
        } else {
            el.badgeMotorA.textContent = state.motorA;
            el.badgeMotorA.className = 'indicator-badge state-active';
            document.getElementById('node-motor-a').className.baseVal = 'motor-group motor-active';
        }

        // Motor B status
        el.motorBText.textContent = state.motorB;
        if (state.motorB === 'OFF') {
            el.badgeMotorB.textContent = 'OFF';
            el.badgeMotorB.className = 'indicator-badge state-off';
            document.getElementById('node-motor-b').className.baseVal = 'motor-group';
        } else {
            el.badgeMotorB.textContent = 'RUNNING';
            el.badgeMotorB.className = 'indicator-badge state-active';
            document.getElementById('node-motor-b').className.baseVal = 'motor-group motor-active';
        }

        // Sync valve alignments (needed for auto mode adjustments updates in UI)
        if (state.mode === 'auto') {
            updateValveUI();
        }

        // Dry Run Lockout text alert indicators
        const isSumpEmpty = (state.sump.level <= dryrunLiters);
        if (isSumpEmpty) {
            el.motorALockoutAlert.classList.remove('hidden');
            el.motorBLockoutAlert.classList.remove('hidden');
            if (state.mode === 'manual') {
                el.badgeMotorA.textContent = 'LOCKOUT';
                el.badgeMotorA.className = 'indicator-badge state-alert';
                el.badgeMotorB.textContent = 'LOCKOUT';
                el.badgeMotorB.className = 'indicator-badge state-alert';
            }
        } else {
            el.motorALockoutAlert.classList.add('hidden');
            el.motorBLockoutAlert.classList.add('hidden');
        }

        // 8. Animate Pipe Flow Highlights
        // Reset flows
        el.flowOutsideA1.classList.remove('flow-active');
        el.flowSumpA1.classList.remove('flow-active');
        el.flowA1MotorA.classList.remove('flow-active');
        el.flowMotorAA2.classList.remove('flow-active');
        el.flowA2Sump.classList.remove('flow-active');
        el.flowA2Bathrooms.classList.remove('flow-active');
        el.flowBathBranch1.classList.remove('flow-active');
        el.flowBathBranch2.classList.remove('flow-active');
        el.flowSumpMotorB.classList.remove('flow-active');
        el.flowMotorBKitchen.classList.remove('flow-active');

        // Apply animations based on active water routing
        if (state.motorA === 'DRAWING_MUNI' && state.outsideWaterActive) {
            el.flowOutsideA1.classList.add('flow-active');
            el.flowA1MotorA.classList.add('flow-active');
            el.flowMotorAA2.classList.add('flow-active');
            el.flowA2Sump.classList.add('flow-active');
        }

        if (state.motorA === 'PUMPING_TERRACE') {
            el.flowSumpA1.classList.add('flow-active');
            el.flowA1MotorA.classList.add('flow-active');
            el.flowMotorAA2.classList.add('flow-active');
            el.flowA2Bathrooms.classList.add('flow-active');
            
            // Highlight branches that are actively taking water
            if (state.bath1.level < state.bath1.capacity) {
                el.flowBathBranch1.classList.add('flow-active');
            }
            if (state.bath2.level < state.bath2.capacity) {
                el.flowBathBranch2.classList.add('flow-active');
            }
        }

        if (state.motorB === 'PUMPING_KITCHEN') {
            el.flowSumpMotorB.classList.add('flow-active');
            el.flowMotorBKitchen.classList.add('flow-active');
        }
    }

    // --- Init System ---
    function init() {
        syncSettingsFromInputs();
        updateValveUI();
        updateManualPanelState();
        updateArduinoCode();
        
        // Start 100ms interval tick loop
        setInterval(tick, 100);
        logEvent('System initialized successfully. Simulation active.', 'system-info');
    }

    init();
});
