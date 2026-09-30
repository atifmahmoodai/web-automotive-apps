# Car Rental Web & Mobile Platform

Demo of a customer booking flow with fleet schedule and reservation tracking.

This is an offline, browser-based working demo. It includes fictional starter records, add/edit/delete, status and text filters, summary cards, and CSV export. Data stays in this browser's local storage. No accounts, cloud sync, external messages, payment processing or third-party connections are configured.

## Run

Open `index.html` in a recent browser, or serve this folder with `python -m http.server 8000` and open `http://localhost:8000`. No package installation is required.

## Project-specific workflow

Record **Customer**, vehicle, and pickup location; update the workflow status and due/activity date; track **booking total**; then export the current records as CSV. The sample amounts and records are fictional and intended for demonstration.
