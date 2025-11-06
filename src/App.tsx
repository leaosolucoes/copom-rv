import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const App = () => {
  console.log('✅ App carregado com sucesso');
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
