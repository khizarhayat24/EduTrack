import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Nav from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import TopperHub from "./pages/TopperHub";
import TopperProfile from "./pages/TopperProfile";
import ResourceDetail from "./pages/ResourceDetail";
import UploadResource from "./pages/UploadResource";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 font-sans antialiased">
          <Nav />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hub" element={<TopperHub />} />
            <Route path="/toppers/:id" element={<TopperProfile />} />
            <Route path="/resources/:id" element={<ResourceDetail />} />
            <Route path="/upload" element={<UploadResource />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
