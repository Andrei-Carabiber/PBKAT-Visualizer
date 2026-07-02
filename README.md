# PBKAT Web Interface & Visualizer

A full-stack web application that provides a graphical interface for **PBKAT** (Probabilistic BellKAT), a formal tool for modeling and evaluating quantum network protocols.

## 🌌 About The Project

[PBKAT](https://github.com/Software-and-Systems-Architecture/probabilistic-bellkat) is a powerful Haskell-based CLI tool used to analyze quantum repeater networks, compute entanglement probabilities, and model operations like entanglement generation, swapping, and distillation.

However, writing protocols directly in the Haskell DSL requires familiarity with the specific syntax and executing CLI commands manually.

**This project solves that by providing:**
1. A visual interface to design quantum network topologies and define protocols.
2. A customized backend compiler that translates standard JSON protocol payloads directly into executable PBKAT Haskell DSL.
3. Automated execution and visualization of the resulting probabilistic data.

## 🏗️ Architecture

* **Frontend (`/frontend`):** A **React** application where users can visualize node topologies (e.g., $A-B-C-D-E$) and construct quantum routing protocols using a clean UI.
* **Backend (`/backend`):** A **Python FastAPI** server. It acts as a compiler and orchestrator. It receives the JSON payload, parses it, dynamically generates the equivalent `.hs` (Haskell) file using the PBKAT DSL (e.g., mapping theoretical $sw \langle A \sim B @ C \rangle$ to `swap "C" ("A", "B")`), and spawns child processes to run the `cabal` commands.
* **Core Engine:** The original Haskell-based PBKAT library, which performs the heavy mathematical computations and outputs the probabilistic state space.

## ✨ Features

- **Visual Network Builder:** Define nodes, connections, and hardware capabilities (success probabilities for creation, swapping, etc.).
- **Automated Execution:** The backend automatically handles the generation of `Worker.hs` files, executes `cabal run probPROTO -- --json run`, and captures the output.
- **Result Visualization:** (Work in Progress) Parses the resulting JSON from PBKAT to display the probability of reaching the target entangled state.