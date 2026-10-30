# Cloud Compiler

A modern, high-performance web-based code execution platform and cloud compiler. Run and test code in multiple programming languages safely inside isolated Docker sandbox containers with real-time interactive terminal support.

---

## Features

- **Multi-Language Support**:
  - Python 3.11
  - C (GCC 13.2)
  - C++ (G++ 13.2, C++17)
  - Java (OpenJDK 17)
  - JavaScript (Node.js 20)
- **Interactive Stdin / Terminal Execution**: Real-time bidirectional I/O streaming via WebSockets (`/ws/execute`).
- **Batch Test Runner**: Run multiple test cases (inputs and expected outputs) with automated diffing and performance metrics.
- **Compiler Optimization Benchmarking**: Visual comparisons of binary footprint and execution speed across GCC flags (`-O0`, `-O1`, `-O2`, `-O3`, `-Os`).
- **Execution History**: Persistent local execution history backed by SQLite (`better-sqlite3`) in WAL mode.
- **Resource Constraints & Sandbox Security**: Docker sandboxing enforcing memory boundaries (`128MB`), CPU limits (`0.5 cores`), dropped capabilities (`ALL`), read-only root filesystems, non-root users (`UID 1000`), and execution timeouts.
- **Developer-Centric UI**: Monaco code editor with custom GitHub Dark and Light themes, history drawer, and granular telemetry (compilation time, memory usage, runtime, exit code).

---

## Tech Stack

### Frontend
- **React 19** with **TypeScript**
- **Vite** build tooling
- **Monaco Editor** (`@monaco-editor/react`)
- **Lucide Icons**
- Responsive layout with GitHub Dark/Light CSS design tokens

### Backend
- **Node.js** & **Express** with **TypeScript**
- **Docker CLI** container orchestration via `child_process.spawn`
- **WebSocket (`ws`)** for interactive bidirectional I/O streaming
- **SQLite** via `better-sqlite3` (WAL mode) for persistent execution history
- Request validation middleware enforcing payload and stdin thresholds

### Sandbox & Infrastructure
- **Docker & Docker Compose**
- Unified Alpine 3.19 multi-runtime sandbox container (`docker/Dockerfile.sandbox`)
- Strict cgroup resource limits and security profile

---

## Project Structure

```text
cloud-compiler/
├── .env.example                    # Environment variable configuration template
├── .gitignore                      # Git ignore rules
├── docker-compose.yml              # Production orchestration (Frontend + Backend)
├── README.md                       # Documentation
│
├── backend/
│   ├── Dockerfile                  # Multi-stage container with Node.js & Docker CLI
│   ├── package.json                # Dependencies and build scripts
│   ├── tsconfig.json               # TypeScript configuration
│   └── src/
│       ├── app.ts                  # Express application factory and middleware configuration
│       ├── server.ts               # HTTP & WebSocket server bootstrap
│       ├── controllers/
│       │   └── execute.controller.ts  # Endpoints: execute, batch, optimize, history, health
│       ├── executors/
│       │   ├── base.executor.ts       # Abstract executor with Docker lifecycle management
│       │   ├── executor.registry.ts   # Language-to-executor strategy mapping
│       │   ├── c.executor.ts          # C runner (gcc -O2)
│       │   ├── cpp.executor.ts        # C++ runner (g++ -O2 -std=c++17)
│       │   ├── java.executor.ts       # Java runner (javac & java -Xmx64m)
│       │   ├── javascript.executor.ts # Node.js runner (--max-old-space-size=64)
│       │   └── python.executor.ts     # Python runner (python3 -u)
│       ├── middleware/
│       │   ├── error.middleware.ts     # Global error handling and path sanitization
│       │   └── validation.middleware.ts # Payload and stdin boundary verification
│       ├── routes/
│       │   ├── api.routes.ts          # Root API routing (/api/health, /api/history)
│       │   └── execute.routes.ts      # Execution routing (/api/execute, /batch, /optimize)
│       ├── services/
│       │   ├── db.service.ts          # SQLite persistence layer (WAL mode)
│       │   ├── docker.service.ts      # Docker CLI process spawning and container control
│       │   ├── interactive.service.ts # WebSocket interactive streaming session engine
│       │   └── workspace.service.ts   # Ephemeral execution workspace isolation
│       ├── types/
│       │   └── execution.types.ts     # TypeScript data contracts and payload types
│       └── utils/
│           ├── config.ts              # Environment settings
│           └── logger.ts              # Structured console logger
│
├── docker/
│   ├── Dockerfile.sandbox          # Unified Alpine sandbox (GCC, OpenJDK, Python, Node)
│   ├── build-sandbox.ps1           # Windows PowerShell sandbox build script
│   └── build-sandbox.sh            # Linux/macOS Bash sandbox build script
│
└── frontend/
    ├── Dockerfile                  # Production multi-stage build (Vite -> Nginx)
    ├── nginx.conf                  # Nginx proxy routing /api and /ws to backend:5000
    ├── index.html                  # HTML entry point
    ├── package.json                # React 19 dependencies and scripts
    ├── vite.config.ts              # Vite configuration
    ├── public/
    │   └── favicon.svg             # Application favicon
    └── src/
        ├── App.tsx                 # Core application state, tabs, and layout
        ├── App.css                 # Comprehensive UI stylesheets and layouts
        ├── index.css               # GitHub Dark & Light CSS variables
        ├── main.tsx                # React DOM mount point
        ├── components/
        │   ├── BatchTestingPanel.tsx   # Multiple test cases runner with pass/fail diffing
        │   ├── CodeEditor.tsx          # Monaco Editor with integrated toolbar
        │   ├── Header.tsx              # Application header with status badges and theme toggle
        │   ├── HistoryDrawer.tsx       # Slide-out history drawer for past submissions
        │   ├── MetricsBar.tsx          # Execution status and performance metrics
        │   ├── OptimizationModal.tsx   # GCC benchmark charts (-O0 to -Os)
        │   ├── OutputPanel.tsx         # Tabbed stdout/stderr output viewer
        │   └── ProgramizOutputPanel.tsx # Interactive terminal with live stdin input
        ├── constants/
        │   └── languages.ts            # Language metadata and starter templates
        ├── services/
        │   ├── api.ts                  # REST API client
        │   └── interactive.ts          # WebSocket client for interactive sessions
        └── types/
            └── index.ts                # Frontend TypeScript type declarations
```

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (running with Linux containers enabled)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bajoriapranad/cloud-compiler.git
   cd cloud-compiler
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Build the sandbox container**:
   - On Windows (PowerShell):
     ```powershell
     .\docker\build-sandbox.ps1
     ```
   - On Linux / macOS:
     ```bash
     chmod +x ./docker/build-sandbox.sh
     ./docker/build-sandbox.sh
     ```

4. **Launch the services**:
   ```bash
   docker-compose up --build
   ```

5. Open your browser and navigate to:
   - Frontend: `http://localhost:3000` (mapped through Nginx)
   - Backend API: `http://localhost:5000/api/health`

---

## Manual / Local Development

### 1. Build Sandbox Image
Make sure Docker is running and build the execution runner image:
```bash
docker build -t cloud-compiler-sandbox -f docker/Dockerfile.sandbox .
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend dev server runs on `http://localhost:5173`.


