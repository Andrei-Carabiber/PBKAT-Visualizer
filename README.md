
# QBKAT Visualizer

[QBKAT](https://github.com/swystems/prob-bellkat) is a tool for analyzing the behavior of quantum network protocols. It captures both **probabilistic behavior** arising from quantum mechanics and **non-deterministic behavior** arising from resource contention.

**QBKAT Visualizer** provides a web-based interface for working with QBKAT. It allows you to write QBKAT protocols, visually construct quantum networks, configure their parameters, and execute the resulting simulations.

**Live application:** [qbkat.swys.site](https://qbkat.swys.site/)


##  Table of Contents
- [Overview](#-overview)
-  [Features](#-features) 
- [Architecture](#-architecture) 
 - [Tech Stack](#-tech-stack) 
 - [Prerequisites](#-prerequisites) 
 - [Getting Started](#-getting-started) 
 - [Using the Visualizer](#-using-the-visualizer) 
 - [Project Structure](#-project-structure) 
 - [Environment Variables](#-environment-variables)
 - [Deployment](#-deployment) 
 - [Troubleshooting](#-troubleshooting) 
 - [Documentation](#-documentation) 

##  Overview

QBKAT Visualizer provides three main components:

1.  **Haskell Protocol Editor** — Write QBKAT protocols directly in the browser using a Monaco-based editor with Haskell language-server support.
    
2.  **Quantum Network Editor** — Visually construct a quantum network using nodes and connections and configure network constraints and probabilities.
    
3.  **QBKAT Runner** — Execute the configured protocol and network using the QBKAT engine and view the resulting analysis.
    

##  Features

### Live Haskell Code Editor

The application includes a [Monaco Editor](https://microsoft.github.io/monaco-editor/), the code editor that powers Visual Studio Code.

The editor is integrated with a Haskell language server and provides:

-   Syntax highlighting
    
-   Real-time diagnostics
    
-   Error reporting
    
-   Autocompletion
    
-   Language-server features
    

This allows QBKAT protocols to be written and validated directly in the browser.

###  Quantum Network Editor

The network editor uses [React Flow](https://reactflow.dev/) to provide an interactive node-based interface.

It allows you to:

-   Create and remove nodes
    
-   Connect nodes with links
    
-   Configure network parameters
    
-   Specify constraints
    
-   Define probabilities
    
-   Visually inspect the network topology
    

The resulting network configuration is sent to the backend when a QBKAT execution is started.

###  QBKAT Runner

After defining a protocol and configuring a quantum network, you can execute the analysis using the QBKAT engine.

The backend handles the execution and returns the results to the frontend for visualization.

### Dockerized Environment

The backend uses [Docker](https://www.docker.com/) to provide a reproducible environment for running QBKAT and its required dependencies.

## Architecture

The application consists of four main parts:

**Frontend**: React │ Monaco Editor │ React Flow

**Backend**: Node.js | Express

**JobQueue & Caching**: BullMQ | Redis

**QBKAT Engine**: prob-bellkat


### Frontend

The frontend is responsible for:

-   Rendering the user interface
    
-   Providing the Haskell editor
    
-   Providing the quantum network editor
    
-   Managing protocol and network configuration
    
-   Communicating with the backend
    
-   Displaying execution results
    

### Backend

The backend is responsible for:

-   Receiving requests from the frontend
    
-   Managing QBKAT executions
    
-   Creating jobs
    
-   Processing queued jobs
    
-   Starting QBKAT processes
    
-   Returning execution results
    
-   Managing communication with the frontend
    

### Redis + BullMQ

[Redis](https://redis.io/) provides the data store used by [BullMQ](https://docs.bullmq.io/).

BullMQ manages QBKAT execution jobs so that expensive processes can be handled asynchronously and concurrently.

### QBKAT Engine

The actual protocol analysis is performed by [QBKAT](https://github.com/swystems/prob-bellkat).

The QBKAT repository is included in this project as a Git submodule.


## Tech Stack


| Category   | Technology | Purpose |
| :--------- | :--------: | :------ |
| Frontend   | [React](https://react.dev/)   | Builds the user interface     |
| Frontend | [Tailwind CSS](https://tailwindcss.com/)   | Provides styling    |
|   Code Editor |  [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Enables in-browser Haskell code editing|
|Node Editor | [React Flow](https://reactflow.dev/)| Provides interactive quantum network visualization
| Backend |[Node.js](https://nodejs.org/)  | Runs the backend services
| API Server | [Express](https://expressjs.com/)  | Provides the backend HTTP API 
| Job Queue| [BullMQ](https://docs.bullmq.io/) | Manages asynchronous QBKAT execution jobs
| Queue & Caching | [Redis](https://redis.io/) |Stores BullMQ queues, job data and caches
| QBKAT Engine| [QBKAT](https://github.com/swystems/prob-bellkat) | Performs quantum network protocol analysis
|Containers | [Docker](https://www.docker.com/) | Provides a reproducible runtime environment
| CI/CD |  [GitHub Actions](https://github.com/features/actions) | Automates builds and deployment


##  Prerequisites

Before running the project locally, make sure you have the following installed:

-   [Git](https://git-scm.com/)
    
-   [Node.js](https://nodejs.org/)
    
-   npm
    
-   [Docker](https://www.docker.com/)
    
-   Docker Compose
    
-   GNU Make
    
-   Redis
    

> **Note:** If Redis is started through your Docker environment, you do not need a separate local Redis installation.


##  Getting Started

### Local Production
If you just want a local running instance without development abilities, download the [docker compose](https://github.com/Andrei-Carabiber/PBKAT-Visualizer/blob/dbc3212fa45ddb6e85fa1ff9d73886d661cb1c20/compose.yml.prod) in a folder and open a terminal in that folder. 
```bash
docker compose pull 
docker compose up -d
```
 The server will start in 1-2 minutes and will be available at 
```text
http://localhost:3000
```
 If you also want development environment then follow the next steps.

### Development

### 1. Clone the Repository

The QBKAT engine is included as a Git submodule, so the repository should be cloned recursively:

```bash
git clone --recurse-submodules https://github.com/Andrei-Carabiber/PBKAT-Visualizer.git
cd PBKAT-Visualizer
```

If you have already cloned the repository without its submodules, run:

```bash
git submodule update --init --recursive
```

----------

### 2. Start the Frontend

Open a terminal and navigate to the frontend:

```bash
cd frontend
npm install
npm run dev
```

The development server will display the local URL in the terminal, usually:

```text
http://localhost:3000
```

Keep this terminal running.

----------

### 3. Start the Backend

Open a **second terminal** from the project root.

Navigate to the backend:

```bash
cd prob-bellkat-with-server/editor-webserver
```

Install the backend dependencies:

```bash
npm install
```

Return to the backend project root:

```bash
cd ..
```

Start the development web server:

```bash
make dev-webserver
```

> **Important:** Docker and Redis must be available before starting the backend.

### Windows

The Makefile uses `$(PWD)` when mounting the project directory into Docker.

On some Windows environments, you may need to replace:

```makefile
$(PWD)
```

with:

```makefile
$(CURDIR)
```

## Using the Visualizer

Once both the frontend and backend are running:

### 1. Open the application

Open the local frontend URL shown by the development server.

### 2. Write a QBKAT protocol

Use the Haskell editor to write your QBKAT protocol.

You can use some of the included tutorials to understand how to write the protocol.

The editor provides language-server functionality such as:

-   Autocompletion
    
-   Diagnostics
    
-   Syntax highlighting
    
-   Error reporting
    

### 3. Create the quantum network

Use the network editor to visually construct the network.

Add the required nodes and connections and configure their parameters.

### 4. Run the analysis

Start a QBKAT execution from the interface.

The frontend sends the protocol and network configuration to the backend. The backend then creates an execution job and processes it using the QBKAT engine.

### 5. View the results

After the QBKAT execution finishes, if the protocol was written correctly,  the results are returned to the frontend and displayed in the visualizer.


##  Project Structure

```text
PBKAT-Visualizer/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── ...
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── prob-bellkat-with-server/
│   ├── editor-webserver/
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   │
│   ├── Makefile
|   ├── Dockerfile
│   └── ...
│
│
├── Dockerfile
├── .compose.yml.prod
├── .gitmodules
└── README.md

```

### `frontend/`

Contains the React application.

This includes:

-   User interface
    
-   Haskell editor
    
-   Quantum network editor
    
-   QBKAT configuration
    
-   Result visualization
    
-   Frontend/backend communication
    

### `prob-bellkat-with-server/`

Contains the backend environment and QBKAT server integration.

### `prob-bellkat-with-server/editor-webserver/`

Contains the Node.js/Express web server.

### `.gitmodules`

Defines the QBKAT repository used as a Git submodule.


## Environment Variables

The application currently does **not require environment variables** for local development. The only variables needed are included in the Makefile.

##  Deployment

The production application is available at:

**[qbkat.swys.site](https://qbkat.swys.site/)**

The project uses Docker and GitHub Actions as part of its deployment infrastructure.

##  Troubleshooting

### Haskell Autocomplete And Linter Are Not Working

Check that:

1.  The backend is running.
    
2.  The Frontend connected to backend via web-socket.
    
 3. Some time has passed after start (2-3 minutes) so that the Haskell Language Server can start    
        

### Docker Cannot Mount the Project Directory

If you are using Windows, check whether the Makefile uses:

```makefile
$(PWD)
```

If necessary, replace it with:

```makefile
$(CURDIR)
```
### Redis Connection Errors

Make sure Redis is running and accessible.

You can test a local Redis instance with:

```bash
redis-cli ping
```

A working Redis instance should return:

```text
PONG
```

### QBKAT Execution Fails

If the application starts correctly but QBKAT executions fail, check:

-   The Docker backend is running
    
-   Redis is running.
    
-   The QBKAT protocol was written correctly.
        
-   Backend logs for process or permission errors.
    

## Documentation

### QBKAT

The underlying QBKAT project is available at:

[github.com/swystems/prob-bellkat](https://github.com/swystems/prob-bellkat)

### QBKAT Visualizer

Production application:

[https://qbkat.swys.site/](https://qbkat.swys.site/)
