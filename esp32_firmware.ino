/**
 * Waterways IoT Unified Water Controller
 * 
 * Hardware Requirements:
 * - ESP32 Development Board (e.g., NodeMCU-32S)
 * - 3x JSN-SR04T Waterproof Ultrasonic Sensors (Sump, Bathroom, Kitchen)
 * - 4-Channel 5V Relay Module (Optocoupler isolated recommended)
 * - 1x Hall-effect Water Flow Sensor (for Municipal inflow detection)
 * - 12V DC power supply for Solenoids & Relays, 5V DC for ESP32/Sensors
 * 
 * Pinout Configuration:
 * - GPIO 25: Motor A Control (Big Pump Relay)
 * - GPIO 26: Motor B Control (Small Pump Relay)
 * - GPIO 27: Solenoid Valve A1 (LOW = Outside Municipal, HIGH = Sump Intake)
 * - GPIO 14: Solenoid Valve A2 (LOW = Sump Output, HIGH = Terrace Overhead Output)
 * - GPIO 34: Municipal Flow Sensor (Input Interrupt)
 * - GPIO 4:  Ultrasonic Sump Sensor (Trigger & Echo shared - 1-wire mode)
 * - GPIO 16: Ultrasonic Bathroom Sensor (Trigger)
 * - GPIO 17: Ultrasonic Bathroom Sensor (Echo)
 * - GPIO 18: Ultrasonic Kitchen Sensor (Trigger)
 * - GPIO 19: Ultrasonic Kitchen Sensor (Echo)
 */

#include <WiFi.h>
#include <WebServer.h>

// --- Pin Allocations ---
const int PIN_MOTOR_A     = 25; // Big pump relay
const int PIN_MOTOR_B     = 26; // Small pump relay
const int PIN_VALVE_A1    = 27; // Valve A1 relay
const int PIN_VALVE_A2    = 14; // Valve A2 relay
const int PIN_MUNI_FLOW   = 34; // Municipal flow sensor interrupt

const int SUMP_TRIG_ECHO  = 4;  // Sump sensor uses single-wire Trig/Echo
const int BATH_TRIG       = 16;
const int BATH_ECHO       = 17;
const int KITCHEN_TRIG    = 18;
const int KITCHEN_ECHO    = 19;

// --- Physical Tank Parameters (Adjust to actual tank sizes in cm) ---
const float SUMP_HEIGHT_CM     = 200.0; // Total depth of Sump
const float BATH_HEIGHT_CM     = 120.0; // Total depth of Bathroom Tank
const float KITCHEN_HEIGHT_CM  = 100.0; // Total depth of Kitchen Tank

// Offset between sensor transducer and 100% full water line
const float SENSOR_OFFSET_CM   = 10.0;  

// --- Default Automation Thresholds ---
float thresholdSumpDryRunPct = 10.0; // Cut off pumps if Sump < 10%
float thresholdBathLowPct    = 25.0; // Turn Motor A ON to terrace < 25%
float thresholdBathHighPct   = 95.0; // Turn Motor A OFF to terrace > 95%
float thresholdKitchenLowPct = 30.0; // Turn Motor B ON to kitchen < 30%
float thresholdKitchenHighPct= 95.0; // Turn Motor B OFF to kitchen > 95%
bool enableSmartMunicipal    = true; // Auto draw municipal when available

// --- System Operational States ---
bool systemAutoMode = true; // Auto or Manual
bool motorA_State   = false;
bool motorB_State   = false;
String valveA1_Pos  = "OUTSIDE"; // "OUTSIDE" or "SUMP"
String valveA2_Pos  = "SUMP";    // "SUMP" or "TERRACE"
bool dryRunActive   = false;
volatile unsigned long flowPulseCount = 0;
unsigned long lastStateUpdate = 0;

WebServer server(80);

// Interrupt Service Routine for Flow Sensor
void IRAM_ATTR flowPulseCounter() {
    flowPulseCount++;
}

// Read waterproof ultrasonic sensor with a max timeout to prevent blocking
float measureDistance(int trigPin, int echoPin) {
    if (trigPin == echoPin) {
        // Single-wire pulse mode for JSN-SR04T (reduces wiring)
        pinMode(trigPin, OUTPUT);
        digitalWrite(trigPin, LOW);
        delayMicroseconds(2);
        digitalWrite(trigPin, HIGH);
        delayMicroseconds(15);
        digitalWrite(trigPin, LOW);
        
        pinMode(echoPin, INPUT);
        long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout (~5m max range)
        if (duration == 0) return 999.0;
        return (duration * 0.0343) / 2.0;
    }
    
    // Standard dual-wire trigger/echo mode
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    
    long duration = pulseIn(echoPin, HIGH, 30000);
    if (duration == 0) return 999.0;
    return (duration * 0.0343) / 2.0;
}

