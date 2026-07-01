import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import UploadPage from "@/pages/UploadPage";
import PlayerPage from "@/pages/PlayerPage";
import { Toaster } from "@/components/ui/sonner";

function AppRoutes() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  const handleStart = (data) => {
    setSession(data);
    navigate("/play");
  };

  const handleBack = () => {
    setSession(null);
    navigate("/");
  };

  return (
    <Routes>
      <Route path="/" element={<UploadPage onStart={handleStart} />} />
      <Route
        path="/play"
        element={
          session ? (
            <PlayerPage session={session} onBack={handleBack} />
          ) : (
            <UploadPage onStart={handleStart} />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRoutes />
        <Toaster theme="dark" position="top-center" />
      </BrowserRouter>
    </div>
  );
}

export default App;
