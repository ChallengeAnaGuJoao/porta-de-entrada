import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Teste } from './page/teste';

function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route index element={<Teste />}/>
          <Route path="/teste" element={<Teste />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