// Map measured distance in cm to filled volume percentage
float calculatePercentage(float distanceCm, float totalHeightCm) {
    // If reading fails, default to 0% to prevent overflow runaways
    if (distanceCm > 800.0) return 0.0; 
    
    float waterDepth = totalHeightCm - (distanceCm - SENSOR_OFFSET_CM);
    if (waterDepth <= 0) return 0.0;
    if (waterDepth >= totalHeightCm) return 100.0;
    
    return (waterDepth / totalHeightCm) * 100.0;
}

// --- HTTP API Endpoints ---
void handleRoot() {
    String html = "<html><head><title>Waterways API</title></head>";
    html += "<body><h1>Waterways Control Board API</h1>";
    html += "<p>Use <b>/api/status</b> to get JSON telemetry.</p>";
    html += "<p>Use <b>/api/control</b> to trigger manual overrides.</p>";
    html += "</body></html>";
    server.send(200, "text/html", html);
}

void handleAPIStatus() {
    float sumpDist = measureDistance(SUMP_TRIG_ECHO, SUMP_TRIG_ECHO);
    float bathDist = measureDistance(BATH_TRIG, BATH_ECHO);
    float kitchDist = measureDistance(KITCHEN_TRIG, KITCHEN_ECHO);
    
    float sumpPct = calculatePercentage(sumpDist, SUMP_HEIGHT_CM);
    float bathPct = calculatePercentage(bathDist, BATH_HEIGHT_CM);
    float kitchPct = calculatePercentage(kitchDist, KITCHEN_HEIGHT_CM);
    
    bool muniFlowDetected = (flowPulseCount > 2); // filter noise
    flowPulseCount = 0; // Reset count
    
    String json = "{";
    json += "\"sumpPct\":" + String(sumpPct, 1) + ",";
    json += "\"bathPct\":" + String(bathPct, 1) + ",";
    json += "\"kitchenPct\":" + String(kitchPct, 1) + ",";
    json += "\"motorA\":\"" + String(motorA_State ? "ON" : "OFF") + "\",";
    json += "\"motorB\":\"" + String(motorB_State ? "ON" : "OFF") + "\",";
    json += "\"valveA1\":\"" + valveA1_Pos + "\",";
    json += "\"valveA2\":\"" + valveA2_Pos + "\",";
    json += "\"muniAvailable\":" + String(muniFlowDetected ? "true" : "false") + ",";
    json += "\"autoMode\":" + String(systemAutoMode ? "true" : "false") + ",";
    json += "\"dryRun\":" + String(dryRunActive ? "true" : "false");
    json += "}";
    
    server.send(200, "application/json", json);
}

void handleControl() {
    // Check mode
    if (server.hasArg("mode")) {
        String modeVal = server.arg("mode");
        systemAutoMode = (modeVal == "auto");
        Serial.print("Mode changed via API to: ");
        Serial.println(systemAutoMode ? "AUTO" : "MANUAL");
    }

    if (!systemAutoMode) {
        // Manual controls
        if (server.hasArg("motorA")) {
            String val = server.arg("motorA");
            motorA_State = (val == "on");
            digitalWrite(PIN_MOTOR_A, motorA_State ? HIGH : LOW);
            Serial.println("Motor A manual control triggered.");
        }
        
        if (server.hasArg("motorB")) {
            String val = server.arg("motorB");
            if (val == "on" && dryRunActive) {
                server.send(400, "text/plain", "Error: Reservoir dry. Protection lockout active.");
                return;
            }
            motorB_State = (val == "on");
            digitalWrite(PIN_MOTOR_B, motorB_State ? HIGH : LOW);
            Serial.println("Motor B manual control triggered.");
        }
        
        if (server.hasArg("valve1")) {
            valveA1_Pos = server.arg("valve1"); // "OUTSIDE" or "SUMP"
            digitalWrite(PIN_VALVE_A1, (valveA1_Pos == "SUMP") ? HIGH : LOW);
        }
        
        if (server.hasArg("valve2")) {
            valveA2_Pos = server.arg("valve2"); // "SUMP" or "TERRACE"
            digitalWrite(PIN_VALVE_A2, (valveA2_Pos == "TERRACE") ? HIGH : LOW);
        }
    } else {
        if (server.hasArg("motorA") || server.hasArg("motorB") || server.hasArg("valve1") || server.hasArg("valve2")) {
            server.send(400, "text/plain", "Access Denied: Actuator controls are locked in AUTO mode.");
            return;
        }
    }
    
    // Settings configuration updates
    if (server.hasArg("setSumpDry")) thresholdSumpDryRunPct = server.arg("setSumpDry").toFloat();
    if (server.hasArg("setBathLow")) thresholdBathLowPct = server.arg("setBathLow").toFloat();
    if (server.hasArg("setBathHigh")) thresholdBathHighPct = server.arg("setBathHigh").toFloat();
    if (server.hasArg("setKitchLow")) thresholdKitchenLowPct = server.arg("setKitchLow").toFloat();
    if (server.hasArg("setKitchHigh")) thresholdKitchenHighPct = server.arg("setKitchHigh").toFloat();
    if (server.hasArg("setSmartMuni")) enableSmartMunicipal = (server.arg("setSmartMuni") == "true");

    server.send(200, "text/plain", "OK");
}

