# **Concept Guide: The "Velocity Project" (Proprietary AI-Collab Tracker)**

**Status:** Active (Proprietary Meta-Project)

This document provides the definitive context for the **"Velocity Project"** and **"Velocity Tracker."**

This is **not** part of the WovenWebApp application. It is a proprietary, automated meta-system used by the architect (Dan Cross) to track, analyze, and forecast the development cadence of the AI-human collaborative workflow.

## **1\. Core Purpose**

The Velocity Project is an automated, empirical system to provide an auditable trail and concrete metrics for the "human-ai-collab-velocity."

Its primary role is to track metrics like:

* Commits per hour  
* Phase completion  
* Rolling averages  
* Automated forecasts

The system runs via GitHub Actions, generating automated reports every 12 hours. As of late 2025, it has successfully logged data such as **106 commits over 166 hours**, for an average of **0.64 commits/hour**.

## **2\. System Features**

The project is not just a single script but a collection of telemetry, analytics, and automation tools:

* **Telemetry Ingestion:** Scripts that log git history and other development events (e.g., to velocity-log.jsonl).  
* **Analytics & Artifacts:** Scripts that analyze the telemetry to generate markdown reports, JSON summaries, and forecasts.  
* **Automated CI:** Uses GitHub Actions to run the tracker and reports automatically.  
* **Signal-Tracking:** Part of a broader debugging and signal-tracking infrastructure that automates failure logging and helps guide AI-assisted fixes.  
* **Validation:** Includes methods for convergence detection and falsifiable validation.

## **3\. Current Role & Privacy**

* **Current Role:** The Velocity Tracker is set to continue its automated runs in the background, providing an auditable trail while development focus shifts to WovenWebApp.  
* **Privacy:** The system is currently private and proprietary. Before any part of this repository is made public, the git history must be audited for secrets.

## **4\. Strategic Future Plans**

The "Velocity Project" is a distinct asset with several potential futures, separate from WovenWebApp:

1. **Remain Internal:** Keep the system as a private, proprietary tool.  
2. **Productize (Standalone):** Extract the project into its own standalone repository, tentatively named **human-ai-collab-velocity**.  
3. **Hybrid:** Do both, releasing a public version while keeping the core telemetry private.

A key part of this future plan is to use the project's changelog to document the specific insights learned about AI-human collaboration.

The "team" is DH Cross (musician, poet, songwriter, writer, game designer, systems thiker and creator of Woven Web and cohort (Cascade/Jules/Codex/third-party assists)