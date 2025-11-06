import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Layout from "./routes/Layout.jsx";
import App from "./App.jsx";
import RecipeDetail from "./routes/RecipeDetail.jsx"; // NEW

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<App />} />
        <Route path="recipe/:id" element={<RecipeDetail />} /> {/* NEW */}
      </Route>
    </Routes>
  </BrowserRouter>
);
