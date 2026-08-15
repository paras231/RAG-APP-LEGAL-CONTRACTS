import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import ChatApp from "./pages/ChatApp.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<ChatApp />} />
      <Route path="/app/:chatId" element={<ChatApp />} />
    </Routes>
  );
}
