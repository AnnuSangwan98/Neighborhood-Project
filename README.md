# NeighborhoodFit - Lifestyle Based Neighborhood Matching App 🏡✨
A full-stack web app that helps users match their lifestyle preferences (like access to parks, cafes, safety, transport, etc.) with the best-suited neighborhood using real-time data and a scoring algorithm.

🚀 Built with React (frontend) + Node.js/Express (backend) + Overpass API & CrimeScore API.

## ✨ Features
- 🔍 Search neighborhoods by location (lat/lon/city)
- 🏆 Calculates a "Neighborhood Score" out of 100
- 🌳 Analyzes Parks, Cafes, Gyms, Transport access
- 🛡️ Crime and Safety Index shown
- 📊 Breakdown of all scores and densities
- ⚙️ Fully integrated backend APIs (Overpass + mock crime API fallback)


## 🔧 Tech Stack
- **Frontend**: React.js
- **Backend**: Node.js + Express.js
- **APIs**:
  - OpenStreetMap Overpass API (real neighborhood data)
  - CrimeScore API (fallback to mock if needed)
- **Styling**: Tailwind CSS / Custom CSS


## 🚀 Getting Started (Local Setup)

### 1. Clone the Repo
```bash
git clone https://github.com/AnnuSangwan98/Neighborhood-Project.git

```
### 2. Install Backend Dependencies
```bash
cd backend
npm install
```
### 3. Run Backend
```bash
node index.js
# Server runs on http://localhost:8080
```
### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
```
### 5. npm start
```bash
npm start
# Opens on http://localhost:3000
```

---

📍**Project Structure**
```md
## 📁 Project Structure
Neighborhood-Project/
├── backend/
│ └── index.js # Express server & APIs
├── frontend/
│ └── src/ # React components
├── README.md

```
## 🧠 Matching Algorithm
Neighborhood Score = Weighted sum of:
- Parks Density
- Cafes Density
- Gym Access
- Public Transport
- Crime & Safety Index

Weights are customizable and displayed in UI.

## 🖼️ Screenshots

### 🔍 Neighborhood Analysis Result
![Score Screenshot]
















