#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266mDNS.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>

const char* ssid = "WIFI_SSID";
const char* password = "WIFI_PASSWORD";

const char* targetHostname = "sensor-coordinator.local";
const char* location = "basement_office";
const int sleepTime = 20;

Adafruit_BMP280 bmp; // I2C

WiFiClient wifiClient;

String generateSensorID() {
  String mac = WiFi.macAddress();
  mac.replace(":", ""); 

  String sensorID = "sensor-" + mac;
  return sensorID;
}

void setup() {
  Serial.begin(115200);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  connectToWiFi();
  
  if (!bmp.begin(0x76)) {
    Serial.println("Could not find a valid BMP280 sensor, check wiring!");
    enterDeepSleep();
    return;
  }

  if (!MDNS.begin("mywemos")) {
    Serial.println("Error setting up MDNS responder!");
    enterDeepSleep();
    return;
  }

  Serial.println("MDNS responder started");

  delay(1000);

  int n = MDNS.queryService("http", "tcp");
  Serial.printf("Found %d services:\n", n);

  String serverIP;
  int serverPort;

  if (n == 0) {
    Serial.println("No services found");
  } else {
    for (int i = 0; i < n; ++i) {
      String host = MDNS.hostname(i);
      if (host == targetHostname) {
        IPAddress ip = MDNS.IP(i);
        serverIP = ip.toString();
        serverPort = MDNS.port(i);
        Serial.println("Found the target server!");
        Serial.print("Host: ");
        Serial.println(host);
        Serial.print("IP: ");
        Serial.println(serverIP);
        Serial.print("Port: ");
        Serial.println(serverPort);
        break;
      }
    }
  }

  if (serverIP.length() > 0) {
    String sensorID = generateSensorID();
    Serial.println("Generated Sensor ID: " + sensorID);
    readAndPostSensorData(serverIP, serverPort, sensorID);
  } else {
    Serial.println("Target server not found.");
  }

  enterDeepSleep();
}

void loop() {}

void connectToWiFi() {
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
}

void readAndPostSensorData(String serverIP, int serverPort, String sensorID) {
  float temperature = bmp.readTemperature();
  float pressure = bmp.readPressure() / 100.0F; // Convert to hPa
  float humidity = 0.0;

  Serial.print("Temperature = ");
  Serial.print(temperature);
  Serial.println(" *C");

  Serial.print("Pressure = ");
  Serial.print(pressure);
  Serial.println(" hPa");

  Serial.print("Humidity = ");
  Serial.print(humidity);
  Serial.println(" %");

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "http://" + serverIP + ":" + String(serverPort) + "/sensor-reading/" + sensorID;

    http.begin(wifiClient, url);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"location\": \"" + String(location) + "\",";
    payload += "\"sensor_id\": \"" + sensorID + "\",";
    payload += "\"readings\": {";
    payload += "\"temperature\": {\"value\": " + String(temperature) + ", \"unit\": \"C\"},";
    payload += "\"pressure\": {\"value\": " + String(pressure) + ", \"unit\": \"hPa\"},";
    payload += "\"humidity\": {\"value\": " + String(humidity) + ", \"unit\": \"%\"}";
    payload += "}";
    payload += "}";

    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  }
}

void enterDeepSleep() {
  Serial.print("Entering deep sleep for ");
  Serial.print(sleepTime);
  Serial.println(" seconds...");
  ESP.deepSleep(sleepTime * 1e6);
}
