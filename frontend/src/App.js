import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import UploadPage from "@/pages/UploadPage";
import PlayerPage from "@/pages/PlayerPage";
import { Toaster } from "@/components/ui/sonner";

function AppRoutes() {
  // Hoisted so navigating away from Player doesn't clear it.
  // Only a full page reload clears these.
  const [formState, setFormState] = useState({
    artist: "",
    song: "",
    audio: null,
    art: null,
    lrc: null,
  });
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  const handleStart = (data, savedForm) => {
    setSession(data);
    if (savedForm) setFormState(savedForm);
    navigate("/play");
  };

  const handleBack = () => {
    // Preserve session + form; just navigate back to /
    navigate("/");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <UploadPage onStart={handleStart} initialForm={formState} />
        }
      />
      <Route
        path="/play"
        element={
          session ? (
            <PlayerPage session={session} onBack={handleBack} />
          ) : (
            <UploadPage onStart={handleStart} initialForm={formState} />
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
