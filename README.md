# BioGuard Tracker

An environmental monitoring application designed to track and report sightings of the invasive *Parthenium hysterophorus* (Carrot Grass) plant.

![BioGuard Tracker Dashboard](public/images/parthenium.png)

## Features
- **Interactive Dashboard:** View real-time statistics and heatmaps.
- **Reporting System:** Submit sightings with location data.
- **Admin Panel:** Manage and verify reports.
- **Fresh UI:** Modern, eco-friendly design with Tailwind CSS.

## Tech Stack
- **Frontend:** HTML5, Tailwind CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Production), SQLite (Local Dev)

## Local Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/abhijeet06-sharma/Parthenium_Tracker.git
    cd Parthenium_Tracker
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the server:
    ```bash
    npm start
    ```

4.  Open `http://localhost:3000` in your browser.

## Deployment

You can deploy this application securely to Render with one click:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/abhijeet06-sharma/Parthenium_Tracker)

**Note:** On Render's free tier, the SQLite database file will be reset on every deployment. For persistent data, consider using a managed database service like Render PostgreSQL or Turso.

## Cloud Configuration (Optional)

### Persistent Images (Cloudinary)
By default, uploaded images are stored locally and will be lost on Render restarts. To enable persistent storage:
1.  Create a free account at [Cloudinary](https://cloudinary.com/).
2.  Get your `Cloud Name`, `API Key`, and `API Secret` from the dashboard.
3.  In Render Dashboard, go to **Environment** settings.
4.  Add the following environment variables:
    - `CLOUDINARY_CLOUD_NAME`
    - `CLOUDINARY_API_KEY`
    - `CLOUDINARY_API_SECRET`
5.  Redeploy. The app will automatically switch to Cloudinary storage.