void setup() {
    Serial.begin(115200);
    
    // Configure Actuator Relays
    pinMode(PIN_MOTOR_A, OUTPUT);
    pinMode(PIN_MOTOR_B, OUTPUT);
    pinMode(PIN_VALVE_A1, OUTPUT);
    pinMode(PIN_VALVE_A2, OUTPUT);
    
    // Ensure all actuators start safely OFF (Relays are usually active low, adjust if needed)
    digitalWrite(PIN_MOTOR_A, LOW); 
    digitalWrite(PIN_MOTOR_B, LOW);
    digitalWrite(PIN_VALVE_A1, LOW); // Outside Municipal connection
    digitalWrite(PIN_VALVE_A2, LOW); // Output goes to Reservoir Sump
    
    // Configure Flow Sensor & Interrupt
    pinMode(PIN_MUNI_FLOW, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_MUNI_FLOW), flowPulseCounter, FALLING);
    
    // Configure Ultrasonic Pins
    pinMode(BATH_TRIG, OUTPUT);
    pinMode(BATH_ECHO, INPUT);
    pinMode(KITCHEN_TRIG, OUTPUT);
    pinMode(KITCHEN_ECHO, INPUT);
    
    // Initialize Access Point
    WiFi.softAP("Waterways_Control_Panel", "waterways2026");
    Serial.println("WiFi Hotspot Waterways_Control_Panel started.");
    Serial.print("AP IP Address: ");
    Serial.println(WiFi.softAPIP());
    
    // Configure WebServer API Handles
    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/status", HTTP_GET, handleAPIStatus);
    server.on("/api/control", HTTP_POST, handleControl);
    server.begin();
    Serial.println("HTTP server started.");
}

