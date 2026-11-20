MD Learning Planner

A lightweight, zero-backend web app that turns structured Markdown roadmaps into an interactive daily study planner. Pre-loaded with a 24-Week AI Security Masterplan (plans/ai-security-24w.md).

Live Demo: https://urshail.github.io/ai-cs/ai-security-planner/

Features

Load Any .md Plan: Drag-and-drop or upload your own Markdown study roadmap.

Date Mapping & Rescheduling: Automatically maps tasks to calendar dates and shifts remaining tasks forward in one click.

Local & Private: Saves progress, notes, and clickable reference links in browser localStorage with JSON backup and .ics calendar export.

Run Locally

git clone https://github.com/urshail/ai-cs.git
cd ai-cs/ai-security-planner
python3 -m http.server 8000


Open http://localhost:8000 in your browser.

Markdown Format

To use your own plan, structure your .md file with ### Modules, #### Weeks, and a daily table:

# My Study Plan

### Module 1: Foundations

#### Week 1: Core Concepts
| Day | Time | Task | References |
| :--- | :--- | :--- | :--- |
| **Mon** | 30m | Read core docs and take notes | [Docs](https://example.com) |
| **Sat** | 2h | **Lab:** Build a local prototype | [Repo](https://github.com) |
