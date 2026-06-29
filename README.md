[![Docker Hub](https://img.shields.io/docker/pulls/wagoalex/wago-ai-suite-ui?color=6EC800)](https://hub.docker.com/r/wagoalex/wago-ai-suite-ui)
[![License: MPL-2.0](https://img.shields.io/badge/License-MPL%202.0-6EC800.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.950-1F2837.svg)](version.txt)
[![Services](https://img.shields.io/badge/services-7-1F2837.svg)](#architecture)

# wago-ai-suite

> A unified edge AI platform for WAGO controllers. Manage containers, run real-time inference with a Hailo-8 accelerator, label datasets, automate workflows, and visualize everything - from one browser tab.

---

## Choose your path

| I am a... | I want to... | Start here |
|-----------|-------------|------------|
| **OT / automation engineer** | Deploy the suite on a WAGO Edge Controller and get inference running | [Quick Start](#quick-start) |
| **Data scientist / ML engineer** | Label data, inspect ONNX models, connect to JupyterLab | [Integrated Services](#integrated-services) |
| **Developer** | Understand how the frontend talks to the Hailo backend | [Architecture](#architecture) |

---

## What it does

The suite provides a React frontend and an Express proxy backend, both running as Docker containers. The frontend embeds or iframes a set of AI and automation services, and communicates with them over HTTP and MQTT.

| Capability | How |
|---|---|
| **Real-time object detection** | MJPEG or HLS stream from the Hailo-8 inference container, bounding boxes overlaid via MQTT, with a live confidence threshold slider |
| **Container lifecycle management** | Start, stop, restart, and tail logs for any container in the stack |
| **Model inspection** | Netron ONNX viewer embedded directly in the UI |
| **Dataset labeling** | Label Studio embedded and proxied through the backend |
| **Workflow automation** | n8n and Node-RED embedded with iframe passthrough |
| **Dashboards** | Grafana embedded, data flows from Node-RED or the inference pipeline |
| **Conversational AI** | n8n chat integration with voice input/output via MQTT |

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/WagoAlex/wago-ai-suite.git
cd wago-ai-suite
cp _env .env
```

Edit `.env`:

```env
REACT_APP_MQTT_BROKER_URL=ws://localhost:9001
REACT_APP_MQTT_START_TOPIC=inference/start
REACT_APP_N8N_API_URL=http://localhost:5678
```

### 2. Start the stack

```bash
docker compose up -d
docker logs wago-ai-suite -f
```

Open `http://localhost:3000` in your browser.

### 3. Connect the Hailo inference container

The Visual Inference tab expects the [wago-hailo-infrence](https://github.com/WagoAlex/wago-hailo-infrence) container running alongside the stack. It exposes:

- FastAPI on port `8042` - REST endpoints for stream and health
- Mosquitto on port `1883` / `9001` (WS) - MQTT topic `inference/yolov5m-results`

```bash
# In the wago-hailo-infrence repo
docker compose up -d
```

The suite backend proxies `/api/video/stream` and `/api/inference/health` to the Hailo container. MQTT detections flow directly from the broker to the browser.

---

## Visual Inference - confidence threshold slider

The Visual Inference view receives per-frame detection results over MQTT:

```json
{
  "timestamp": 1719000000000,
  "fps": 28.4,
  "detections": [
    { "class": "helmet", "confidence": 0.91, "box": [120, 45, 310, 280] }
  ]
}
```

A **confidence threshold slider** (0-100%) is shown above the stream. It filters detections client-side in real time - drag it up to suppress low-confidence boxes without restarting the container. The badge next to the slider shows how many detections survive the current threshold.

> [!NOTE]
> The backend applies its own gate at `CONFIDENCE_THRESHOLD=0.70` (set via env var in the Hailo container). The slider operates on top of that - it can only raise the effective threshold, not lower it below the backend value.

Stream modes:

| Mode | How | When to use |
|---|---|---|
| **Live (MJPEG)** | `<img>` tag pointed at `/api/mjpeg/stream/{camera_id}` | Lowest latency, bounding boxes burned server-side |
| **Buffered (HLS)** | HLS.js + `<video>` + canvas overlay | Better for unstable networks, boxes drawn client-side |

---

## Architecture

```
Browser
  │
  ├── React frontend (port 3000)
  │     ├── Visual-Inference.js  ──── MQTT subscribe: inference/yolov5m-results
  │     ├── Status.js            ──── REST: /api/containers
  │     ├── BurgerMenu.js        ──── routes to all embedded services
  │     └── [Grafana, Node-RED, n8n, Label Studio, JupyterLab, Netron] via iframe
  │
  └── Express backend (port 3001)
        ├── /api/containers/*    ──── Docker socket proxy (start/stop/logs)
        ├── /api/video/stream    ──── proxy → Hailo FastAPI :8042/video/stream
        └── /api/inference/health ─── proxy → Hailo FastAPI :8042/health

Hailo inference container (wago-hailo-infrence, port 8042)
  ├── FastAPI  ── /stream/mjpeg/{camera_id}, /video/stream, /health, /metadata
  ├── inference.py  ── YOLOv5m on Hailo-8, publishes to MQTT every frame
  └── Mosquitto  ── topic: inference/yolov5m-results

Docker network: waa_cm_network
  wago-ai-suite · wago-ai-suite-backend · wago-label-studio
  mqtt-broker · jupyterlab · hailo-ai
```

---

## Integrated Services

| Service | Default URL | Container | Purpose |
|---------|-------------|-----------|---------|
| Frontend | `http://localhost:3000` | `wago-ai-suite` | Main UI shell |
| Backend | `http://localhost:3001` | `wago-ai-suite-backend` | Express proxy + Docker socket |
| Label Studio | `http://localhost:8080` | `wago-label-studio` | Dataset labeling |
| MQTT broker | `mqtt://localhost:1883` | `mqtt-broker` | Mosquitto for inference results |
| JupyterLab | `http://localhost:8888` | `jupyterlab` | Notebook environment |
| Grafana | embedded via proxy | - | Dashboards (WAA service) |
| Node-RED | embedded via proxy | - | Flow automation (WAA service) |
| n8n | embedded via proxy | - | Workflow automation + chat |
| Netron | `http://localhost:3000/netron/` | `wago-ai-suite` | ONNX model inspector |

Grafana and Node-RED are provided by **WAGO App Analytics (WAA)** - pre-built Docker images for WAGO Edge Controllers.
See the [WAA download center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4) for setup.

---

## Configuration reference

### Frontend build args (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_MQTT_BROKER_URL` | `ws://localhost:9001` | WebSocket URL for the MQTT broker |
| `REACT_APP_MQTT_START_TOPIC` | `inference/start` | MQTT topic to signal inference start |
| `REACT_APP_N8N_API_URL` | `http://localhost:5678` | n8n API base URL for chat |
| `REACT_APP_VERSION` | set by `build-was.sh` | Shown in the UI footer |

### Hailo inference container (`wago-hailo-infrence`)

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIDENCE_THRESHOLD` | `0.70` | Minimum score for a detection to be published over MQTT |
| `IOU_THRESHOLD` | `0.15` | Post-NMS IoU filter - suppresses duplicate boxes for the same object |
| `NMS_IOU_THRESHOLD` | `0.15` | NMS IoU threshold fed to `cv2.dnn.NMSBoxes` |
| `MQTT_TOPIC` | `inference/yolov5m-results` | Topic where detection JSON is published |
| `MQTT_BROKER` | `localhost` | Broker hostname |
| `HEF_PATH` | - | Path to the `.hef` model file on the host |

> [!TIP]
> The frontend confidence slider filters detections client-side. To reduce load at the source, raise `CONFIDENCE_THRESHOLD` in the Hailo container instead.

---

## Building

```bash
# Bumps version.txt, builds both Docker images
bash build-was.sh
```

The script reads `.env` for MQTT and n8n URLs, injects them as React build args, tags images as `wagoalex/wago-ai-suite-ui:<version>` and `wagoalex/wago-ai-suite-backend:<version>`, and updates `version.txt`.

Current version: **1.950**

---

## Detection data contract

The MQTT payload from the Hailo container and the schema consumed by `Visual-Inference.js` must match exactly. There is no schema library on either side - a field rename on one end silently breaks the overlay.

**Published by `inference.py`:**

```python
{
    "timestamp": get_current_timestamp(),   # int, milliseconds
    "fps": round(fps, 2),                   # float
    "detections": [
        {
            "class": class_names[int(d[5])],          # str
            "confidence": round(float(d[4]), 2),       # float, 0.0-1.0
            "box": [round(float(x), 1) for x in d[:4]] # [x1, y1, x2, y2], pixels at 640x640
        }
        for d in final_detections
    ]
}
```

**Consumed by `Visual-Inference.js`:**

```js
det.class &&
typeof det.confidence === 'number' && det.confidence >= confidenceThreshold &&
Array.isArray(det.box) && det.box.length === 4 &&
det.box.every(coord => typeof coord === 'number' && !isNaN(coord)) &&
(det.box[2] - det.box[0] > 0) && (det.box[3] - det.box[1] > 0)
```

Box coordinates are in 640x640 pixel space. The HLS canvas overlay scales them to the rendered video dimensions.

---

## Troubleshooting

**Detection overlay is blank / no bounding boxes**

1. Check MQTT connection status indicator (green dot in the UI header).
2. Confirm the Hailo container is running: `docker logs hailo-ai -f`.
3. Verify `MQTT_TOPIC` in the Hailo container matches `inference/yolov5m-results`.
4. Check the confidence slider - drag it to 0% to rule out threshold filtering.
5. If using MJPEG mode, boxes are burned server-side - the canvas overlay is only active in HLS mode.

**Stream shows "Stream timeout"**

- Backend logs: `docker logs wago-ai-suite-backend -f`
- Confirm the Hailo FastAPI is responding: `curl http://localhost:8042/health`
- Check `inferenceServerType` setting in the UI (Local vs Remote).

**MQTT connection fails**

- Broker must accept WebSocket connections on port `9001`.
- In the Hailo container, Mosquitto is configured for both TCP (`1883`) and WS (`9001`).
- If deploying behind a reverse proxy, ensure it passes WebSocket upgrade headers.

**Label Studio is empty after restart**

Label Studio stores data in a Docker volume. If the volume was removed, data is gone. Back up `/label-studio/data` before `docker compose down -v`.

---

## Requirements

- Docker 24+ with Compose v2
- WAGO Edge Controller (or any x86_64 Linux host with Docker)
- Hailo-8 PCIe module + HailoRT driver `4.20.0` (for inference)
- WAGO App Analytics (WAA) for Grafana and Node-RED integration (optional)

---

## License

[Mozilla Public License 2.0](LICENSE)
