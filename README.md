# 🚇 Baku Metro Navigator

[![GitHub license](https://img.shields.io/github/license/ehmedlicelal/metro-map?style=for-the-badge)](https://github.com/ehmedlicelal/metro-map/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/ehmedlicelal/metro-map?style=for-the-badge)](https://github.com/ehmedlicelal/metro-map/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

A modern, high-precision navigation system tailored for the Baku Metro network. This application provides seamless routing between any two points in Baku, optimizing for the best walking paths and metro connections.

---

## ✨ Key Features

- **📍 Dual-Search Interface**: Search for any location in Baku as both origin and destination.
- **🛰️ Smart Geolocation**: Real-time GPS tracking with high-precision filtering to ensure your starting point is always accurate.
- **🗺️ Interactive Map**: Powered by Leaflet with high-resolution tiles and custom scaling for maximum readability.
- **🗣️ Multi-language Support**: Fully localized in **Azerbaijani**, **English**, **Russian**, and 10+ other languages.
- **🚶‍♂️ Pedestrian Routing**: Advanced exit-specific instructions for metro stations (e.g., exact exit directions for Nizami station).
- **🛤️ Path Comparison**: Dynamic calculation and comparison between walking and metro routes to save you time.
- **⚡ Modern UX**: Premium glassmorphic design, smooth micro-animations, and a dedicated metro-themed loading experience.
- **📖 API Documentation**: Built-in Swagger UI for developers to explore and test the backend endpoints.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Mapping**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Styling**: Vanilla CSS (Custom Glassmorphic Design)
- **Localization**: Custom i18n implementation

### Backend (Server)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express 5](https://expressjs.com/)
- **Documentation**: [Swagger UI](https://swagger.io/tools/swagger-ui/)
- **Data**: CSV & JSON-based spatial data processing

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ehmedlicelal/metro-map.git
   cd metro-map
   ```

2. **Setup the Backend:**
   ```bash
   cd server
   npm install
   npm start
   ```
   The server will run on `http://localhost:3001` (by default).
   Access Swagger docs at `http://localhost:3001/api-docs`.

3. **Setup the Frontend:**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## 📊 Data & Architecture

The project utilizes open-source data for metro pathways and locations:
- `pathways.csv`: Detailed coordinates for all Baku Metro station exits and entrances.
- `locs.json`: Curated points of interest in Baku for quick searching.

The system calculates routes using a hybrid approach, combining metro line data with OpenStreetMap-based pedestrian routing.

---

## 📸 Screenshots

*(Add screenshots here to showcase the stunning UI!)*

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⚖️ License

Distributed under the ISC License. See `LICENSE` for more information.

---

<p align="center">Made with ❤️ for Baku</p>