void loop() {
    server.handleClient();
    
    // --- Periodic Automation & Safety Failsafes ---
    unsigned long currentMillis = millis();
    if (currentMillis - lastStateUpdate >= 1000) { // Every 1 second
        lastStateUpdate = currentMillis;
        
        // 1. Telemetry gathering
        float sumpDist = measureDistance(SUMP_TRIG_ECHO, SUMP_TRIG_ECHO);
        float sumpPct = calculatePercentage(sumpDist, SUMP_HEIGHT_CM);
        float bathDist = measureDistance(BATH_TRIG, BATH_ECHO);
        float bathPct = calculatePercentage(bathDist, BATH_HEIGHT_CM);
        float kitchDist = measureDistance(KITCHEN_TRIG, KITCHEN_ECHO);
        float kitchPct = calculatePercentage(kitchDist, KITCHEN_HEIGHT_CM);
        
        bool muniFlowActive = (flowPulseCount > 2);
        flowPulseCount = 0; // reset
        
        // 2. Hardware Dry Run Protection (Runs in both AUTO and MANUAL for safety)
        if (sumpPct < thresholdSumpDryRunPct) {
            dryRunActive = true;
            
            // Immediately shut off pumps drawing from sump
            if (motorB_State) {
                motorB_State = false;
                digitalWrite(PIN_MOTOR_B, LOW);
                Serial.println("[CRITICAL] Safety cutoff: Sump dry! Stopped Motor B.");
            }
            if (motorA_State && valveA1_Pos == "SUMP") {
                motorA_State = false;
                digitalWrite(PIN_MOTOR_A, LOW);
                Serial.println("[CRITICAL] Safety cutoff: Sump dry! Stopped Motor A.");
            }
        } else {
            dryRunActive = false;
        }

        // 3. Overflow Protection (MANUAL override safety check)
        if (!systemAutoMode) {
            if (bathPct >= 98.0 && motorA_State && valveA1_Pos == "SUMP" && valveA2_Pos == "TERRACE") {
                motorA_State = false;
                digitalWrite(PIN_MOTOR_A, LOW);
                Serial.println("[FAILSAFE] Manual Stopped Motor A (Terrace Overflow Protection)");
            }
            if (kitchPct >= 98.0 && motorB_State) {
                motorB_State = false;
                digitalWrite(PIN_MOTOR_B, LOW);
                Serial.println("[FAILSAFE] Manual Stopped Motor B (Kitchen Overflow Protection)");
            }
        }
        
        // 4. Automation Rules Engine (AUTO mode only)
        if (systemAutoMode) {
            // Kitchen Tank Logic
            if (kitchPct < thresholdKitchenLowPct && !dryRunActive) {
                if (!motorB_State) {
                    motorB_State = true;
                    digitalWrite(PIN_MOTOR_B, HIGH);
                    Serial.println("[AUTO] Kitchen low. Starting Motor B.");
                }
            }
            if ((kitchPct >= thresholdKitchenHighPct || dryRunActive) && motorB_State) {
                motorB_State = false;
                digitalWrite(PIN_MOTOR_B, LOW);
                Serial.println("[AUTO] Kitchen full or Sump dry. Stopped Motor B.");
            }
            
            // Bathroom Overhead Terrace Logic (Prioritized over municipal draw)
            if (bathPct < thresholdBathLowPct && !dryRunActive) {
                // If Motor A is currently drawing municipal water, stop it first
                if (motorA_State && valveA1_Pos == "OUTSIDE") {
                    motorA_State = false;
                    digitalWrite(PIN_MOTOR_A, LOW);
                    delay(500); // Allow valve back-pressure to settle
                }
                
                if (!motorA_State) {
                    // Set valves: Sump to Terrace
                    valveA1_Pos = "SUMP";
                    valveA2_Pos = "TERRACE";
                    digitalWrite(PIN_VALVE_A1, HIGH); // Sump
                    digitalWrite(PIN_VALVE_A2, HIGH); // Terrace
                    delay(1000); // Allow solenoid valves to switch fully
                    
                    motorA_State = true;
                    digitalWrite(PIN_MOTOR_A, HIGH);
                    Serial.println("[AUTO] Bathrooms low. Valves aligned Sump->Terrace. Motor A ON.");
                }
            }
            
            // Stop Bathroom fill when full
            if (bathPct >= thresholdBathHighPct && motorA_State && valveA1_Pos == "SUMP") {
                motorA_State = false;
                digitalWrite(PIN_MOTOR_A, LOW);
                Serial.println("[AUTO] Bathrooms full. Stopped Motor A.");
            }
            
            // Municipal Recharge Logic (Runs only if Motor A is idle)
            if (enableSmartMunicipal && !motorA_State) {
                if (muniFlowActive && sumpPct < 85.0) {
                    // Set valves: Outside to Sump
                    valveA1_Pos = "OUTSIDE";
                    valveA2_Pos = "SUMP";
                    digitalWrite(PIN_VALVE_A1, LOW); // Outside
                    digitalWrite(PIN_VALVE_A2, LOW); // Sump
                    delay(1000);
                    
                    motorA_State = true;
                    digitalWrite(PIN_MOTOR_A, HIGH);
                    Serial.println("[AUTO] Municipal water detected. Valves aligned Outside->Sump. Motor A ON.");
                }
            }
            
            // Stop Sump recharge when full or municipal stops
            if (motorA_State && valveA1_Pos == "OUTSIDE") {
                if (sumpPct >= 95.0 || !muniFlowActive) {
                    motorA_State = false;
                    digitalWrite(PIN_MOTOR_A, LOW);
                    if (sumpPct >= 95.0) {
                        Serial.println("[AUTO] Sump recharge complete. Motor A OFF.");
                    } else {
                        Serial.println("[AUTO] Municipal flow stopped. Motor A OFF.");
                    }
                }
            }
        }
    }
}
