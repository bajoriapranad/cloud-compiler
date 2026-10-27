# Cloud Compiler

A modern, high-performance web-based code execution platform and cloud compiler. Run and test code in multiple programming languages safely inside isolated Docker sandbox containers with real-time interactive terminal support.

---

## Features

- **Multi-Language Support**:
  - Python 3.11
  - C (GCC 12)
  - C++ (G++ 12)
  - Java (OpenJDK 17)
  - JavaScript (Node.js 20)
- **Interactive Stdin / Terminal Execution**: Real-time bidirectional I/O streaming via WebSockets.
- **Batch Test Runner**: Run multiple test cases (inputs and expected outputs) with automated diffing and performance metrics.
- **AI Code Optimization**: Integrated analysis modal for code complexity, clean-up suggestions, and automated performance optimization.
- **Execution History**: Persistent local execution history backed by SQLite (`better-sqlite3`).
- **Resource Constraints & Sandbox Security**: Docker sandboxing enforcing memory boundaries, CPU limits, non-root users, and execution timeouts.
- **Developer-Centric UI**: Monaco code editor, theme options, responsive drawer for history, execution stats (compilation time, memory usage, runtime).

---

## Tech Stack

### Frontend
- **React 18** with **TypeScript**
- **Vite** build tooling
- **Monaco Editor** (`@monaco-editor/react`)
- **Lucide Icons**
- Responsive layout with custom CSS design tokens

### Backend
- **Node.js** & **Express** with **TypeScript**
- **Dockerode** for container lifecycle management
- **WebSocket (`ws`)** for interactive I/O streaming
- **SQLite** via `better-sqlite3` for fast local persistence
- **Zod** schema validation

### Sandbox & Infrastructure
- **Docker & Docker Compose**
- Custom multi-runtime sandbox container (`Dockerfile.sandbox`)
- Container resource limits (memory, CPU throttling, read-only workspaces)

---

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose installed and running
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
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

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

---

## License

MIT
